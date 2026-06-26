import type {
  InternalReadinessEvidencePackageExport,
  InternalReadinessReport,
  ReportControlResultSummary,
  ReportEvidenceSummary,
  ReportBranding,
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
  const branding = readReportBranding(input.reportData);
  const organizationLabel = branding?.legalName ?? branding?.organizationName ?? organizationId;
  const logoDataUrl = branding?.logoDataUrl;
  const logo = isSafeReportLogoDataUrl(logoDataUrl) ? logoDataUrl : undefined;
  const reportType = readString(input.reportData, "reportType") ?? "report";
  const jurisdiction = readString(input.reportData, "jurisdiction") ?? "EU";
  const generatedLabel = formatDateTime(generatedAt);
  const reportSubtitle = readReportSubtitle(reportType);
  const logoMark = logo
    ? `<img class="report-logo" src="${escapeHtmlAttribute(logo)}" alt="${escapeHtmlAttribute(organizationLabel)} logo">`
    : `<span class="report-logo-fallback">${escapeHtml(companyInitials(organizationLabel))}</span>`;

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
    '<header class="report-hero">',
    `<div class="report-topline"><span>PureSOC / ${escapeHtml(reportType.replaceAll("_", " "))}</span></div>`,
    '<div class="report-hero__body">',
    `<div class="report-hero__copy"><p class="eyebrow">Internal readiness / ${escapeHtml(
      jurisdiction
    )}</p><h1>${escapeHtml(input.title)}</h1><p class="report-subtitle">${escapeHtml(reportSubtitle)}</p></div>`,
    `<dl class="report-meta-card"><div class="report-meta-card__brand">${logoMark}<div><dt>Organization</dt><dd>${escapeHtml(
      organizationLabel
    )}</dd></div></div><div><dt>Workspace ID</dt><dd><code>${escapeHtml(
      organizationId
    )}</code></dd></div><div><dt>Generated</dt><dd>${escapeHtml(generatedLabel)}</dd></div></dl>`,
    "</div>",
    "</header>",
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
    renderConceptSummary(report),
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
    renderReportMetrics(report),
    '<section class="report-main-grid">',
    renderPriorityActions(report),
    renderReportVersions(report),
    "</section>",
    renderCalibrationSummary(report),
    renderVerifiedEvidenceComparison(report),
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

const renderReportMetrics = (report: InternalReadinessReport): string => {
  const priorityGapCount = report.concepts.priority.criticalGapCount + report.concepts.priority.highGapCount;
  return [
    '<section class="report-metrics" aria-label="Report summary">',
    renderMetricCard("Applicability", report.concepts.applicability.result.replaceAll("_", " "), "blue"),
    renderMetricCard("Readiness", `${report.concepts.readiness.value} / 100`, "green"),
    renderMetricCard("Evidence confidence", `${report.concepts.evidenceConfidence.value}%`, "amber"),
    renderMetricCard("Priority gaps", priorityGapCount || report.gaps.length, "rose"),
    "</section>"
  ].join("\n");
};

const renderMetricCard = (label: string, value: string | number, tone: "amber" | "blue" | "green" | "rose"): string =>
  `<article class="metric-card metric-card--${tone}"><span class="metric-card__label"><i></i>${escapeHtml(
    label
  )}</span><strong>${escapeHtml(String(value))}</strong></article>`;

const renderPriorityActions = (report: InternalReadinessReport): string => {
  const sortedGaps = [...report.gaps].sort(compareGaps).slice(0, 4);
  return [
    '<article class="priority-panel">',
    '<div class="priority-panel__header"><h2>Priority actions</h2><span>Source</span></div>',
    sortedGaps.length > 0
      ? `<div class="priority-list">${sortedGaps.map((gap, index) => renderPriorityActionRow(gap, index)).join("")}</div>`
      : '<p class="empty">No priority gaps in this stored analysis.</p>',
    "</article>"
  ].join("\n");
};

const renderPriorityActionRow = (gap: ReportGapSummary, index: number): string => {
  const source = sourceLabelForGap(gap);
  const action = gap.recommendedActions[0] ?? gap.summary;
  return [
    '<div class="priority-row">',
    `<span class="priority-index priority-index--${escapeHtml(gap.severity)}">${index + 1}</span>`,
    `<strong>${escapeHtml(action)}</strong>`,
    renderSeverityBadge(gap.severity),
    `<span class="source-chip source-chip--${escapeHtml(source.tone)}">${escapeHtml(source.label)}</span>`,
    "</div>"
  ].join("");
};

const renderReportVersions = (report: InternalReadinessReport): string => {
  const reportVersion = report.version.reportVersion;
  const hasVerifiedEvidence = Boolean(report.verifiedEvidence);
  const items = [
    {
      current: reportVersion === 1,
      label: "V1",
      status: reportVersion === 1 ? "Current" : "Recorded",
      title: "Business baseline"
    },
    {
      current: reportVersion === 2,
      label: "V2",
      status: hasVerifiedEvidence ? "Verified evidence" : "Awaiting evidence",
      title: "Microsoft evidence"
    },
    {
      current: false,
      label: "V3",
      status: "Planned",
      title: "After remediation"
    }
  ];

  return [
    '<aside class="version-panel" aria-label="Report versions">',
    "<h2>Report versions</h2>",
    '<ol class="version-list">',
    items
      .map(
        (item) =>
          `<li class="${item.current ? "current" : ""}"><span>${escapeHtml(item.label)}</span><div><strong>${escapeHtml(
            item.title
          )}</strong><small>${escapeHtml(item.status)}</small></div></li>`
      )
      .join(""),
    "</ol>",
    "</aside>"
  ].join("\n");
};

const renderConceptSummary = (report: InternalReadinessReport): string =>
  [
    '<section class="summary-band">',
    renderStat("Applicability", report.concepts.applicability.result.replaceAll("_", " ")),
    renderStat("Readiness", `${report.concepts.readiness.value}%`),
    renderStat("Evidence confidence", `${report.concepts.evidenceConfidence.value}%`),
    renderStat("Priority", report.concepts.priority.result),
    "</section>"
  ].join("\n");

const renderCalibrationSummary = (report: InternalReadinessReport): string =>
  [
    '<section class="calibration-box">',
    "<h2>Score calibration</h2>",
    '<div class="summary-band">',
    renderStat("Calibration", report.calibration.calibrationVersion),
    renderStat("Review status", report.calibration.reviewStatus.replaceAll("_", " ")),
    renderStat("Factors", report.calibration.factors.length),
    "</div>",
    `<p>${escapeHtml(report.calibration.scoreSeparationPolicy.readinessScore)}</p>`,
    `<p>${escapeHtml(report.calibration.scoreSeparationPolicy.evidenceConfidence)}</p>`,
    `<p>${escapeHtml(report.calibration.scoreSeparationPolicy.legalApplicability)}</p>`,
    "</section>"
  ].join("\n");

const renderVerifiedEvidenceComparison = (report: InternalReadinessReport): string => {
  if (!report.comparison && !report.verifiedEvidence) {
    return "";
  }

  const comparison = report.comparison;
  const contradictions = report.verifiedEvidence?.contradictions ?? [];
  return [
    '<section class="verified-box">',
    "<h2>Declared vs verified comparison</h2>",
    comparison
      ? [
          '<div class="summary-band">',
          renderStat("Readiness delta", formatDelta(comparison.readinessDelta)),
          renderStat("Evidence confidence delta", formatDelta(comparison.evidenceConfidenceDelta)),
          renderStat("Contradictions", comparison.contradictions.length),
          "</div>",
          comparison.changedControlAreas.length > 0
            ? [
                "<h2>Changed control areas</h2>",
                "<table><thead><tr><th>Control</th><th>Previous</th><th>Current</th><th>Deltas</th></tr></thead><tbody>",
                comparison.changedControlAreas
                  .map(
                    (change) =>
                      `<tr><td>${escapeHtml(change.controlId)}</td><td>${escapeHtml(
                        change.previousStatus.replaceAll("_", " ")
                      )}</td><td>${escapeHtml(change.currentStatus.replaceAll("_", " "))}</td><td>Readiness ${escapeHtml(
                        formatDelta(change.readinessDelta)
                      )}; evidence ${escapeHtml(formatDelta(change.evidenceConfidenceDelta))}</td></tr>`
                  )
                  .join("\n"),
                "</tbody></table>"
              ].join("\n")
            : '<p class="empty">No changed control areas in this version comparison.</p>'
        ].join("\n")
      : "",
    contradictions.length > 0
      ? [
          "<h2>Contradictions</h2>",
          "<table><thead><tr><th>Control</th><th>Declared</th><th>Verified observation</th><th>Effective result</th></tr></thead><tbody>",
          contradictions
            .map(
              (contradiction) =>
                `<tr><td>${escapeHtml(contradiction.controlId)}</td><td>${escapeHtml(
                  `${contradiction.declaredStatus}: ${contradiction.declaredSummary}`
                )}</td><td>${escapeHtml(
                  `${contradiction.verifiedStatus}: ${contradiction.verifiedSummary}`
                )}</td><td>${escapeHtml(
                  `${contradiction.effectiveStatus}; readiness ${formatDelta(
                    contradiction.readinessDelta
                  )}; evidence ${formatDelta(contradiction.evidenceConfidenceDelta)}`
                )}</td></tr>`
            )
            .join("\n"),
          "</tbody></table>"
        ].join("\n")
      : '<p class="empty">No declared vs verified contradictions in this report version.</p>',
    "</section>"
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

const sourceLabelForGap = (gap: ReportGapSummary): { label: string; tone: string } => {
  const provenance = gap.provenance ?? [];
  if (
    provenance.includes("verified_through_microsoft") ||
    provenance.includes("unavailable_permission") ||
    provenance.includes("unavailable_product_or_license")
  ) {
    return { label: "M365", tone: "m365" };
  }
  if (provenance.includes("uploaded_evidence")) {
    return { label: "Evidence", tone: "evidence" };
  }
  if (provenance.includes("declared_by_customer") || provenance.includes("inferred_by_rule")) {
    return { label: "Business", tone: "business" };
  }
  if (gap.missingEvidence.length > 0) {
    return { label: "Missing", tone: "missing" };
  }
  return { label: gap.jurisdiction, tone: "jurisdiction" };
};

const readReportSubtitle = (reportType: string): string => {
  if (reportType === "internal_readiness") {
    return "The report separates known facts, evidence confidence, legal applicability and next priority.";
  }
  if (reportType === "romania_notification_draft") {
    return "A source-mapped draft for internal review before any authority submission.";
  }
  if (reportType === "evidence_package") {
    return "Evidence files, source references and hashes are collected for review without public storage links.";
  }
  return "A PureSOC internal readiness output with source references and conservative claims.";
};

const readLegalCaveat = (reportData: PdfReportTemplateData): string =>
  typeof (reportData as { legalCaveat?: unknown }).legalCaveat === "string"
    ? (reportData as { legalCaveat: string }).legalCaveat
    : typeof (reportData as { manifest?: { legalCaveat?: unknown } }).manifest?.legalCaveat === "string"
      ? ((reportData as { manifest: { legalCaveat: string } }).manifest.legalCaveat)
    : "PureSOC internal readiness output is not a legal opinion.";

const readReportBranding = (reportData: PdfReportTemplateData): ReportBranding | undefined => {
  const branding = (reportData as { reportBranding?: unknown }).reportBranding;
  if (!branding || typeof branding !== "object" || Array.isArray(branding)) {
    return undefined;
  }

  const record = branding as Record<string, unknown>;
  return {
    organizationName: typeof record.organizationName === "string" ? record.organizationName : undefined,
    legalName: typeof record.legalName === "string" || record.legalName === null ? record.legalName : undefined,
    logoDataUrl: typeof record.logoDataUrl === "string" || record.logoDataUrl === null ? record.logoDataUrl : undefined
  };
};

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

const formatDelta = (value: number): string => `${value > 0 ? "+" : ""}${value}%`;

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeHtmlAttribute = escapeHtml;

const isSafeReportLogoDataUrl = (value: string | null | undefined): value is string =>
  typeof value === "string" && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value);

const companyInitials = (value: string): string => {
  const letters = value
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return letters || "PS";
};

const reportCss = `
* { box-sizing: border-box; }
html { color: oklch(23% 0.035 255); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
body { margin: 0; background: oklch(96.5% 0.006 255); font-size: 12px; line-height: 1.45; }
.report-shell { background: oklch(98.8% 0.005 255); min-height: 100vh; padding: 30px 34px 54px; }
.report-hero { margin-bottom: 24px; }
.report-topline { border-top: 1px solid oklch(87% 0.017 255); color: oklch(58% 0.045 255); font-size: 10px; font-weight: 900; padding-top: 10px; text-transform: uppercase; }
.report-hero__body { align-items: start; display: grid; gap: 26px; grid-template-columns: minmax(0, 1fr) 220px; padding-top: 46px; }
.report-hero__copy { min-width: 0; }
.report-hero h1 { color: oklch(20% 0.06 260); font-size: 38px; letter-spacing: 0; line-height: 1.05; margin: 0; max-width: 760px; overflow-wrap: anywhere; }
.report-subtitle { color: oklch(50% 0.045 255); font-size: 16px; font-weight: 700; line-height: 1.4; margin: 16px 0 0; max-width: 680px; }
.report-meta-card { background: oklch(97% 0.009 255); border: 1px solid oklch(86% 0.022 255); border-radius: 8px; display: grid; gap: 10px; margin: 0; padding: 13px; }
.report-meta-card__brand { align-items: center; display: grid; gap: 11px; grid-template-columns: 46px minmax(0, 1fr); }
.report-logo, .report-logo-fallback { border: 1px solid oklch(85% 0.02 255); border-radius: 8px; display: block; flex: 0 0 auto; height: 46px; width: 46px; }
.report-logo { background: oklch(99% 0.004 255); object-fit: contain; padding: 5px; }
.report-logo-fallback { align-items: center; background: oklch(94% 0.035 258); color: oklch(43% 0.17 258); display: flex; font-size: 15px; font-weight: 900; justify-content: center; }
.report-meta-card dt { color: oklch(53% 0.035 255); font-size: 9px; font-weight: 900; text-transform: uppercase; }
.report-meta-card dd { color: oklch(25% 0.04 255); font-weight: 800; margin: 2px 0 0; overflow-wrap: anywhere; }
.eyebrow { color: oklch(54% 0.16 258); font-size: 11px; font-weight: 900; margin: 0 0 14px; text-transform: uppercase; }
h2 { color: oklch(20% 0.055 260); font-size: 19px; letter-spacing: 0; line-height: 1.2; margin: 22px 0 10px; }
table { border-collapse: collapse; width: 100%; }
th, td { border-bottom: 1px solid oklch(89% 0.011 255); padding: 7px 8px; text-align: left; vertical-align: top; }
th { background: oklch(95% 0.012 255); color: oklch(38% 0.035 255); font-size: 10px; text-transform: uppercase; }
code { font-family: "SFMono-Regular", Consolas, monospace; font-size: 10px; overflow-wrap: anywhere; }
.exec-grid { display: grid; gap: 14px; grid-template-columns: 0.9fr 1.3fr; }
.score-card { border: 2px solid oklch(23% 0.035 255); border-radius: 8px; min-height: 190px; padding: 18px; }
.score-card span, .score-card small { display: block; font-weight: 700; text-transform: uppercase; }
.score-card strong { display: block; font-size: 78px; line-height: 0.95; margin: 18px 0 10px; }
.score-card.success { background: oklch(95% 0.04 155); border-color: oklch(50% 0.14 155); color: oklch(34% 0.1 155); }
.score-card.warning { background: oklch(96% 0.05 78); border-color: oklch(58% 0.13 75); color: oklch(38% 0.095 75); }
.score-card.danger { background: oklch(95% 0.045 22); border-color: oklch(54% 0.18 22); color: oklch(36% 0.13 22); }
.traffic-card, .fine-box { background: oklch(99% 0.004 255); border: 1px solid oklch(86% 0.018 255); border-radius: 8px; padding: 14px; }
.traffic-row { align-items: center; border-top: 1px solid oklch(90% 0.01 255); display: grid; gap: 10px; grid-template-columns: 16px 1fr auto; padding: 10px 0; }
.traffic-row:first-of-type { border-top: 0; }
.light { border-radius: 999px; display: inline-block; height: 13px; width: 13px; }
.light.success { background: oklch(60% 0.16 155); }
.light.warning { background: oklch(75% 0.15 78); }
.light.danger { background: oklch(61% 0.2 22); }
.report-metrics { display: grid; gap: 16px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0 0 20px; }
.metric-card { background: oklch(99% 0.004 255); border: 1px solid oklch(86% 0.018 255); border-radius: 8px; min-height: 92px; padding: 15px 16px; }
.metric-card__label { align-items: center; color: oklch(51% 0.04 255); display: flex; font-size: 11px; font-weight: 900; gap: 10px; margin-bottom: 18px; }
.metric-card__label i { border-radius: 999px; display: inline-block; height: 9px; outline: 5px solid oklch(96% 0.02 255); width: 9px; }
.metric-card strong { color: oklch(20% 0.055 260); display: block; font-size: 24px; line-height: 1.1; overflow-wrap: anywhere; }
.metric-card--blue i { background: oklch(62% 0.19 258); outline-color: oklch(94% 0.04 258); }
.metric-card--green i { background: oklch(62% 0.15 155); outline-color: oklch(94% 0.04 155); }
.metric-card--amber i { background: oklch(75% 0.15 70); outline-color: oklch(96% 0.04 70); }
.metric-card--rose i { background: oklch(64% 0.19 18); outline-color: oklch(95% 0.04 18); }
.report-main-grid { align-items: stretch; display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr) 220px; margin: 16px 0 24px; }
.priority-panel { background: oklch(99% 0.004 255); border: 1px solid oklch(86% 0.018 255); border-radius: 8px; padding: 22px 24px; }
.priority-panel__header { align-items: center; display: flex; justify-content: space-between; margin-bottom: 10px; }
.priority-panel__header h2, .version-panel h2 { margin: 0; }
.priority-panel__header span { color: oklch(58% 0.045 255); font-size: 10px; font-weight: 900; text-transform: uppercase; }
.priority-list { display: grid; }
.priority-row { align-items: center; border-top: 1px solid oklch(90% 0.01 255); display: grid; gap: 12px; grid-template-columns: 24px minmax(0, 1fr) 82px 88px; min-height: 43px; }
.priority-row:first-child { border-top: 0; }
.priority-row strong { color: oklch(27% 0.045 255); font-size: 13px; line-height: 1.3; }
.priority-index { align-items: center; border-radius: 999px; display: flex; font-size: 10px; font-weight: 900; height: 20px; justify-content: center; width: 20px; }
.priority-index--critical { background: oklch(95% 0.045 18); color: oklch(55% 0.2 18); }
.priority-index--high { background: oklch(96% 0.05 60); color: oklch(61% 0.16 55); }
.priority-index--medium { background: oklch(96% 0.045 90); color: oklch(48% 0.11 90); }
.priority-index--low { background: oklch(94% 0.04 155); color: oklch(44% 0.12 155); }
.version-panel { background: oklch(20% 0.06 260); border-radius: 8px; color: oklch(98% 0.006 255); padding: 24px; }
.version-panel h2 { color: oklch(98% 0.006 255); font-size: 20px; }
.version-list { list-style: none; margin: 22px 0 0; padding: 0; }
.version-list li { display: grid; gap: 12px; grid-template-columns: 34px minmax(0, 1fr); padding-bottom: 18px; position: relative; }
.version-list li::before { background: oklch(42% 0.08 258); bottom: -2px; content: ""; left: 15px; position: absolute; top: 30px; width: 1px; }
.version-list li:last-child { padding-bottom: 0; }
.version-list li:last-child::before { display: none; }
.version-list span { align-items: center; background: oklch(36% 0.12 258); border-radius: 999px; color: oklch(96% 0.012 255); display: flex; font-size: 10px; font-weight: 900; height: 31px; justify-content: center; width: 31px; }
.version-list li.current span { background: oklch(62% 0.19 258); }
.version-list strong { color: oklch(98% 0.006 255); display: block; font-size: 13px; line-height: 1.25; }
.version-list small { color: oklch(76% 0.035 255); display: block; font-size: 11px; font-weight: 700; margin-top: 3px; }
.summary-band, .three-column-stats { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin: 12px 0 18px; }
.stat { background: oklch(98% 0.006 255); border: 1px solid oklch(88% 0.012 255); border-radius: 8px; padding: 10px 12px; }
.stat span { color: oklch(53% 0.035 255); display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; }
.stat strong { color: oklch(27% 0.04 255); display: block; font-size: 18px; margin-top: 3px; }
.badge { border-radius: 999px; display: inline-block; font-size: 10px; font-weight: 800; padding: 2px 7px; text-transform: uppercase; white-space: nowrap; }
.badge.critical, .badge.danger { background: oklch(95% 0.045 18); color: oklch(55% 0.2 18); }
.badge.high { background: oklch(95% 0.055 55); color: oklch(58% 0.16 55); }
.badge.medium, .badge.warning { background: oklch(96% 0.045 88); color: oklch(45% 0.11 88); }
.badge.low, .badge.success { background: oklch(94% 0.04 155); color: oklch(40% 0.12 155); }
.source-chip { border-radius: 999px; display: inline-block; font-size: 10px; font-weight: 900; padding: 6px 10px; text-align: center; text-transform: uppercase; white-space: nowrap; }
.source-chip--m365 { background: oklch(93% 0.04 258); color: oklch(50% 0.19 258); }
.source-chip--business, .source-chip--evidence { background: oklch(94% 0.04 155); color: oklch(43% 0.13 155); }
.source-chip--missing, .source-chip--jurisdiction { background: oklch(92% 0.01 255); color: oklch(48% 0.035 255); }
.gap-list { margin: 0; padding-left: 18px; }
.gap-list li { margin-bottom: 7px; }
.source-list { columns: 2; list-style: none; margin: 0; padding: 0; }
.source-list li { break-inside: avoid; margin-bottom: 6px; }
.empty { color: oklch(53% 0.035 255); font-style: italic; }
.fine-box { background: oklch(96% 0.025 250); border-color: oklch(78% 0.06 250); margin: 18px 0; }
.fine-box h2 { margin-top: 0; }
.calibration-box, .verified-box { background: oklch(99% 0.004 255); border: 1px solid oklch(84% 0.022 255); border-radius: 8px; margin: 18px 0; padding: 16px; }
.calibration-box h2:first-child, .verified-box h2:first-child { margin-top: 0; }
.report-footer { border-top: 1px solid oklch(86% 0.018 255); color: oklch(53% 0.035 255); display: grid; gap: 6px; grid-template-columns: 1fr auto auto; margin-top: 26px; padding-top: 10px; }
@page { margin: 18mm 13mm 20mm; }
`;
