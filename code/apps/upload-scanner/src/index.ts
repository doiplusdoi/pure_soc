import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createConnection, type Socket } from "node:net";

type ScanStatus = "clean" | "infected" | "failed";
export type UploadScannerEngine = "basic" | "clamav";

interface ScanResponse {
  status: ScanStatus;
  scannerName: string;
  scannedAt: string;
  findings: string[];
}

interface ScanRequestBody {
  organizationId?: string;
  objectKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  contentHashSha256?: string;
  bodyBase64?: string;
}

export interface UploadScannerServerOptions {
  engine?: UploadScannerEngine;
  scannerName?: string;
  maxBodyBytes?: number;
  now?: () => Date;
  clamav?: ClamAvOptions;
}

export interface ClamAvOptions {
  host?: string;
  port?: number;
  timeoutMs?: number;
  maxChunkBytes?: number;
}

const defaultMaxBodyBytes = 10 * 1024 * 1024;
const defaultClamAvPort = 3310;
const defaultClamAvTimeoutMs = 10_000;
const defaultClamAvChunkBytes = 64 * 1024;
const eicarSignature = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!";

export const createUploadScannerServer = (options: UploadScannerServerOptions = {}) => {
  const engine = options.engine ?? "basic";
  const scannerName = options.scannerName ?? (engine === "clamav" ? "puresoc-clamav-upload-scanner" : "puresoc-basic-upload-scanner");
  const maxBodyBytes = options.maxBodyBytes ?? defaultMaxBodyBytes;
  const now = options.now ?? (() => new Date());
  const clamav = normalizeClamAvOptions(options.clamav);

  return createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      if (engine === "clamav") {
        const result = await pingClamAv(clamav);
        sendJson(response, result.ok ? 200 : 503, {
          service: "puresoc-upload-scanner",
          status: result.ok ? "ok" : "unavailable",
          scannerName,
          engine,
          signatureSource: "freshclam",
          clamd: result.ok ? "ready" : result.reason
        });
        return;
      }

      sendJson(response, 200, {
        service: "puresoc-upload-scanner",
        status: "ok",
        scannerName,
        engine
      });
      return;
    }

    if (request.method !== "POST" || request.url !== "/scan") {
      sendJson(response, 404, scanResponse("failed", scannerName, now, ["scanner_route_not_found"]));
      return;
    }

    try {
      const rawBody = await readRequestBody(request, maxBodyBytes);
      const parsed = JSON.parse(rawBody.toString("utf8")) as ScanRequestBody;
      const body = decodeBody(parsed.bodyBase64);

      if (typeof parsed.sizeBytes === "number" && parsed.sizeBytes !== body.byteLength) {
        sendJson(response, 200, scanResponse("failed", scannerName, now, ["scanner_size_mismatch"]));
        return;
      }

      if (parsed.contentHashSha256 && parsed.contentHashSha256 !== sha256Hex(body)) {
        sendJson(response, 200, scanResponse("failed", scannerName, now, ["scanner_hash_mismatch"]));
        return;
      }

      if (engine === "clamav") {
        const scan = await scanWithClamAv(body, clamav);
        sendJson(response, 200, scanResponse(scan.status, scannerName, now, scan.findings));
        return;
      }

      if (body.toString("utf8").includes(eicarSignature)) {
        sendJson(response, 200, scanResponse("infected", scannerName, now, ["eicar_test_signature"]));
        return;
      }

      sendJson(response, 200, scanResponse("clean", scannerName, now, []));
    } catch (error) {
      const finding = error instanceof Error && error.message === "request_too_large"
        ? "scanner_payload_too_large"
        : "scanner_invalid_payload";
      sendJson(response, 200, scanResponse("failed", scannerName, now, [finding]));
    }
  });
};

const normalizeClamAvOptions = (options: ClamAvOptions = {}): Required<ClamAvOptions> => ({
  host: options.host ?? "127.0.0.1",
  port: normalizePositiveInteger(options.port, defaultClamAvPort),
  timeoutMs: normalizePositiveInteger(options.timeoutMs, defaultClamAvTimeoutMs),
  maxChunkBytes: normalizePositiveInteger(options.maxChunkBytes, defaultClamAvChunkBytes)
});

const normalizePositiveInteger = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isSafeInteger(value) && value > 0 ? value : fallback;

const readRequestBody = async (request: IncomingMessage, maxBodyBytes: number): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > maxBodyBytes) {
      throw new Error("request_too_large");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
};

