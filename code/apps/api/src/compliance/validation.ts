import { AuthError } from "@puresoc/auth-core";
import type {
  ChecklistState,
  ComplianceGap,
  ComplianceStatus,
  Confidence,
  EvidenceArtifactState,
  GapSeverity,
  ManualChecklistItemState,
  SourceReference
} from "@puresoc/compliance-core";

export interface ParsedComplianceEvaluationBody {
  assessmentId: string;
  providerConnectionId?: string;
  jurisdiction?: string;
  evidenceArtifacts?: EvidenceArtifactState[];
  manualTasks?: ManualChecklistItemState[];
  countryPack?: {
    countryCode: string;
    completeness?: string;
    countryPackStatus?: string;
    unsupportedFeatures?: Array<{ featureKey: string; reason: string }>;
    sourceReferences?: SourceReference[];
  };
}

const complianceStatuses = new Set<ComplianceStatus>([
  "not_started",
  "not_applicable",
  "passing",
  "failing",
  "partial",
  "unsupported",
  "needs_evidence",
  "accepted_risk"
]);

const checklistStates = new Set<ChecklistState>([
  "template_created",
  "task_generated",
  "assigned",
  "in_progress",
  "blocked",
  "completed",
  "evidence_required",
  "evidence_attached",
  "approved",
  "overdue",
  "requires_legal_review"
]);

const countryPackCompletenessValues = new Set([
  "baseline_only",
  "planned_full_pack",
  "official_sources_identified",
  "registration_rules_partial",
  "classification_rules_partial",
  "incident_rules_partial",
  "full_pack_ready",
  "requires_legal_review",
  "deprecated"
]);

const gapSeverities = new Set<GapSeverity>(["low", "medium", "high", "critical"]);
const confidenceValues = new Set<Confidence>(["low", "medium", "high"]);

export const parseComplianceEvaluationBody = (
  body: Record<string, unknown>,
  organizationId: string
): ParsedComplianceEvaluationBody => {
  const assessmentId = optionalString(body, "assessmentId") ?? `${organizationId}:nis2:assessment`;

  return {
    assessmentId,
    providerConnectionId: optionalString(body, "providerConnectionId"),
    jurisdiction: optionalString(body, "jurisdiction"),
    evidenceArtifacts: parseOptionalArray(body.evidenceArtifacts, "evidenceArtifacts", parseEvidenceArtifact),
    manualTasks: parseOptionalArray(body.manualTasks, "manualTasks", (value, path) =>
      parseManualTask(value, path, organizationId, assessmentId)
    ),
    countryPack: parseCountryPack(body.countryPack)
  };
};

export const parseComplianceGaps = (value: unknown, organizationId: string): ComplianceGap[] => {
  if (!Array.isArray(value)) {
    throw invalid("gaps must be an array.");
  }

  return value.map((entry, index) => parseComplianceGap(entry, `gaps[${index}]`, organizationId));
};

const parseComplianceGap = (value: unknown, path: string, organizationId: string): ComplianceGap => {
  const record = requireRecord(value, path);
  const gapOrganizationId = requiredString(record, `${path}.organizationId`);

  if (gapOrganizationId !== organizationId) {
    throw invalid(`${path}.organizationId must match the route organization.`);
  }

  const status = requiredEnum(record, `${path}.status`, complianceStatuses);
  const severity = requiredEnum(record, `${path}.severity`, gapSeverities);
  const confidence = requiredEnum(record, `${path}.confidence`, confidenceValues);

  return {
    id: requiredString(record, `${path}.id`),
    organizationId: gapOrganizationId,
    assessmentId: requiredString(record, `${path}.assessmentId`),
    jurisdiction: requiredString(record, `${path}.jurisdiction`),
    controlId: requiredString(record, `${path}.controlId`),
    controlCode: requiredString(record, `${path}.controlCode`),
    status,
    severity,
    confidence,
    summary: requiredString(record, `${path}.summary`),
    findingIds: parseOptionalStringArray(record.findingIds, `${path}.findingIds`),
    findings: parseOptionalStringArray(record.findings, `${path}.findings`),
    missingEvidence: parseOptionalStringArray(record.missingEvidence, `${path}.missingEvidence`),
    recommendedActions: parseOptionalStringArray(record.recommendedActions, `${path}.recommendedActions`),
    providerSignals: parseOptionalStringArray(record.providerSignals, `${path}.providerSignals`),
    manualTaskIds: parseOptionalStringArray(record.manualTaskIds, `${path}.manualTaskIds`),
    manualTasks: parseOptionalStringArray(record.manualTasks, `${path}.manualTasks`),
    countryPackWarnings: parseOptionalStringArray(record.countryPackWarnings, `${path}.countryPackWarnings`),
    sourceReferences: parseOptionalArray(record.sourceReferences, `${path}.sourceReferences`, parseSourceReference) ?? []
  };
};

const parseEvidenceArtifact = (value: unknown, path: string): EvidenceArtifactState => {
  const record = requireRecord(value, path);

  return {
    id: requiredString(record, `${path}.id`),
    controlId: optionalString(record, "controlId", `${path}.controlId`),
    requirementKey: optionalString(record, "requirementKey", `${path}.requirementKey`),
    jurisdiction: optionalString(record, "jurisdiction", `${path}.jurisdiction`),
    title: optionalString(record, "title", `${path}.title`),
    sourceReferences: parseOptionalArray(record.sourceReferences, `${path}.sourceReferences`, parseSourceReference)
  };
};

