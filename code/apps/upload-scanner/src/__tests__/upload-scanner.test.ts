import { createHash } from "node:crypto";
import { createServer as createTcpServer, type AddressInfo, type Server as TcpServer } from "node:net";

import { describe, expect, it } from "vitest";

import { createUploadScannerServer, eicarSignature } from "../index";

describe("upload scanner service", () => {
  it("returns clean for ordinary payloads and infected for EICAR test content", async () => {
    const server = createUploadScannerServer({
      now: () => new Date("2026-06-20T00:00:00.000Z")
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    try {
      const clean = await scan(baseUrl, Buffer.from("normal evidence", "utf8"));
      expect(clean).toMatchObject({
        status: "clean",
        scannerName: "puresoc-basic-upload-scanner",
        scannedAt: "2026-06-20T00:00:00.000Z",
        findings: []
      });

      const infected = await scan(baseUrl, Buffer.from(eicarSignature, "utf8"));
      expect(infected).toMatchObject({
        status: "infected",
        findings: ["eicar_test_signature"]
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("fails closed when payload integrity checks do not match", async () => {
    const server = createUploadScannerServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    try {
      const response = await fetch(`${baseUrl}/scan`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sizeBytes: 999,
          contentHashSha256: "wrong",
          bodyBase64: Buffer.from("normal evidence", "utf8").toString("base64")
        })
      });

      await expect(response.json()).resolves.toMatchObject({
        status: "failed",
        findings: ["scanner_size_mismatch"]
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("reports ClamAV health through the HTTP adapter", async () => {
    const clamd = await createFakeClamAvServer("stream: OK\0");
    const server = createUploadScannerServer({
      engine: "clamav",
      clamav: {
        host: "127.0.0.1",
        port: clamd.port,
        timeoutMs: 1000
      }
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    try {
      const response = await fetch(`${baseUrl}/health`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        service: "puresoc-upload-scanner",
        status: "ok",
        scannerName: "puresoc-clamav-upload-scanner",
        engine: "clamav",
        signatureSource: "freshclam",
        clamd: "ready"
      });
    } finally {
      await closeHttpServer(server);
      await closeTcpServer(clamd.server);
    }
  });

  it("maps ClamAV INSTREAM findings into scan results", async () => {
    const clamd = await createFakeClamAvServer("stream: Eicar-Test-Signature FOUND\0");
    const server = createUploadScannerServer({
      engine: "clamav",
      now: () => new Date("2026-06-20T00:00:00.000Z"),
      clamav: {
        host: "127.0.0.1",
        port: clamd.port,
        timeoutMs: 1000
      }
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    try {
      const infected = await scan(baseUrl, Buffer.from("normal evidence", "utf8"));

      expect(infected).toMatchObject({
        status: "infected",
        scannerName: "puresoc-clamav-upload-scanner",
        scannedAt: "2026-06-20T00:00:00.000Z",
        findings: ["eicar-test-signature"]
      });
    } finally {
      await closeHttpServer(server);
      await closeTcpServer(clamd.server);
    }
  });
});

const scan = async (baseUrl: string, body: Buffer) => {
  const response = await fetch(`${baseUrl}/scan`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      organizationId: "org_1",
      objectKey: "evidence.txt",
      mimeType: "text/plain",
      sizeBytes: body.byteLength,
      contentHashSha256: sha256Hex(body),
      bodyBase64: body.toString("base64")
    })
  });

  return response.json();
};

const sha256Hex = (body: Uint8Array): string => createHash("sha256").update(body).digest("hex");

const createFakeClamAvServer = async (scanResponse: string): Promise<{ server: TcpServer; port: number }> => {
  const server = createTcpServer((socket) => {
    let buffer = Buffer.alloc(0);
    let command: string | null = null;

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, Buffer.from(chunk)]);

      if (!command) {
        const commandTerminator = buffer.indexOf(0);
        if (commandTerminator === -1) {
          return;
        }

        command = buffer.subarray(0, commandTerminator).toString("utf8");
        buffer = buffer.subarray(commandTerminator + 1);

        if (command === "zPING") {
          socket.end("PONG\0");
          return;
        }
      }

      if (command !== "zINSTREAM") {
        socket.end("UNKNOWN COMMAND\0");
        return;
      }

      while (buffer.byteLength >= 4) {
        const chunkLength = buffer.readUInt32BE(0);
        if (chunkLength === 0) {
          socket.end(scanResponse);
          return;
        }

        if (buffer.byteLength < 4 + chunkLength) {
          return;
        }

        buffer = buffer.subarray(4 + chunkLength);
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  return {
    server,
    port: (server.address() as AddressInfo).port
  };
};

const closeHttpServer = async (server: ReturnType<typeof createUploadScannerServer>) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

const closeTcpServer = async (server: TcpServer) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
