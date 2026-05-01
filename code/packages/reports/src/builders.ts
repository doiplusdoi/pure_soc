import { resolveLegalCaveatMessage, resolvePureSocLocale } from "@puresoc/shared";

import type {
  InternalReadinessReport,
  ReportControlResultSummary,
  ReportEvidenceSummary,
  ReportGapSummary,
  ReportReadinessPlanSummary,
  ReportRecommendationSummary,
  ReportSourceReference,
  RomaniaNotificationDraftExport
} from "./report.types";

export interface StoredAnalysisControlResult {
  organizationId: string;
  assessmentId: string;
  controlId: string;
  controlCode?: string;
  jurisdiction: string;
  status: string;
  confidence: string;
  summary: string;
  evidenceArtifactIds?: string[];
  providerSignalIds?: string[];
  evidenceCompleteness?: {
    required: number;
    present: number;
    missing: number;
    ratio: number;
  };
  sourceReferences?: ReportSourceReferenceLike[];
}

export interface StoredAnalysisGap {
  organizationId: string;
  assessmentId: string;
  controlId: string;
  controlCode?: string;
  jurisdiction: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  missingEvidence?: string[];
  recommendedActions?: string[];
  sourceReferences?: ReportSourceReferenceLike[];
}

export interface StoredAnalysisRecommendation {
  id: string;
  organizationId: string;
  controlId: string;
  jurisdiction: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  evidenceRequired: boolean;
  sourceReferences?: ReportSourceReferenceLike[];
}

export interface StoredAnalysisReadinessPlan {
  id: string;
  organizationId: string;
  assessmentId: string;
  title: string;
  targetReadinessPercent: number;
  status: string;
  items: Array<{
    id: string;
    organizationId: string;
    controlId?: string;
    jurisdiction: string;
    recommendedAction: string;
    actionType: string;
    evidenceRequired: boolean;
    legalReviewRequired: boolean;
    status: string;
    sourceReferences?: ReportSourceReferenceLike[];
  }>;
}

export interface StoredAnalysisEvidenceArtifact {
  id: string;
  organizationId: string;
  title: string;
  sourceType: string;
  controlId?: string;
  jurisdiction?: string;
  contentHashSha256: string;
  mimeType: string;
  scanStatus?: string;
  createdAt: string;
  linkedSourceRecordId?: string;
}

export interface ReportSourceReferenceLike {
  sourceRecordId?: string;
  title?: string;
  jurisdiction?: string;
  sourceUrl?: string;
  sourceVersion?: string;
  article?: string;
  paragraph?: string;
  annex?: string;
  nationalReference?: string;
  sourceLocation?: string;
  fieldKey?: string;
  label?: string;
}

export interface BuildInternalReadinessReportInput {
  organizationId: string;
  assessmentId: string;
  jurisdiction: string;
  generatedAt?: string;
  locale?: string | null;
  catalogVersion?: string;
  analysisRecordedAt?: string;
  controlResults: readonly StoredAnalysisControlResult[];
  gaps: readonly StoredAnalysisGap[];
  recommendations?: readonly StoredAnalysisRecommendation[];
  readinessPlan?: StoredAnalysisReadinessPlan;
  evidence?: readonly StoredAnalysisEvidenceArtifact[];
}

export interface StoredRomaniaNotificationDraftInput {
  organizationId: string;
  assessmentId?: string;
  status: "draft" | "ready_for_review" | "exported" | "superseded";
  payload: Record<string, unknown>;
  sourceMappedFields: Array<{
    fieldKey: string;
    value: unknown;
    sourceReferences: readonly ReportSourceReferenceLike[];
  }>;
  sourceReferences?: readonly ReportSourceReferenceLike[];
  classificationRunId?: string;
  onboardingProgressId?: string;
  notificationDraftId?: string;
  generatedAt?: string;
  locale?: string | null;
}

