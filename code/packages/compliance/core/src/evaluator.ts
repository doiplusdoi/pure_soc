import type { ProviderFindingForCompliance } from "@puresoc/shared";

import { uniqueSourceReferences } from "./control-catalog";
import type {
  ChecklistState,
  ComplianceControl,
  ComplianceControlResult,
  ComplianceStatus,
  Confidence,
  CountryPackWarning,
  EvidenceArtifactState,
  EvidenceCompleteness,
  EvidenceRequirement,
  ManualChecklistItemState,
  ProviderControlMapping,
  ProviderSignalSummary,
  SourceReference
} from "./types";

export interface ComplianceEvaluationInput {
  organizationId: string;
  assessmentId: string;
  jurisdiction?: string;
  controls: readonly ComplianceControl[];
  providerFindings?: readonly ProviderFindingForCompliance[];
  evidenceArtifacts?: readonly EvidenceArtifactState[];
  manualTasks?: readonly ManualChecklistItemState[];
  countryPackWarnings?: readonly CountryPackWarning[];
  acceptedRiskControlIds?: readonly string[];
  notApplicableControlIds?: readonly string[];
  evaluatedAt?: string;
}

export interface CountryPackWarningInput {
  countryCode: string;
  completeness?: string;
  countryPackStatus?: string;
  unsupportedFeatures?: readonly {
    featureKey: string;
    reason: string;
  }[];
  sourceReferences?: readonly SourceReference[];
}

const completeManualStates = new Set<ChecklistState>(["completed", "evidence_attached", "approved"]);

export const countryPackWarningsFromStatus = (input: CountryPackWarningInput): CountryPackWarning[] => {
  const warnings = (input.unsupportedFeatures ?? []).map((feature) => ({
    countryCode: input.countryCode,
    featureKey: feature.featureKey,
    reason: feature.reason,
    sourceReferences: uniqueSourceReferences(input.sourceReferences ?? [])
  }));

  if (
    warnings.length === 0 &&
    input.completeness &&
    input.completeness !== "full_pack_ready"
  ) {
    warnings.push({
      countryCode: input.countryCode,
      featureKey: input.countryPackStatus ?? input.completeness,
      reason: `Country pack ${input.countryCode} is ${input.completeness}; national details may be incomplete.`,
      sourceReferences: uniqueSourceReferences(input.sourceReferences ?? [])
    });
  }

  return warnings;
};