const parseManualTask = (
  value: unknown,
  path: string,
  organizationId: string,
  assessmentId: string
): ManualChecklistItemState => {
  const record = requireRecord(value, path);
  const taskOrganizationId = requiredString(record, `${path}.organizationId`);
  const taskAssessmentId = requiredString(record, `${path}.assessmentId`);

  if (taskOrganizationId !== organizationId) {
    throw invalid(`${path}.organizationId must match the route organization.`);
  }

  if (taskAssessmentId !== assessmentId) {
    throw invalid(`${path}.assessmentId must match the evaluation assessmentId.`);
  }

  return {
    id: requiredString(record, `${path}.id`),
    organizationId: taskOrganizationId,
    assessmentId: taskAssessmentId,
    controlId: requiredString(record, `${path}.controlId`),
    templateId: requiredString(record, `${path}.templateId`),
    itemKey: requiredString(record, `${path}.itemKey`),
    title: requiredString(record, `${path}.title`),
    description: optionalString(record, "description", `${path}.description`),
    status: requiredEnum(record, `${path}.status`, checklistStates),
    ownerUserId: optionalString(record, "ownerUserId", `${path}.ownerUserId`),
    evidenceArtifactIds: parseOptionalStringArray(record.evidenceArtifactIds, `${path}.evidenceArtifactIds`),
    sourceReferences: parseOptionalArray(record.sourceReferences, `${path}.sourceReferences`, parseSourceReference) ?? []
  };
};

const parseCountryPack = (value: unknown): ParsedComplianceEvaluationBody["countryPack"] => {
  if (value === undefined) {
    return undefined;
  }

  const record = requireRecord(value, "countryPack");
  const completeness = optionalString(record, "completeness", "countryPack.completeness");

  if (completeness && !countryPackCompletenessValues.has(completeness)) {
    throw invalid("countryPack.completeness is not a supported country-pack completeness value.");
  }

  return {
    countryCode: requiredString(record, "countryPack.countryCode"),
    completeness,
    countryPackStatus: optionalString(record, "countryPackStatus", "countryPack.countryPackStatus"),
    unsupportedFeatures: parseOptionalArray(
      record.unsupportedFeatures,
      "countryPack.unsupportedFeatures",
      parseUnsupportedFeature
    ),
    sourceReferences: parseOptionalArray(record.sourceReferences, "countryPack.sourceReferences", parseSourceReference)
  };
};

const parseUnsupportedFeature = (value: unknown, path: string): { featureKey: string; reason: string } => {
  const record = requireRecord(value, path);

  return {
    featureKey: requiredString(record, `${path}.featureKey`),
    reason: requiredString(record, `${path}.reason`)
  };
};

const parseSourceReference = (value: unknown, path: string): SourceReference => {
  const record = requireRecord(value, path);

  return {
    sourceRecordId: requiredString(record, `${path}.sourceRecordId`),
    article: optionalString(record, "article", `${path}.article`),
    paragraph: optionalString(record, "paragraph", `${path}.paragraph`),
    annex: optionalString(record, "annex", `${path}.annex`),
    nationalReference: optionalString(record, "nationalReference", `${path}.nationalReference`),
    sourceUrl: optionalString(record, "sourceUrl", `${path}.sourceUrl`),
    sourceVersion: optionalString(record, "sourceVersion", `${path}.sourceVersion`),
    label: optionalString(record, "label", `${path}.label`)
  };
};

const parseOptionalArray = <T>(
  value: unknown,
  path: string,
  parser: (entry: unknown, path: string) => T
): T[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw invalid(`${path} must be an array when provided.`);
  }

  return value.map((entry, index) => parser(entry, `${path}[${index}]`));
};

const parseOptionalStringArray = (value: unknown, path: string): string[] => {
  const parsed = parseOptionalArray(value, path, (entry, entryPath) => {
    if (typeof entry !== "string" || entry.length === 0) {
      throw invalid(`${entryPath} must be a non-empty string.`);
    }

    return entry;
  });

  return parsed ?? [];
};

const requiredEnum = <T extends string>(record: Record<string, unknown>, path: string, allowed: Set<T>): T => {
  const value = getPathValue(record, path);

  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw invalid(`${path} is not supported.`);
  }

  return value as T;
};

const requiredString = (record: Record<string, unknown>, path: string): string => {
  const value = getPathValue(record, path);

  if (typeof value !== "string" || value.length === 0) {
    throw invalid(`${path} must be a non-empty string.`);
  }

  return value;
};

const optionalString = (record: Record<string, unknown>, field: string, path = field): string | undefined => {
  const value = record[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.length === 0) {
    throw invalid(`${path} must be a non-empty string when provided.`);
  }

  return value;
};

const requireRecord = (value: unknown, path: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid(`${path} must be an object.`);
  }

  return value as Record<string, unknown>;
};

const getPathValue = (record: Record<string, unknown>, path: string): unknown => {
  const field = path.split(".").at(-1) ?? path;
  return record[field];
};

const invalid = (message: string): AuthError => new AuthError("invalid_request", message, 400);
