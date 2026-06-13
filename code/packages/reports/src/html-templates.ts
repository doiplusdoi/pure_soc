import type {
  InternalReadinessEvidencePackageExport,
  InternalReadinessReport,
  ReportControlResultSummary,
  ReportEvidenceSummary,
  ReportGapSummary,
  RomaniaNotificationDraftExport
} from "./report.types";

export type PdfReportTemplate =
  | "executive_summary"
  | "gap_report"
  | "romania_notification_draft"
  | "evidence_package_index";

export type PdfReportTemplateData =
  | InternalReadinessReport
  | RomaniaNotificationDraftExport
  | InternalReadinessEvidencePackageExport;

export interface BuildPdfReportHtmlInput {
  template: PdfReportTemplate;
  reportData: PdfReportTemplateData;
  filename?: string;
  title?: string;
  reportHash?: string;
}

export const buildPdfReportHtml = (input: BuildPdfReportHtmlInput): string => {
  if (input.template === "romania_notification_draft") {
    return wrapReportHtml({
      title: input.title ?? "Romanian NIS2 Notification Draft",
      reportData: input.reportData,
      reportHash: input.reportHash,
      body: renderRomaniaNotificationDraft(input.reportData as RomaniaNotificationDraftExport)
    });
  }

  if (input.template === "evidence_package_index") {
    return wrapReportHtml({
      title: input.title ?? "Evidence Package Index",
      reportData: input.reportData,
      reportHash: input.reportHash,
      body: renderEvidencePackageIndex(input.reportData as InternalReadinessEvidencePackageExport)
    });
  }

  if (input.template === "executive_summary") {
    return wrapReportHtml({
      title: input.title ?? "Executive Summary",
      reportData: input.reportData,
      reportHash: input.reportHash,
      body: renderExecutiveSummary(input.reportData as InternalReadinessReport)
    });
  }

  return wrapReportHtml({
    title: input.title ?? "Gap Report",
    reportData: input.reportData,
    reportHash: input.reportHash,
    body: renderGapReport(input.reportData as InternalReadinessReport)
  });
};

const wrapReportHtml = (input: {
  title: string;
  reportData: PdfReportTemplateData;
  body: string;
  reportHash?: string;
}): string => {
  const legalCaveat = readLegalCaveat(input.reportData);
  const generatedAt = readString(input.reportData, "generatedAt") ?? new Date(0).toISOString();
  const organizationId = readString(input.reportData, "organizationId") ?? "unknown";
  const reportType = readString(input.reportData, "reportType") ?? "report";
  const jurisdiction = readString(input.reportData, "jurisdiction") ?? "EU";

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    `<meta name="puresoc-legal-caveat" content="${escapeHtmlAttribute(legalCaveat)}">`,
    `<meta name="puresoc-report-type" content="${escapeHtmlAttribute(reportType)}">`,
    `<title>${escapeHtml(input.title)}</title>`,
    "<style>",
    reportCss,
    "</style>",
    "</head>",
    "<body>",
    '<main class="report-shell">',
    `<header class="report-header"><div><p class="eyebrow">PureSOC internal readiness</p><h1>${escapeHtml(
      input.title
    )}</h1></div><dl><div><dt>Organization</dt><dd>${escapeHtml(organizationId)}</dd></div><div><dt>Jurisdiction</dt><dd>${escapeHtml(
      jurisdiction
    )}</dd></div><div><dt>Generated</dt><dd>${escapeHtml(formatDateTime(generatedAt))}</dd></div></dl></header>`,
    input.body,
    `<footer class="report-footer"><span>${escapeHtml(legalCaveat)}</span><span>PureSOC</span>${
      input.reportHash ? `<span>Report hash ${escapeHtml(input.reportHash)}</span>` : ""
    }</footer>`,
    "</main>",
    "</body>",
    "</html>"
  ].join("\n");
};