export const buildInternalReadinessReport = (
  input: BuildInternalReadinessReportInput
): InternalReadinessReport => {
  assertTenantBoundary(input.organizationId, [
    ...input.controlResults,
    ...input.gaps,
    ...(input.recommendations ?? []),
    ...(input.evidence ?? []),
    ...(input.readinessPlan ? [input.readinessPlan, ...input.readinessPlan.items] : [])
  ]);

  const controlResults = input.controlResults.map(toControlResultSummary);
  const gaps = input.gaps.map(toGapSummary);
  const recommendations = (input.recommendations ?? []).map(toRecommendationSummary);
  const readinessPlan = input.readinessPlan ? toReadinessPlanSummary(input.readinessPlan) : undefined;
  const evidence = (input.evidence ?? []).map(toEvidenceSummary);
  const locale = resolvePureSocLocale(input.locale).locale;
  const legalCaveat = resolveLegalCaveatMessage(input.locale);
  const sourceReferences = uniqueSourceReferences([
    ...controlResults.flatMap((result) => result.sourceReferences),
    ...gaps.flatMap((gap) => gap.sourceReferences),
    ...recommendations.flatMap((recommendation) => recommendation.sourceReferences ?? []),
    ...(readinessPlan?.items.flatMap((item) => item.sourceReferences) ?? []),
    ...evidence.flatMap((artifact) =>
      artifact.linkedSourceRecordId
        ? [
            normalizeSourceReference({
              sourceRecordId: artifact.linkedSourceRecordId,
              title: artifact.title,
              jurisdiction: artifact.jurisdiction ?? input.jurisdiction
            })
          ]
        : []
    )
  ]);

  return stripUndefined({
    schemaVersion: "puresoc.report.internal_readiness.v1",
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    jurisdiction: input.jurisdiction,
    reportType: "internal_readiness",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    legalCaveat: legalCaveat.text,
    legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
    legalCaveatLocale: legalCaveat.resolvedLocale,
    legalCaveatMessageKey: legalCaveat.messageKey,
    locale,
    sourceReferences,
    controlResults,
    gaps,
    recommendations,
    readinessPlan,
    evidence,
    provenance: stripUndefined({
      source: "stored_analysis",
      catalogVersion: input.catalogVersion,
      analysisRecordedAt: input.analysisRecordedAt
    })
  }) as InternalReadinessReport;
};

export const buildRomaniaNotificationDraftExport = (
  input: StoredRomaniaNotificationDraftInput
): RomaniaNotificationDraftExport => {
  const locale = resolvePureSocLocale(input.locale).locale;
  const legalCaveat = resolveLegalCaveatMessage(input.locale);
  const sourceMappedFields = input.sourceMappedFields.map((field) => ({
    fieldKey: field.fieldKey,
    value: field.value,
    sourceReferences: uniqueSourceReferences(field.sourceReferences)
  }));
  const sourceReferences = uniqueSourceReferences([
    ...(input.sourceReferences ?? []),
    ...sourceMappedFields.flatMap((field) =>
      field.sourceReferences.map((reference) => ({
        ...reference,
        fieldKey: reference.fieldKey ?? field.fieldKey
      }))
    )
  ]);

  return stripUndefined({
    schemaVersion: "puresoc.export.ro_notification_draft.v1",
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    jurisdiction: "RO",
    reportType: "romania_notification_draft",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    legalCaveat: legalCaveat.text,
    legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
    legalCaveatLocale: legalCaveat.resolvedLocale,
    legalCaveatMessageKey: legalCaveat.messageKey,
    locale,
    status: input.status,
    payload: stableClone(input.payload),
    sourceMappedFields,
    sourceReferences,
    provenance: stripUndefined({
      source: "stored_analysis",
      classificationRunId: input.classificationRunId,
      onboardingProgressId: input.onboardingProgressId,
      notificationDraftId: input.notificationDraftId
    })
  }) as RomaniaNotificationDraftExport;
};

export const stableJsonExport = (value: unknown): string => `${JSON.stringify(stableClone(value), null, 2)}\n`;

export const stableClone = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableClone);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, stableClone(entryValue)])
    );
  }

  return value;
};

const toControlResultSummary = (result: StoredAnalysisControlResult): ReportControlResultSummary =>
  stripUndefined({
    controlId: result.controlId,
    controlCode: result.controlCode,
    jurisdiction: result.jurisdiction,
    status: result.status,
    confidence: result.confidence,
    summary: result.summary,
    evidenceArtifactIds: [...(result.evidenceArtifactIds ?? [])].sort(),
    providerSignalIds: [...(result.providerSignalIds ?? [])].sort(),
    evidenceCompleteness: result.evidenceCompleteness,
    sourceReferences: uniqueSourceReferences(result.sourceReferences ?? [])
  }) as ReportControlResultSummary;

