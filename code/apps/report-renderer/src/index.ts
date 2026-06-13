import { createHash } from "node:crypto";

import { stableJsonExport } from "@puresoc/reports";
import { chromium, type Browser } from "playwright";

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

export interface HtmlPdfRendererInput {
  html: string;
  filename: string;
  renderedAt?: string;
}

export interface HtmlPdfRendererOptions {
  browser?: Browser;
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

let browserPromise: Promise<Browser> | undefined;

export const renderHtmlPdf = async (
  input: HtmlPdfRendererInput,
  options: HtmlPdfRendererOptions = {}
): Promise<ReportRendererResult> => {
  const renderedAt = input.renderedAt ?? new Date().toISOString();
  const browser = options.browser ?? (await getBrowser());
  const page = await browser.newPage({
    viewport: {
      width: 1240,
      height: 1754
    }
  });

  try {
    await page.setContent(input.html, {
      waitUntil: "networkidle"
    });

    const legalCaveat = extractLegalCaveat(input.html);
    const body = await page.pdf({
      displayHeaderFooter: true,
      footerTemplate: createFooterTemplate(legalCaveat),
      format: "A4",
      headerTemplate: '<span style="font-size:1px"></span>',
      margin: {
        top: "18mm",
        right: "13mm",
        bottom: "22mm",
        left: "13mm"
      },
      printBackground: true,
      preferCSSPageSize: true
    });

    return {
      format: "pdf",
      mimeType: "application/pdf",
      body,
      contentHashSha256: sha256Hex(body),
      renderer: reportRendererAppRole,
      renderedAt
    };
  } finally {
    await page.close();
  }
};

export const closeReportRendererBrowser = async (): Promise<void> => {
  if (!browserPromise) {
    return;
  }

  const browser = await browserPromise;
  browserPromise = undefined;
  await browser.close();
};

export const createFooterTemplate = (legalCaveat: string): string =>
  `<div style="${footerBaseStyle}"><span style="max-width:82%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(
    legalCaveat
  )}</span><span>Page <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`;

export const extractLegalCaveat = (html: string): string => {
  const match = html.match(/<meta\s+[^>]*name=["']puresoc-legal-caveat["'][^>]*>/i);
  if (!match) {
    return "PureSOC internal readiness output is not a legal opinion.";
  }

  const contentMatch = match[0].match(/\scontent=["']([^"']*)["']/i);
  return decodeHtmlEntities(contentMatch?.[1] ?? "PureSOC internal readiness output is not a legal opinion.");
};

const sha256Hex = (body: Uint8Array): string => createHash("sha256").update(body).digest("hex");

const getBrowser = (): Promise<Browser> => {
  browserPromise ??= chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"]
  });

  return browserPromise;
};

const footerBaseStyle = [
  "border-top:1px solid #cdd5dd",
  "color:#5d6975",
  "display:flex",
  "font-family:Inter,Arial,sans-serif",
  "font-size:7px",
  "gap:8px",
  "justify-content:space-between",
  "margin:0 13mm",
  "padding-top:4px",
  "width:calc(100% - 26mm)"
].join(";");

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const decodeHtmlEntities = (value: string): string =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