const renderExecutiveSummary = (report: InternalReadinessReport): string => {
  const counts = summarizeControls(report.controlResults);
  const total = report.controlResults.length;
  const readinessScore = total > 0 ? Math.round(((counts.compliant + counts.acceptedRisk) / total) * 100) : 0;
  const scoreTone = readinessScore < 40 ? "danger" : readinessScore <= 70 ? "warning" : "success";
  const topGaps = report.gaps
    .filter((gap) => gap.severity === "critical" || gap.severity === "high")
    .sort(compareGaps)
    .slice(0, 3);

  return [
    '<section class="exec-grid">',
    `<article class="score-card ${scoreTone}"><span>Overall NIS2 readiness</span><strong>${readinessScore}</strong><small>out of 100</small></article>`,
    '<article class="traffic-card">',
    "<h2>Traffic-light view</h2>",
    renderTrafficRow("Infrastructure & Identity", readinessScoreForGroup(report.controlResults, ["iam", "mfa", "log"])),
    renderTrafficRow("Data & Access", readinessScoreForGroup(report.controlResults, ["data", "crypto", "supply"])),
    renderTrafficRow("Incident Readiness", readinessScoreForGroup(report.controlResults, ["inc", "bcp", "doc"])),
    "</article>",
    "</section>",
    '<section class="three-column-stats">',
    renderStat("Compliant", counts.compliant),
    renderStat("In progress", counts.inProgress),
    renderStat("Failing", counts.failing),
    "</section>",
    '<section class="fine-box"><h2>Fine exposure</h2><p>NIS2 Article 36 penalties: up to &euro;10,000,000 or 2% of global annual turnover for essential entities; up to &euro;7,000,000 or 1.4% for important entities.</p></section>',
    "<section>",
    "<h2>Top critical/high gaps</h2>",
    topGaps.length > 0
      ? `<ol class="gap-list">${topGaps.map((gap) => `<li>${renderGapInline(gap)}</li>`).join("")}</ol>`
      : '<p class="empty">No critical or high gaps in this stored analysis.</p>',
    "</section>"
  ].join("\n");
};

const renderGapReport = (report: InternalReadinessReport): string => {
  const gapsByControl = new Map(report.gaps.map((gap) => [gap.controlId, gap]));

  return [
    '<section class="summary-band">',
    renderStat("Controls", report.controlResults.length),
    renderStat("Open gaps", report.gaps.length),
    renderStat("Evidence artifacts", report.evidence.length),
    "</section>",
    '<section><h2>Top 3 gaps</h2>',
    report.gaps.length > 0
      ? `<ol class="gap-list">${[...report.gaps].sort(compareGaps).slice(0, 3).map((gap) => `<li>${renderGapInline(gap)}</li>`).join("")}</ol>`
      : '<p class="empty">No gaps in this stored analysis.</p>',
    "</section>",
    '<section><h2>Control list</h2><table><thead><tr><th>Control</th><th>Status</th><th>Severity</th><th>Evidence</th><th>Summary</th></tr></thead><tbody>',
    report.controlResults
      .map((control) => {
        const gap = gapsByControl.get(control.controlId);
        return `<tr><td><strong>${escapeHtml(control.controlCode ?? control.controlId)}</strong></td><td>${renderStatusBadge(
          control.status
        )}</td><td>${gap ? renderSeverityBadge(gap.severity) : '<span class="badge success">none</span>'}</td><td>${renderEvidenceStatus(
          control,
          report.evidence
        )}</td><td>${escapeHtml(gap?.summary ?? control.summary)}</td></tr>`;
      })
      .join("\n"),
    "</tbody></table></section>",
    renderSourceReferences(report.sourceReferences)
  ].join("\n");
};

const renderRomaniaNotificationDraft = (draft: RomaniaNotificationDraftExport): string => [
  '<section class="summary-band">',
  renderStat("Draft status", draft.status.replaceAll("_", " ")),
  renderStat("Mapped fields", draft.sourceMappedFields.length),
  renderStat("Source references", draft.sourceReferences.length),
  "</section>",
  '<section><h2>Prefilled notification fields</h2><table><thead><tr><th>Field</th><th>Value</th><th>Sources</th></tr></thead><tbody>',
  draft.sourceMappedFields
    .map(
      (field) =>
        `<tr><td>${escapeHtml(field.fieldKey)}</td><td>${escapeHtml(formatValue(field.value))}</td><td>${escapeHtml(
          field.sourceReferences.map((reference) => reference.sourceLocation ?? reference.sourceRecordId).join(", ")
        )}</td></tr>`
    )
    .join("\n"),
  "</tbody></table></section>",
  renderSourceReferences(draft.sourceReferences)
].join("\n");

const renderEvidencePackageIndex = (packageExport: InternalReadinessEvidencePackageExport): string => [
  '<section class="summary-band">',
  renderStat("Files", packageExport.manifest.files.length),
  renderStat("Evidence artifacts", packageExport.manifest.evidenceArtifacts.length),
  renderStat("Package bytes", packageExport.sizeBytes),
  "</section>",
  '<section><h2>Manifest</h2><table><thead><tr><th>Path</th><th>Role</th><th>MIME type</th><th>SHA-256</th></tr></thead><tbody>',
  packageExport.manifest.files
    .map(
      (file) =>
        `<tr><td>${escapeHtml(file.path)}</td><td>${escapeHtml(file.role)}</td><td>${escapeHtml(
          file.mimeType
        )}</td><td><code>${escapeHtml(file.contentHashSha256)}</code></td></tr>`
    )
    .join("\n"),
  "</tbody></table></section>",
  renderEvidenceList(packageExport.manifest.evidenceArtifacts),
  renderSourceReferences(packageExport.manifest.sourceReferences)
].join("\n");

