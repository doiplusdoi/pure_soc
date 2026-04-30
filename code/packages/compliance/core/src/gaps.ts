import { uniqueSourceReferences } from "./control-catalog";
import type {
  ComplianceControlResult,
  ComplianceGap,
  ComplianceStatus,
  FindingSeverity,
  GapSeverity
} from "./types";

export interface CalculateComplianceGapsInput {
  results: readonly ComplianceControlResult[];
}

const nonGapStatuses = new Set<ComplianceStatus>(["passing", "not_applicable", "accepted_risk"]);

const severityRank: Record<FindingSeverity, number> = {
  informational: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export const calculateComplianceGaps = (input: CalculateComplianceGapsInput): ComplianceGap[] =>
  input.results
    .filter((result) => !nonGapStatuses.has(result.status))
    .map((result) => ({
      id: [result.assessmentId, result.controlId, "gap"].join(":"),
      organizationId: result.organizationId,
      assessmentId: result.assessmentId,
      jurisdiction: result.jurisdiction,
      controlId: result.controlId,
      controlCode: result.controlCode,
      status: result.status,
      severity: gapSeverity(result),
      confidence: result.confidence,
      summary: result.summary,
      findingIds: result.matchedFindings.map((finding) => finding.id),
      findings: result.matchedFindings.map((finding) => finding.summary || finding.title),
      missingEvidence: result.missingEvidence.map((requirement) => requirement.title),
      recommendedActions: recommendedActionsForResult(result),
      providerSignals: result.matchedFindings.map((finding) => finding.findingKey),
      manualTaskIds: result.manualTasks.map((task) => task.id),
      manualTasks: result.manualTasks.map((task) => `${task.title} (${task.status})`),
      countryPackWarnings: result.countryPackWarnings.map((warning) => warning.reason),
      sourceReferences: uniqueSourceReferences(result.sourceReferences)
    }));

const gapSeverity = (result: ComplianceControlResult): GapSeverity => {
  const highestFinding = result.matchedFindings
    .map((finding) => finding.severity)
    .sort((left, right) => severityRank[right] - severityRank[left])[0];

  if (highestFinding && highestFinding !== "informational") {
    return highestFinding;
  }

  if (result.status === "needs_evidence") {
    return "medium";
  }

  if (result.status === "unsupported") {
    return "low";
  }

  if (result.countryPackWarnings.length > 0 && result.manualTasks.length === 0) {
    return "low";
  }

  return "medium";
};

const recommendedActionsForResult = (result: ComplianceControlResult): string[] => {
  const actions: string[] = [];

  for (const finding of result.matchedFindings) {
    actions.push(`Resolve provider-neutral finding: ${finding.title}`);
  }

  for (const evidence of result.missingEvidence) {
    actions.push(`Upload or link evidence: ${evidence.title}`);
  }

  for (const task of result.manualTasks) {
    actions.push(`Complete manual checklist item: ${task.title}`);
  }

  for (const warning of result.countryPackWarnings) {
    actions.push(`Review country-pack warning: ${warning.reason}`);
  }

  return actions.length > 0 ? actions : ["Review the control and record an internal readiness decision."];
};
