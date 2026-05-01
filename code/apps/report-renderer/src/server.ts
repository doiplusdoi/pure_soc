import { createServer } from "node:http";

import { renderReport, type ReportRendererInput } from "./index";

const port = Number(process.env.PORT ?? 3002);
const maxBodyBytes = 1_048_576;

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/health") {
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        service: "puresoc-report-renderer",
        status: "ok"
      })
    );
    return;
  }

  if (request.method !== "POST" || url.pathname !== "/render") {
    response.statusCode = 404;
    response.end("not found");
    return;
  }

  try {
    const body = await readJsonBody(request);
    const rendered = renderReport(parseRenderInput(body));

    response.setHeader("content-type", rendered.mimeType);
    response.setHeader("x-puresoc-renderer", rendered.renderer);
    response.setHeader("x-puresoc-content-sha256", rendered.contentHashSha256);
    response.end(Buffer.from(rendered.body));
  } catch (error) {
    response.statusCode = 400;
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error)
      })
    );
  }
});

server.listen(port, () => {
  console.log(
    JSON.stringify({
      service: "puresoc-report-renderer",
      status: "listening",
      port
    })
  );
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

const readJsonBody = async (request: NodeJS.ReadableStream): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBodyBytes) {
      throw new Error("render request body is too large");
    }

    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
};

const parseRenderInput = (value: unknown): ReportRendererInput => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("render request must be an object");
  }

  const record = value as Record<string, unknown>;
  if (record.format !== "json" && record.format !== "pdf") {
    throw new Error("render format must be json or pdf");
  }

  if (!record.reportData || typeof record.reportData !== "object" || Array.isArray(record.reportData)) {
    throw new Error("reportData must be an object");
  }

  return {
    format: record.format,
    reportData: record.reportData as Record<string, unknown>,
    renderedAt: typeof record.renderedAt === "string" ? record.renderedAt : undefined
  };
};