const renderEvidenceList = (evidence: readonly ReportEvidenceSummary[]): string => [
  '<section><h2>Evidence artifacts</h2><table><thead><tr><th>Title</th><th>Source</th><th>Hash</th><th>Status</th></tr></thead><tbody>',
  evidence
    .map(
      (artifact) =>
        `<tr><td>${escapeHtml(artifact.title)}</td><td>${escapeHtml(artifact.sourceType)}</td><td><code>${escapeHtml(
          artifact.contentHashSha256
        )}</code></td><td>${escapeHtml(artifact.scanStatus ?? "recorded")}</td></tr>`
    )
    .join("\n"),
  "</tbody></table></section>"
].join("\n");

const renderSourceReferences = (references: readonly { sourceRecordId?: string; title?: string; jurisdiction: string }[]) =>
  references.length > 0
    ? [
        '<section><h2>Regulatory sources</h2><ul class="source-list">',
        references
          .map(
            (reference) =>
              `<li><strong>${escapeHtml(reference.sourceRecordId ?? "source")}</strong> ${escapeHtml(
                reference.title ?? reference.jurisdiction
              )}</li>`
          )
          .join("\n"),
        "</ul></section>"
      ].join("\n")
    : "";

const renderTrafficRow = (label: string, score: number): string => {
  const tone = score < 40 ? "danger" : score <= 70 ? "warning" : "success";
  return `<div class="traffic-row"><span class="light ${tone}"></span><strong>${escapeHtml(label)}</strong><span>${score}%</span></div>`;
};