const decodeBody = (bodyBase64: unknown): Buffer => {
  if (typeof bodyBase64 !== "string" || bodyBase64.length === 0) {
    throw new Error("missing_body");
  }

  return Buffer.from(bodyBase64, "base64");
};

const pingClamAv = async (options: Required<ClamAvOptions>): Promise<{ ok: true } | { ok: false; reason: string }> => {
  try {
    const response = await sendClamAvCommand(options, async (socket) => {
      await writeSocket(socket, Buffer.from("zPING\0", "utf8"));
    });

    return response === "PONG" ? { ok: true } : { ok: false, reason: "clamd_unexpected_response" };
  } catch (error) {
    return { ok: false, reason: clamAvFailureReason(error) };
  }
};

const scanWithClamAv = async (
  body: Buffer,
  options: Required<ClamAvOptions>
): Promise<{ status: ScanStatus; findings: string[] }> => {
  try {
    const response = await sendClamAvCommand(options, async (socket) => {
      await writeSocket(socket, Buffer.from("zINSTREAM\0", "utf8"));

      for (let offset = 0; offset < body.byteLength; offset += options.maxChunkBytes) {
        const chunk = body.subarray(offset, Math.min(offset + options.maxChunkBytes, body.byteLength));
        const lengthPrefix = Buffer.alloc(4);
        lengthPrefix.writeUInt32BE(chunk.byteLength, 0);
        await writeSocket(socket, lengthPrefix);
        await writeSocket(socket, chunk);
      }

      await writeSocket(socket, Buffer.alloc(4));
    });

    return parseClamAvScanResponse(response);
  } catch (error) {
    return {
      status: "failed",
      findings: [clamAvFailureReason(error)]
    };
  }
};

const sendClamAvCommand = async (
  options: Required<ClamAvOptions>,
  writeCommand: (socket: Socket) => Promise<void>
): Promise<string> =>
  new Promise((resolve, reject) => {
    const socket = createConnection({
      host: options.host,
      port: options.port
    });
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(Buffer.concat(chunks).toString("utf8").replaceAll("\0", "").trim());
    };

    const fail = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(options.timeoutMs, () => fail(new Error("clamd_timeout")));
    socket.on("data", (chunk) => {
      const buffer = Buffer.from(chunk);
      chunks.push(buffer);

      if (buffer.includes(0)) {
        finish();
      }
    });
    socket.once("end", finish);
    socket.once("close", finish);
    socket.once("error", (error) => fail(error));
    socket.once("connect", () => {
      void writeCommand(socket).catch((error: unknown) => {
        fail(error instanceof Error ? error : new Error("clamd_write_failed"));
      });
    });
  });

const writeSocket = async (socket: Socket, body: Buffer): Promise<void> =>
  new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      socket.off("error", onError);
      reject(error);
    };

    socket.once("error", onError);
    socket.write(body, () => {
      socket.off("error", onError);
      resolve();
    });
  });

const parseClamAvScanResponse = (response: string): { status: ScanStatus; findings: string[] } => {
  if (!response) {
    return { status: "failed", findings: ["clamav_empty_response"] };
  }

  if (response.endsWith(" OK")) {
    return { status: "clean", findings: [] };
  }

  const found = response.match(/:\s*(.+)\s+FOUND$/) ?? response.match(/^(.+)\s+FOUND$/);
  if (found?.[1]) {
    return {
      status: "infected",
      findings: [normalizeClamAvFinding(found[1])]
    };
  }

  return {
    status: "failed",
    findings: [response.includes("ERROR") ? "clamav_scan_error" : "clamav_unexpected_response"]
  };
};

const normalizeClamAvFinding = (finding: string): string => {
  const normalized = finding
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

  return normalized || "clamav_signature_found";
};

const clamAvFailureReason = (error: unknown): string => {
  if (error instanceof Error && error.message === "clamd_timeout") {
    return "clamav_timeout";
  }

  return "clamav_unavailable";
};

const scanResponse = (
  status: ScanStatus,
  scannerName: string,
  now: () => Date,
  findings: string[]
): ScanResponse => ({
  status,
  scannerName,
  scannedAt: now().toISOString(),
  findings
});

const sendJson = (response: ServerResponse, statusCode: number, body: unknown) => {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
};

const sha256Hex = (body: Uint8Array): string => createHash("sha256").update(body).digest("hex");

export { eicarSignature };