export const evaluateComplianceControls = (input: ComplianceEvaluationInput): ComplianceControlResult[] => {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const acceptedRisks = new Set(input.acceptedRiskControlIds ?? []);
  const notApplicable = new Set(input.notApplicableControlIds ?? []);
  const providerFindings = input.providerFindings ?? [];
  const evidenceArtifacts = input.evidenceArtifacts ?? [];
  const manualTasks = input.manualTasks ?? [];
  const countryPackWarnings = input.countryPackWarnings ?? [];

  return input.controls.map((control) => {
    const matchedFindings = providerFindings.filter((finding) => control.providerMappings.some((mapping) => matchesFinding(mapping, finding)));
    const signalSummaries = matchedFindings.map(providerSignalSummary);
    const controlEvidence = evidenceArtifacts.filter(
      (artifact) => artifact.controlId === control.id || artifact.controlId === control.code
    );
    const missingEvidence = control.evidenceRequired.filter(
      (requirement) => !hasEvidenceForRequirement(controlEvidence, requirement)
    );
    const evidenceCompleteness = calculateEvidenceCompleteness(control.evidenceRequired, missingEvidence);
    const controlManualTasks = manualTasks.filter((task) => task.controlId === control.id);
    const incompleteManualTasks = controlManualTasks.filter((task) => !completeManualStates.has(task.status));
    const implicitManualMissing = control.manualChecklistTemplateIds.length > 0 && controlManualTasks.length === 0;
    const providerSignalPending =
      control.providerMappings.length > 0 && matchedFindings.length === 0 && !hasCompletedManualSatisfaction(controlManualTasks);
    const status = resolveStatus({
      control,
      matchedFindings,
      missingEvidence,
      incompleteManualTasks,
      implicitManualMissing,
      providerSignalPending,
      countryPackWarnings,
      accepted: acceptedRisks.has(control.id),
      notApplicable: notApplicable.has(control.id)
    });
    const confidence = resolveConfidence(status, matchedFindings, countryPackWarnings, providerSignalPending);

    return {
      id: [input.assessmentId, control.id, input.jurisdiction ?? control.jurisdiction].join(":"),
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      controlId: control.id,
      controlCode: control.code,
      jurisdiction: input.jurisdiction ?? control.jurisdiction,
      status,
      confidence,
      providerSignalIds: signalSummaries.map((signal) => signal.id),
      evidenceArtifactIds: controlEvidence.map((artifact) => artifact.id),
      checklistRunItemIds: controlManualTasks.map((task) => task.id),
      summary: summarizeControlResult(control, status, {
        matchedFindings: signalSummaries,
        missingEvidence,
        incompleteManualTasks,
        implicitManualMissing,
        providerSignalPending,
        countryPackWarnings
      }),
      matchedFindings: signalSummaries,
      missingEvidence,
      manualTasks: implicitManualMissing ? buildImplicitManualTasks(input, control) : incompleteManualTasks,
      countryPackWarnings: [...countryPackWarnings],
      sourceReferences: uniqueSourceReferences([
        ...control.sourceReferences,
        ...missingEvidence.flatMap((requirement) => requirement.sourceReferences),
        ...countryPackWarnings.flatMap((warning) => warning.sourceReferences)
      ]),
      evidenceCompleteness,
      evaluatedAt
    };
  });
};

const matchesFinding = (mapping: ProviderControlMapping, finding: ProviderFindingForCompliance): boolean => {
  if (mapping.providerKey !== finding.providerKey || mapping.moduleKey !== finding.moduleKey) {
    return false;
  }

  const signalKeys = providerFindingSignalKeys(finding);
  return mapping.signalKeys.some((signalKey) => signalKeys.has(signalKey));
};

const providerFindingSignalKeys = (finding: ProviderFindingForCompliance): Set<string> => {
  const keys = new Set<string>([finding.findingKey]);
  const evidence = finding.evidence;
  const signalKey = evidence.signalKey;
  const signalKeys = evidence.signalKeys;

  if (typeof signalKey === "string") {
    keys.add(signalKey);
  }

  if (Array.isArray(signalKeys)) {
    for (const value of signalKeys) {
      if (typeof value === "string") {
        keys.add(value);
      }
    }
  }

  return keys;
};

const providerSignalSummary = (finding: ProviderFindingForCompliance): ProviderSignalSummary => ({
  id: finding.id,
  providerKey: finding.providerKey,
  moduleKey: finding.moduleKey,
  findingKey: finding.findingKey,
  title: finding.title,
  summary: finding.summary,
  severity: finding.severity,
  evidence: finding.evidence
});

const hasEvidenceForRequirement = (
  evidenceArtifacts: readonly EvidenceArtifactState[],
  requirement: EvidenceRequirement
): boolean =>
  evidenceArtifacts.some(
    (artifact) => artifact.requirementKey === requirement.requirementKey || artifact.title === requirement.title
  );

const calculateEvidenceCompleteness = (
  requirements: readonly EvidenceRequirement[],
  missingEvidence: readonly EvidenceRequirement[]
): EvidenceCompleteness => {
  const required = requirements.length;
  const missing = missingEvidence.length;
  const present = required - missing;

  return {
    required,
    present,
    missing,
    ratio: required === 0 ? 1 : present / required
  };
};