const renderStat = (label: string, value: string | number): string =>
  `<div class="stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;

const renderGapInline = (gap: ReportGapSummary): string =>
  `${renderSeverityBadge(gap.severity)} <strong>${escapeHtml(gap.controlCode ?? gap.controlId)}</strong> ${escapeHtml(
    gap.summary
  )}`;

const renderSeverityBadge = (severity: ReportGapSummary["severity"]): string =>
  `<span class="badge ${severity}">${escapeHtml(severity)}</span>`;

const renderStatusBadge = (status: string): string => {
  const tone = isPassingStatus(status) ? "success" : status.includes("progress") ? "warning" : "danger";
  return `<span class="badge ${tone}">${escapeHtml(status.replaceAll("_", " "))}</span>`;
};

const renderEvidenceStatus = (
  control: ReportControlResultSummary,
  evidence: readonly ReportEvidenceSummary[]
): string => {
  if (control.evidenceCompleteness) {
    return `${control.evidenceCompleteness.present}/${control.evidenceCompleteness.required}`;
  }

  const linkedCount = evidence.filter((artifact) => artifact.controlId === control.controlId).length;
  return linkedCount > 0 ? `${linkedCount} artifact(s)` : "missing";
};

const summarizeControls = (controls: readonly ReportControlResultSummary[]) =>
  controls.reduce(
    (counts, control) => {
      if (control.status === "compliant") {
        counts.compliant += 1;
      } else if (control.status === "accepted_risk") {
        counts.acceptedRisk += 1;
      } else if (control.status.includes("progress") || control.status.includes("pending")) {
        counts.inProgress += 1;
      } else {
        counts.failing += 1;
      }
      return counts;
    },
    { acceptedRisk: 0, compliant: 0, failing: 0, inProgress: 0 }
  );

const readinessScoreForGroup = (controls: readonly ReportControlResultSummary[], keys: readonly string[]): number => {
  const groupControls = controls.filter((control) =>
    keys.some((key) => `${control.controlId} ${control.controlCode ?? ""}`.toLowerCase().includes(key))
  );
  const selectedControls = groupControls.length > 0 ? groupControls : controls;
  if (selectedControls.length === 0) {
    return 0;
  }
  const passing = selectedControls.filter((control) => isPassingStatus(control.status)).length;
  return Math.round((passing / selectedControls.length) * 100);
};

const isPassingStatus = (status: string): boolean => status === "compliant" || status === "accepted_risk";

const compareGaps = (left: ReportGapSummary, right: ReportGapSummary): number =>
  severityWeight(right.severity) - severityWeight(left.severity) || left.controlId.localeCompare(right.controlId);

const severityWeight = (severity: ReportGapSummary["severity"]): number =>
  ({ critical: 4, high: 3, medium: 2, low: 1 })[severity];

const readLegalCaveat = (reportData: PdfReportTemplateData): string =>
  typeof (reportData as { legalCaveat?: unknown }).legalCaveat === "string"
    ? (reportData as { legalCaveat: string }).legalCaveat
    : typeof (reportData as { manifest?: { legalCaveat?: unknown } }).manifest?.legalCaveat === "string"
      ? ((reportData as { manifest: { legalCaveat: string } }).manifest.legalCaveat)
    : "PureSOC internal readiness output is not a legal opinion.";

const readString = (value: unknown, key: string): string | undefined =>
  value && typeof value === "object" && typeof (value as Record<string, unknown>)[key] === "string"
    ? ((value as Record<string, unknown>)[key] as string)
    : undefined;

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeHtmlAttribute = escapeHtml;

const reportCss = `
* { box-sizing: border-box; }
html { color: #17202a; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
body { margin: 0; background: #fff; font-size: 12px; line-height: 1.45; }
.report-shell { padding: 22px 28px 52px; }
.report-header { align-items: start; border-bottom: 2px solid #17202a; display: flex; gap: 20px; justify-content: space-between; margin-bottom: 18px; padding-bottom: 14px; }
.report-header h1 { font-size: 28px; letter-spacing: 0; line-height: 1.1; margin: 0; }
.report-header dl { display: grid; gap: 7px; margin: 0; min-width: 180px; }
.report-header dt { color: #5d6975; font-size: 10px; text-transform: uppercase; }
.report-header dd { font-weight: 700; margin: 0; }
.eyebrow { color: #5d6975; font-size: 10px; font-weight: 800; margin: 0 0 6px; text-transform: uppercase; }
h2 { font-size: 15px; margin: 20px 0 8px; }
table { border-collapse: collapse; width: 100%; }
th, td { border-bottom: 1px solid #d9dee3; padding: 7px 8px; text-align: left; vertical-align: top; }
th { background: #f2f5f8; color: #39424e; font-size: 10px; text-transform: uppercase; }
code { font-family: "SFMono-Regular", Consolas, monospace; font-size: 10px; overflow-wrap: anywhere; }
.exec-grid { display: grid; gap: 14px; grid-template-columns: 0.9fr 1.3fr; }
.score-card { border: 2px solid #17202a; border-radius: 8px; min-height: 190px; padding: 18px; }
.score-card span, .score-card small { display: block; font-weight: 700; text-transform: uppercase; }
.score-card strong { display: block; font-size: 78px; line-height: 0.95; margin: 18px 0 10px; }
.score-card.success { background: #e8f7ef; border-color: #1d7a43; color: #185b34; }
.score-card.warning { background: #fff5d7; border-color: #a66b00; color: #6f4700; }
.score-card.danger { background: #ffe9e6; border-color: #ba3329; color: #85251e; }
.traffic-card, .fine-box { border: 1px solid #cdd5dd; border-radius: 8px; padding: 14px; }
.traffic-row { align-items: center; border-top: 1px solid #e2e6ea; display: grid; gap: 10px; grid-template-columns: 16px 1fr auto; padding: 10px 0; }
.traffic-row:first-of-type { border-top: 0; }
.light { border-radius: 999px; display: inline-block; height: 13px; width: 13px; }
.light.success { background: #1f9d55; }
.light.warning { background: #f2b600; }
.light.danger { background: #d13d35; }
.summary-band, .three-column-stats { display: grid; gap: 10px; grid-template-columns: repeat(3, 1fr); margin: 12px 0 18px; }
.stat { background: #f7f9fb; border: 1px solid #d9dee3; border-radius: 8px; padding: 10px 12px; }
.stat span { color: #5d6975; display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; }
.stat strong { display: block; font-size: 18px; margin-top: 3px; }
.badge { border-radius: 999px; display: inline-block; font-size: 10px; font-weight: 800; padding: 2px 7px; text-transform: uppercase; white-space: nowrap; }
.badge.critical, .badge.danger { background: #ffe9e6; color: #98231c; }
.badge.high { background: #ffe8c2; color: #8c4a00; }
.badge.medium, .badge.warning { background: #fff5d7; color: #6f4700; }
.badge.low, .badge.success { background: #e8f7ef; color: #185b34; }
.gap-list { margin: 0; padding-left: 18px; }
.gap-list li { margin-bottom: 7px; }
.source-list { columns: 2; list-style: none; margin: 0; padding: 0; }
.source-list li { break-inside: avoid; margin-bottom: 6px; }
.empty { color: #5d6975; font-style: italic; }
.fine-box { background: #eef6ff; border-color: #9fc5ef; margin: 18px 0; }
.fine-box h2 { margin-top: 0; }
.report-footer { border-top: 1px solid #cdd5dd; color: #5d6975; display: grid; gap: 6px; grid-template-columns: 1fr auto auto; margin-top: 26px; padding-top: 10px; }
@page { margin: 18mm 13mm 20mm; }
`;
