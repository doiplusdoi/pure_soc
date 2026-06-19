import { createUploadScannerServer, type UploadScannerEngine } from "./index";

const port = Number(process.env.PORT ?? 3310);
const maxBodyBytes = Number(process.env.PURESOC_UPLOAD_SCANNER_MAX_BODY_BYTES ?? 10 * 1024 * 1024);
const engine = readScannerEngine(process.env.PURESOC_UPLOAD_SCANNER_ENGINE);
const clamAvPort = Number(process.env.PURESOC_CLAMAV_PORT ?? 3310);
const clamAvTimeoutMs = Number(process.env.PURESOC_CLAMAV_TIMEOUT_MS ?? process.env.PURESOC_UPLOAD_SCANNER_TIMEOUT_MS ?? 10_000);

const server = createUploadScannerServer({
  engine,
  maxBodyBytes: Number.isSafeInteger(maxBodyBytes) && maxBodyBytes > 0 ? maxBodyBytes : undefined,
  clamav: {
    host: process.env.PURESOC_CLAMAV_HOST ?? "127.0.0.1",
    port: Number.isSafeInteger(clamAvPort) && clamAvPort > 0 ? clamAvPort : undefined,
    timeoutMs: Number.isSafeInteger(clamAvTimeoutMs) && clamAvTimeoutMs > 0 ? clamAvTimeoutMs : undefined
  }
});

server.listen(port, () => {
  console.log(`PureSOC upload scanner listening on ${port} with ${engine} engine`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function readScannerEngine(value: string | undefined): UploadScannerEngine {
  return value === "clamav" ? "clamav" : "basic";
}
