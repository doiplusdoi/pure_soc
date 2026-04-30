import { stableJsonExport } from "@puresoc/reports";

export const reportRendererAppRole = "puresoc-report-renderer";

export interface ReportRendererInput {
  format: "json" | "pdf";
  reportData: Record<string, unknown>;
}

export interface ReportRendererResult {
  format: "json" | "pdf";
  mimeType: string;
  body: string;
  renderer: string;
}

export const renderReport = (input: ReportRendererInput): ReportRendererResult => {
  if (input.format === "pdf") {
    throw new Error("PDF rendering is deferred behind the report-renderer service boundary.");
  }

  return {
    format: "json",
    mimeType: "application/json",
    body: stableJsonExport(input.reportData),
    renderer: reportRendererAppRole
  };
};
