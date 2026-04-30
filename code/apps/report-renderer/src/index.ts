import { createHash } from "node:crypto";

import { stableJsonExport } from "@puresoc/reports";

export const reportRendererAppRole = "puresoc-report-renderer";

export interface ReportRendererInput {
  format: "json" | "pdf";
  reportData: Record<string, unknown>;
  renderedAt?: string;
}

export interface ReportRendererResult {
  format: "json" | "pdf";
  mimeType: string;
  body: Uint8Array;
  contentHashSha256: string;
  renderer: string;
  renderedAt: string;
}

export const renderReport = (input: ReportRendererInput): ReportRendererResult => {
  const renderedAt = input.renderedAt ?? new Date(0).toISOString();

  if (input.format === "pdf") {
    const reportJson = stableJsonExport(input.reportData);
    const body = Buffer.from(
      [
        "%PDF-1.4",
        "% PureSOC deterministic report-renderer placeholder",
        stableJsonExport({
          schemaVersion: "puresoc.report_renderer.pdf_placeholder.v1",
          renderer: reportRendererAppRole,
          renderedAt,
          reportDataHashSha256: sha256Hex(Buffer.from(reportJson, "utf8")),
          reportType: input.reportData.reportType,
          legalCaveat: input.reportData.legalCaveat,
          sourceReferenceCount: Array.isArray(input.reportData.sourceReferences)
            ? input.reportData.sourceReferences.length
            : 0
        }),
        "%%EOF",
        ""
      ].join("\n"),
      "utf8"
    );

    return {
      format: "pdf",
      mimeType: "application/pdf",
      body,
      contentHashSha256: sha256Hex(body),
      renderer: reportRendererAppRole,
      renderedAt
    };
  }

  const body = Buffer.from(stableJsonExport(input.reportData), "utf8");

  return {
    format: "json",
    mimeType: "application/json",
    body,
    contentHashSha256: sha256Hex(body),
    renderer: reportRendererAppRole,
    renderedAt
  };
};

const sha256Hex = (body: Uint8Array): string => createHash("sha256").update(body).digest("hex");