const toGapSummary = (gap: StoredAnalysisGap): ReportGapSummary =>
  stripUndefined({
    controlId: gap.controlId,
    controlCode: gap.controlCode,
    jurisdiction: gap.jurisdiction,
    severity: gap.severity,
    summary: gap.summary,
    missingEvidence: [...(gap.missingEvidence ?? [])].sort(),
    recommendedActions: [...(gap.recommendedActions ?? [])],
    sourceReferences: uniqueSourceReferences(gap.sourceReferences ?? [])
  }) as ReportGapSummary;

const toRecommendationSummary = (recommendation: StoredAnalysisRecommendation): ReportRecommendationSummary => ({
  controlId: recommendation.controlId,
  jurisdiction: recommendation.jurisdiction,
  title: recommendation.title,
  severity: recommendation.severity,
  summary: recommendation.summary,
  requiredEvidence: recommendation.evidenceRequired,
  sourceReferences: uniqueSourceReferences(recommendation.sourceReferences ?? [])
});

const toReadinessPlanSummary = (plan: StoredAnalysisReadinessPlan): ReportReadinessPlanSummary => ({
  id: plan.id,
  title: plan.title,
  targetReadinessPercent: plan.targetReadinessPercent,
  status: plan.status,
  items: plan.items.map((item) =>
    stripUndefined({
      id: item.id,
      controlId: item.controlId,
      jurisdiction: item.jurisdiction,
      recommendedAction: item.recommendedAction,
      actionType: item.actionType,
      evidenceRequired: item.evidenceRequired,
      legalReviewRequired: item.legalReviewRequired,
      status: item.status,
      sourceReferences: uniqueSourceReferences(item.sourceReferences ?? [])
    })
  ) as ReportReadinessPlanSummary["items"]
});

const toEvidenceSummary = (artifact: StoredAnalysisEvidenceArtifact): ReportEvidenceSummary =>
  stripUndefined({
    id: artifact.id,
    title: artifact.title,
    sourceType: artifact.sourceType,
    controlId: artifact.controlId,
    jurisdiction: artifact.jurisdiction,
    contentHashSha256: artifact.contentHashSha256,
    mimeType: artifact.mimeType,
    scanStatus: artifact.scanStatus,
    createdAt: artifact.createdAt,
    linkedSourceRecordId: artifact.linkedSourceRecordId
  }) as ReportEvidenceSummary;

const uniqueSourceReferences = (references: readonly ReportSourceReferenceLike[]): ReportSourceReference[] => {
  const byKey = new Map<string, ReportSourceReference>();

  for (const reference of references) {
    if (!reference.sourceRecordId) {
      continue;
    }

    const normalized = normalizeSourceReference(reference);
    const key = [
      normalized.sourceRecordId,
      normalized.jurisdiction,
      normalized.article ?? "",
      normalized.paragraph ?? "",
      normalized.sourceVersion ?? "",
      normalized.sourceLocation ?? "",
      normalized.fieldKey ?? ""
    ].join(":");
    byKey.set(key, normalized);
  }

  return [...byKey.values()].sort((left, right) =>
    [left.jurisdiction, left.sourceRecordId, left.fieldKey ?? "", left.article ?? ""]
      .join(":")
      .localeCompare([right.jurisdiction, right.sourceRecordId, right.fieldKey ?? "", right.article ?? ""].join(":"))
  );
};

const normalizeSourceReference = (reference: ReportSourceReferenceLike): ReportSourceReference =>
  stripUndefined({
    sourceRecordId: reference.sourceRecordId ?? "unknown_source",
    title: reference.title ?? reference.label,
    jurisdiction: reference.jurisdiction ?? "EU",
    sourceUrl: reference.sourceUrl,
    sourceVersion: reference.sourceVersion,
    article: reference.article,
    paragraph: reference.paragraph,
    annex: reference.annex,
    nationalReference: reference.nationalReference,
    sourceLocation: reference.sourceLocation,
    fieldKey: reference.fieldKey,
    label: reference.label
  }) as ReportSourceReference;

const assertTenantBoundary = (organizationId: string, records: readonly { organizationId?: string }[]): void => {
  const crossTenantRecord = records.find((record) => record.organizationId && record.organizationId !== organizationId);
  if (crossTenantRecord) {
    throw new Error("Report input contains records from another organization.");
  }
};

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