const hasCompletedManualSatisfaction = (manualTasks: readonly ManualChecklistItemState[]): boolean =>
  manualTasks.length > 0 && manualTasks.every((task) => completeManualStates.has(task.status));

const resolveStatus = (input: {
  control: ComplianceControl;
  matchedFindings: readonly ProviderFindingForCompliance[];
  missingEvidence: readonly EvidenceRequirement[];
  incompleteManualTasks: readonly ManualChecklistItemState[];
  implicitManualMissing: boolean;
  providerSignalPending: boolean;
  countryPackWarnings: readonly CountryPackWarning[];
  accepted: boolean;
  notApplicable: boolean;
}): ComplianceStatus => {
  if (input.notApplicable) {
    return "not_applicable";
  }

  if (input.accepted) {
    return "accepted_risk";
  }

  if (input.matchedFindings.some((finding) => finding.status === "open" && finding.severity !== "informational")) {
    return "failing";
  }

  if (input.missingEvidence.length > 0) {
    return "needs_evidence";
  }

  if (input.incompleteManualTasks.length > 0 || input.implicitManualMissing) {
    return "partial";
  }

  if (input.countryPackWarnings.length > 0) {
    return "partial";
  }

  if (input.providerSignalPending) {
    return "partial";
  }

  if (input.control.providerMappings.length > 0 || input.control.evidenceRequired.length > 0) {
    return "passing";
  }

  return "not_started";
};

const resolveConfidence = (
  status: ComplianceStatus,
  matchedFindings: readonly ProviderFindingForCompliance[],
  countryPackWarnings: readonly CountryPackWarning[],
  providerSignalPending: boolean
): Confidence => {
  if (countryPackWarnings.length > 0 && matchedFindings.length === 0) {
    return "low";
  }

  if (providerSignalPending) {
    return "low";
  }

  if (status === "failing" && matchedFindings.length > 0) {
    return "high";
  }

  if (status === "passing") {
    return "medium";
  }

  return "medium";
};

const summarizeControlResult = (
  control: ComplianceControl,
  status: ComplianceStatus,
  context: {
    matchedFindings: readonly ProviderSignalSummary[];
    missingEvidence: readonly EvidenceRequirement[];
    incompleteManualTasks: readonly ManualChecklistItemState[];
    implicitManualMissing: boolean;
    providerSignalPending: boolean;
    countryPackWarnings: readonly CountryPackWarning[];
  }
): string => {
  if (status === "failing") {
    return `${control.title} has open provider-neutral findings and needs internal readiness work.`;
  }

  if (status === "needs_evidence") {
    return `${control.title} needs evidence before it can be treated as internally ready.`;
  }

  if (status === "partial" && context.countryPackWarnings.length > 0 && context.matchedFindings.length === 0) {
    return `${control.title} has country-pack warnings that require review, but no technical failure was inferred.`;
  }

  if (status === "partial" && context.providerSignalPending) {
    return `${control.title} needs a mapped provider signal or completed manual fallback before it can be treated as internally ready.`;
  }

  if (status === "partial" || context.implicitManualMissing || context.incompleteManualTasks.length > 0) {
    return `${control.title} has manual checklist work still open.`;
  }

  if (status === "passing") {
    return `${control.title} has no open mapped findings in the current internal readiness inputs.`;
  }

  return `${control.title} is ${status.replace("_", " ")} in the current internal readiness assessment.`;
};

const buildImplicitManualTasks = (
  input: ComplianceEvaluationInput,
  control: ComplianceControl
): ManualChecklistItemState[] => [
  {
    id: [input.assessmentId, control.id, "manual-checklist-not-generated"].join(":"),
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    controlId: control.id,
    templateId: control.manualChecklistTemplateIds[0] ?? "manual",
    itemKey: "manual-checklist-not-generated",
    title: "Generate and complete manual checklist",
    status: "task_generated",
    evidenceArtifactIds: [],
    sourceReferences: uniqueSourceReferences(control.sourceReferences)
  }
];
