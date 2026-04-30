import { describe, expect, it } from "vitest";

import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import { renderReport } from "../index";

describe("report renderer", () => {
  it("renders deterministic JSON and stable placeholder PDF artifacts from stored report data", () => {
    const reportData = {
      schemaVersion: "puresoc.report.internal_readiness.v1",
      reportType: "internal_readiness",
      organizationId: "org_renderer",
      legalCaveat: PURESOC_LEGAL_CAVEAT,
      sourceReferences: [
        {
          sourceRecordId: "eu-nis2-art-21",
          jurisdiction: "EU"
        }
      ]
    };

    const json = renderReport({
      format: "json",
      renderedAt: "2026-04-30T10:00:00.000Z",
      reportData
    });
    const pdf = renderReport({
      format: "pdf",
      renderedAt: "2026-04-30T10:00:00.000Z",
      reportData
    });

    expect(json.mimeType).toBe("application/json");
    expect(Buffer.from(json.body).toString("utf8")).toContain('"legalCaveat"');
    expect(pdf.mimeType).toBe("application/pdf");
    expect(Buffer.from(pdf.body).toString("utf8")).toContain("%PDF-1.4");
    expect(Buffer.from(pdf.body).toString("utf8")).toContain("puresoc.report_renderer.pdf_placeholder.v1");
    expect(pdf.contentHashSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
