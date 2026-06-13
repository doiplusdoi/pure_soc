import { createHash } from "node:crypto";

import { ReportExportError } from "@puresoc/reports";
import type { RenderedReportArtifact, ReportPdfRendererClient } from "./service";

export const createHttpReportPdfRendererClient = (endpoint: string): ReportPdfRendererClient | undefined => {
  if (!isHttpUrl(endpoint)) {
    return undefined;
  }

  const renderUrl = new URL("/render", endpoint.endsWith("/") ? endpoint : `${endpoint}/`);

  return {
    async renderPdf(input) {
      const response = await fetch(renderUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          html: input.html,
          filename: input.filename,
          renderedAt: input.renderedAt
        })
      });

      if (!response.ok) {
        throw new ReportExportError(
          "report_renderer_unavailable",
          `Report renderer returned HTTP ${response.status}.`,
          502
        );
      }

      const body = new Uint8Array(await response.arrayBuffer());
      return {
        format: "pdf",
        mimeType: response.headers.get("content-type")?.split(";")[0] || "application/pdf",
        body,
        contentHashSha256:
          response.headers.get("x-puresoc-content-sha256") ?? createHash("sha256").update(body).digest("hex"),
        renderer: response.headers.get("x-puresoc-renderer") ?? "puresoc-report-renderer",
        renderedAt: input.renderedAt ?? new Date().toISOString()
      } satisfies RenderedReportArtifact;
    }
  };
};

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};
