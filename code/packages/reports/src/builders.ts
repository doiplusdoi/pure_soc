import { resolveLegalCaveatMessage, resolvePureSocLocale } from "@puresoc/shared";

import type {
  InternalReadinessCalibrationMetadata,
  InternalReadinessCsvExport,
  InternalReadinessContradiction,
  InternalReadinessReportComparison,
  InternalReadinessReport,
  InternalReadinessReportClassificationSnapshot,
  InternalReadinessReportConcepts,
  InternalReadinessReportTriggerType,
  InternalReadinessVerifiedEvidence,
  InternalReadinessVerifiedObservation,
  InternalReadinessReportVersionMetadata,
  InternalReadinessCsvTableName,
  ReportBranding,
  ReportControlResultSummary,
  ReportEvidenceSummary,
  ReportGapSummary,
  ReportReadinessPlanSummary,
  ReportRecommendationSummary,
  ReportSourceReference,
  RomaniaNotificationDraftExport
} from "./report.types";
import { loadNis2ReadinessCalibrationMetadata } from "./scoring-calibration";

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
  classificationResult?: InternalReadinessReportClassificationSnapshot;
  countryPackVersion?: string;
  analysisRecordedAt?: string;
  methodologyVersion?: string;
  onboardingSchemaVersion?: string;
  previousReportId?: string;
  reportVersion?: 1 | 2;
  rendererVersion?: string;
  triggerType?: InternalReadinessReportTriggerType;
  calibration?: InternalReadinessCalibrationMetadata;
  verifiedEvidence?: BuildInternalReadinessVerifiedEvidenceInput;
  previousReport?: InternalReadinessReport;
  reportBranding?: ReportBranding;
  controlResults: readonly StoredAnalysisControlResult[];
  gaps: readonly StoredAnalysisGap[];
  recommendations?: readonly StoredAnalysisRecommendation[];
  readinessPlan?: StoredAnalysisReadinessPlan;
  evidence?: readonly StoredAnalysisEvidenceArtifact[];
}

export interface BuildInternalReadinessVerifiedEvidenceInput {
  providerKey: string;
  providerConnectionId: string;
  syncRunId?: string;
  generatedAt?: string;
  observations: readonly InternalReadinessVerifiedObservation[];
  unavailableSignals?: readonly InternalReadinessVerifiedObservation[];
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
  reportBranding?: ReportBranding;
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

  const verifiedEvidence = input.verifiedEvidence
    ? buildVerifiedEvidence(input.verifiedEvidence, input.controlResults, {
        generatedAt: input.generatedAt,
        providerKey: input.verifiedEvidence.providerKey,
        providerConnectionId: input.verifiedEvidence.providerConnectionId,
        syncRunId: input.verifiedEvidence.syncRunId
      })
    : undefined;
  const effectiveControlResults = applyVerifiedObservations(input.controlResults, verifiedEvidence?.observations ?? []);
  const controlResults = effectiveControlResults.map(toControlResultSummary);
  const gaps = input.gaps.map(toGapSummary);
  const recommendations = [
    ...(input.recommendations ?? []).map(toRecommendationSummary),
    ...buildVerifiedRecommendations(input, verifiedEvidence?.observations ?? [])
  ];
  const readinessPlan = input.readinessPlan ? toReadinessPlanSummary(input.readinessPlan) : undefined;
  const evidence = (input.evidence ?? []).map(toEvidenceSummary);
  const locale = resolvePureSocLocale(input.locale).locale;
  const legalCaveat = resolveLegalCaveatMessage(input.locale);
  const calibration = input.calibration ?? loadNis2ReadinessCalibrationMetadata();
  const methodologyVersion = input.methodologyVersion ?? "puresoc.readiness.declared.v1";
  const version = buildInternalReadinessReportVersion(input, {
    calibration,
    methodologyVersion,
    recommendationCount: recommendations.length
  });
  const concepts = buildInternalReadinessReportConcepts({
    classificationResult: input.classificationResult,
    controlResults: effectiveControlResults,
    gaps,
    methodologyVersion
  });
  const comparison =
    input.previousReport && input.previousReportId
      ? buildReportComparison({
          previousReportId: input.previousReportId,
          previousReport: input.previousReport,
          currentConcepts: concepts,
          currentControlResults: controlResults,
          previousControlResults: input.previousReport.controlResults,
          observations: verifiedEvidence?.observations ?? [],
          contradictions: verifiedEvidence?.contradictions ?? [],
          recommendations
        })
      : undefined;
  const sourceReferences = uniqueSourceReferences([
    ...controlResults.flatMap((result) => result.sourceReferences),
    ...gaps.flatMap((gap) => gap.sourceReferences),
    ...recommendations.flatMap((recommendation) => recommendation.sourceReferences ?? []),
    ...(readinessPlan?.items.flatMap((item) => item.sourceReferences) ?? []),
    ...calibration.sourceReferences,
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
    legalCaveatFallbackReason: legalCaveat.fallbackReason,
    legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
    legalCaveatLocale: legalCaveat.resolvedLocale,
    legalCaveatMessageKey: legalCaveat.messageKey,
    legalCaveatRequestedLocale: legalCaveat.requestedLocale,
    legalCaveatReviewStatus: legalCaveat.reviewStatus,
    locale,
    reportBranding: normalizeReportBranding(input.reportBranding),
    version,
    concepts,
    calibration,
    sourceReferences,
    controlResults,
    gaps,
    recommendations,
    readinessPlan,
    evidence,
    verifiedEvidence,
    comparison,
    provenance: stripUndefined({
      source: "stored_analysis",
      catalogVersion: input.catalogVersion,
      analysisRecordedAt: input.analysisRecordedAt
    })
  }) as InternalReadinessReport;
};

const buildVerifiedEvidence = (
  input: BuildInternalReadinessVerifiedEvidenceInput,
  declaredControls: readonly StoredAnalysisControlResult[],
  context: {
    generatedAt?: string;
    providerKey: string;
    providerConnectionId: string;
    syncRunId?: string;
  }
): InternalReadinessVerifiedEvidence => {
  const observations = [...input.observations, ...(input.unavailableSignals ?? [])]
    .map((observation) => normalizeVerifiedObservation(observation, context))
    .sort((left, right) => left.id.localeCompare(right.id));
  const declaredByControl = new Map(declaredControls.map((control) => [control.controlId, control]));
  const contradictions = observations
    .filter((observation) => observation.status === "verified_gap")
    .flatMap((observation) => {
      const declared = declaredByControl.get(observation.controlId);
      if (!declared || !isPassingStatus(declared.status)) {
        return [];
      }

      const effectiveStatus = effectiveStatusForObservation(declared.status, observation);
      return [
        stripUndefined({
          id: `contradiction:${observation.id}`,
          controlId: observation.controlId,
          declaredStatus: declared.status,
          declaredSummary: declared.summary,
          verifiedStatus: observation.status,
          verifiedSummary: observation.summary,
          effectiveStatus,
          readinessDelta: roundPercentDelta(readinessValueForStatus(effectiveStatus) - readinessValueForStatus(declared.status)),
          evidenceConfidenceDelta: evidenceConfidenceValueForObservation(observation) - evidenceConfidenceValueForControl(declared),
          provenance: observation.provenance,
          providerKey: observation.providerKey,
          providerConnectionId: observation.providerConnectionId,
          syncRunId: observation.syncRunId,
          moduleKey: observation.moduleKey,
          observedAt: observation.observedAt
        })
      ];
    }) as InternalReadinessContradiction[];

  return {
    providerKey: input.providerKey,
    providerConnectionId: input.providerConnectionId,
    syncRunId: input.syncRunId,
    generatedAt: input.generatedAt ?? context.generatedAt ?? new Date().toISOString(),
    observations,
    contradictions,
    unavailableSignals: observations.filter((observation) => observation.status === "unavailable")
  };
};

const normalizeVerifiedObservation = (
  observation: InternalReadinessVerifiedObservation,
  context: {
    providerKey: string;
    providerConnectionId: string;
    syncRunId?: string;
    generatedAt?: string;
  }
): InternalReadinessVerifiedObservation =>
  stripUndefined({
    ...observation,
    providerKey: observation.providerKey ?? context.providerKey,
    providerConnectionId: observation.providerConnectionId ?? context.providerConnectionId,
    syncRunId: observation.syncRunId ?? context.syncRunId,
    observedAt: observation.observedAt || context.generatedAt || new Date().toISOString(),
    sourceReferenceIds: observation.sourceReferenceIds?.length ? [...observation.sourceReferenceIds].sort() : undefined
  }) as InternalReadinessVerifiedObservation;

const applyVerifiedObservations = (
  controls: readonly StoredAnalysisControlResult[],
  observations: readonly InternalReadinessVerifiedObservation[]
): StoredAnalysisControlResult[] => {
  const observationsByControl = new Map<string, InternalReadinessVerifiedObservation[]>();
  for (const observation of observations) {
    const existing = observationsByControl.get(observation.controlId) ?? [];
    existing.push(observation);
    observationsByControl.set(observation.controlId, existing);
  }

  return controls.map((control) => {
    const controlObservations = observationsByControl.get(control.controlId) ?? [];
    if (controlObservations.length === 0) {
      return { ...control };
    }

    const effectiveObservation =
      controlObservations.find((observation) => observation.status === "verified_gap") ??
      controlObservations.find((observation) => observation.status === "verified_passing") ??
      controlObservations.find((observation) => observation.status === "unavailable") ??
      controlObservations[0];
    if (!effectiveObservation) {
      return { ...control };
    }

    const effectiveStatus = effectiveStatusForObservation(control.status, effectiveObservation);
    return {
      ...control,
      status: effectiveStatus,
      confidence:
        effectiveObservation.status === "unavailable"
          ? control.confidence
          : effectiveObservation.provenance === "verified_through_microsoft"
            ? "high"
            : control.confidence,
      summary:
        effectiveObservation.status === "unavailable"
          ? `${control.summary} Verified observation unavailable: ${effectiveObservation.summary}`
          : `${control.summary} Verified observation: ${effectiveObservation.summary}`,
    providerSignalIds: [...new Set([...(control.providerSignalIds ?? []), ...controlObservations.map((observation) => observation.id)])],
      evidenceCompleteness:
        effectiveObservation.status === "unavailable"
          ? control.evidenceCompleteness
          : {
              required: Math.max(1, control.evidenceCompleteness?.required ?? 1),
              present: Math.max(1, control.evidenceCompleteness?.present ?? 1),
              missing: 0,
              ratio: 1
            }
    };
  });
};

const effectiveStatusForObservation = (
  declaredStatus: string,
  observation: InternalReadinessVerifiedObservation
): StoredAnalysisControlResult["status"] => {
  if (observation.status === "verified_gap") {
    return "failing";
  }
  if (observation.status === "verified_passing") {
    return "compliant";
  }
  return declaredStatus;
};

const buildVerifiedRecommendations = (
  input: BuildInternalReadinessReportInput,
  observations: readonly InternalReadinessVerifiedObservation[]
): ReportRecommendationSummary[] =>
  observations
    .filter((observation) => observation.status === "verified_gap")
    .map((observation) => ({
      controlId: observation.controlId,
      jurisdiction: input.jurisdiction,
      title: `Resolve verified ${observation.title}`,
      severity: "high",
      summary: observation.summary,
      requiredEvidence: true,
      provenance: [observation.provenance],
      sourceReferences: []
    }));

const buildReportComparison = (input: {
  previousReportId: string;
  previousReport: InternalReadinessReport;
  currentConcepts: InternalReadinessReportConcepts;
  currentControlResults: readonly ReportControlResultSummary[];
  previousControlResults: readonly ReportControlResultSummary[];
  observations: readonly InternalReadinessVerifiedObservation[];
  contradictions: readonly InternalReadinessContradiction[];
  recommendations: readonly ReportRecommendationSummary[];
}): InternalReadinessReportComparison => {
  const currentByControl = new Map(input.currentControlResults.map((control) => [control.controlId, control]));
  const previousByControl = new Map(input.previousControlResults.map((control) => [control.controlId, control]));
  const changedControlAreas = [...currentByControl.values()]
    .flatMap((current) => {
      const previous = previousByControl.get(current.controlId);
      if (!previous || previous.status === current.status) {
        return [];
      }

      return [
        {
          controlId: current.controlId,
          previousStatus: previous.status,
          currentStatus: current.status,
          readinessDelta: roundPercentDelta(readinessValueForStatus(current.status) - readinessValueForStatus(previous.status)),
          evidenceConfidenceDelta: evidenceConfidenceValueForControlSummary(current) - evidenceConfidenceValueForControlSummary(previous)
        }
      ];
    })
    .sort((left, right) => left.controlId.localeCompare(right.controlId));
  const previousUnknowns = new Set(
    input.previousControlResults
      .filter((control) => ["needs_evidence", "not_started", "unsupported"].includes(control.status))
      .map((control) => control.controlId)
  );

  return {
    previousReportId: input.previousReportId,
    readinessDelta: input.currentConcepts.readiness.value - input.previousReport.concepts.readiness.value,
    evidenceConfidenceDelta: input.currentConcepts.evidenceConfidence.value - input.previousReport.concepts.evidenceConfidence.value,
    changedControlAreas,
    newVerifiedFindings: input.observations
      .filter((observation) => observation.status === "verified_gap")
      .map((observation) => observation.id)
      .sort(),
    resolvedUnknowns: input.observations
      .filter((observation) => observation.status === "verified_passing" && previousUnknowns.has(observation.controlId))
      .map((observation) => observation.controlId)
      .sort(),
    contradictions: input.contradictions.map((contradiction) => contradiction.id).sort(),
    newRecommendations: input.recommendations
      .filter((recommendation) =>
        input.observations.some(
          (observation) => observation.status === "verified_gap" && observation.controlId === recommendation.controlId
        )
      )
      .map((recommendation) => recommendation.title)
      .sort()
  };
};

const buildInternalReadinessReportVersion = (
  input: BuildInternalReadinessReportInput,
  context: {
    calibration: InternalReadinessCalibrationMetadata;
    methodologyVersion: string;
    recommendationCount: number;
  }
): InternalReadinessReportVersionMetadata =>
  stripUndefined({
    calibrationReviewStatus: context.calibration.reviewStatus,
    calibrationVersion: context.calibration.calibrationVersion,
    countryPackVersion: input.countryPackVersion,
    immutable: true,
    inputSnapshot: stripUndefined({
      assessmentId: input.assessmentId,
      classificationResult: input.classificationResult,
      controlResultCount: input.controlResults.length,
      evidenceArtifactCount: input.evidence?.length ?? 0,
      gapCount: input.gaps.length,
      recommendationCount: context.recommendationCount
    }),
    methodologyVersion: context.methodologyVersion,
    onboardingSchemaVersion: input.onboardingSchemaVersion,
    previousReportId: input.previousReportId,
    rendererVersion: input.rendererVersion ?? "puresoc-report-renderer-json.v1",
    reportVersion: input.reportVersion ?? 1,
    triggerType: input.triggerType ?? "onboarding_completed"
  }) as InternalReadinessReportVersionMetadata;

const buildInternalReadinessReportConcepts = (input: {
  classificationResult?: InternalReadinessReportClassificationSnapshot;
  controlResults: readonly StoredAnalysisControlResult[];
  gaps: readonly ReportGapSummary[];
  methodologyVersion: string;
}): InternalReadinessReportConcepts => {
  const classification = input.classificationResult;
  const applicableControls = input.controlResults.filter((result) => result.status !== "not_applicable");
  const readinessValue = roundPercent(
    applicableControls.length === 0
      ? 0
      : averageNumber(applicableControls.map((result) => readinessValueForStatus(result.status))) * 100
  );
  const evidenceConfidence = calculateEvidenceConfidence(applicableControls);
  const criticalGapCount = input.gaps.filter((gap) => gap.severity === "critical").length;
  const highGapCount = input.gaps.filter((gap) => gap.severity === "high").length;
  const priority = highestGapSeverity(input.gaps);
  const missingInformationCount =
    applicableControls.filter((result) => ["not_started", "needs_evidence", "unsupported"].includes(result.status)).length +
    evidenceConfidence.missingEvidenceCount +
    (classification?.missingInformation?.length ?? 0);

  return {
    applicability: {
      confidence: classification?.confidence ?? "low",
      legalReviewRequired: classification?.legalReviewRequired ?? true,
      result: classification?.result ?? "not_assessed",
      summary: classification?.explanation ?? "Applicability has not been classified from country-pack onboarding yet."
    },
    readiness: {
      applicableControlCount: applicableControls.length,
      methodologyVersion: input.methodologyVersion,
      missingInformationCount,
      result: conceptBand(readinessValue),
      summary: `Declared readiness is ${readinessValue}% across ${applicableControls.length} applicable controls.`,
      value: readinessValue
    },
    evidenceConfidence: {
      methodologyVersion: input.methodologyVersion,
      missingEvidenceCount: evidenceConfidence.missingEvidenceCount,
      result: conceptBand(evidenceConfidence.value),
      summary: `Evidence confidence is ${evidenceConfidence.value}% from declared evidence coverage.`,
      value: evidenceConfidence.value
    },
    priority: {
      criticalGapCount,
      highGapCount,
      result: priority,
      summary:
        priority === "none"
          ? "No open gaps were present in this report snapshot."
          : `Highest current priority is ${priority} based on open readiness gaps.`
    }
  };
};

const readinessStatusValues: Record<string, number> = {
  accepted_risk: 0.5,
  compliant: 1,
  failing: 0,
  needs_evidence: 0,
  not_started: 0,
  partial: 0.5,
  passing: 1,
  unsupported: 0
};

const readinessValueForStatus = (status: string): number => readinessStatusValues[status] ?? 0;

const isPassingStatus = (status: string): boolean => readinessValueForStatus(status) >= 1;

const roundPercentDelta = (value: number): number => Math.round(value * 100);

const evidenceConfidenceValueForControl = (control: StoredAnalysisControlResult): number => {
  if (control.evidenceCompleteness) {
    return roundPercent(control.evidenceCompleteness.ratio * 100);
  }

  return (control.evidenceArtifactIds?.length ?? 0) > 0 ? 100 : 0;
};

const evidenceConfidenceValueForControlSummary = (control: ReportControlResultSummary): number => {
  if (control.evidenceCompleteness) {
    return roundPercent(control.evidenceCompleteness.ratio * 100);
  }

  return control.evidenceArtifactIds.length > 0 ? 100 : 0;
};

const evidenceConfidenceValueForObservation = (observation: InternalReadinessVerifiedObservation): number =>
  observation.evidenceConfidenceImpact === "improves" ? 100 : 0;

const calculateEvidenceConfidence = (
  controls: readonly StoredAnalysisControlResult[]
): { missingEvidenceCount: number; value: number } => {
  if (controls.length === 0) {
    return {
      missingEvidenceCount: 0,
      value: 0
    };
  }

  const values = controls.map((control) => {
    if (control.evidenceCompleteness) {
      return Math.max(0, Math.min(1, control.evidenceCompleteness.ratio));
    }

    return (control.evidenceArtifactIds?.length ?? 0) > 0 ? 1 : 0;
  });

  return {
    missingEvidenceCount: controls.filter((control) => {
      if (control.evidenceCompleteness) {
        return control.evidenceCompleteness.missing > 0;
      }

      return (control.evidenceArtifactIds?.length ?? 0) === 0;
    }).length,
    value: roundPercent(averageNumber(values) * 100)
  };
};

const highestGapSeverity = (gaps: readonly ReportGapSummary[]): InternalReadinessReportConcepts["priority"]["result"] => {
  const severityRank: Record<InternalReadinessReportConcepts["priority"]["result"], number> = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };
  return gaps.reduce<InternalReadinessReportConcepts["priority"]["result"]>(
    (highest, gap) => (severityRank[gap.severity] > severityRank[highest] ? gap.severity : highest),
    "none"
  );
};

const conceptBand = (value: number): "low" | "medium" | "high" => {
  if (value >= 75) {
    return "high";
  }
  if (value >= 40) {
    return "medium";
  }
  return "low";
};

const averageNumber = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const roundPercent = (value: number): number => Math.round(Math.max(0, Math.min(100, value)));

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
    legalCaveatFallbackReason: legalCaveat.fallbackReason,
    legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
    legalCaveatLocale: legalCaveat.resolvedLocale,
    legalCaveatMessageKey: legalCaveat.messageKey,
    legalCaveatRequestedLocale: legalCaveat.requestedLocale,
    legalCaveatReviewStatus: legalCaveat.reviewStatus,
    locale,
    reportBranding: normalizeReportBranding(input.reportBranding),
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

type CsvCellValue = string | number | boolean | null | undefined;

const internalReadinessCsvColumns = [
  "table",
  "record_key",
  "control_id",
  "control_code",
  "jurisdiction",
  "status",
  "severity",
  "title",
  "summary",
  "evidence_artifact_ids",
  "provider_signal_ids",
  "source_record_ids",
  "generated_at"
] as const;

type InternalReadinessCsvColumn = (typeof internalReadinessCsvColumns)[number];

type InternalReadinessCsvRow = Record<InternalReadinessCsvColumn, CsvCellValue>;

export const buildInternalReadinessCsvExport = (
  report: InternalReadinessReport
): InternalReadinessCsvExport => {
  const rows: InternalReadinessCsvRow[] = [
    csvRow({
      table: "metadata",
      record_key: "legal_caveat",
      jurisdiction: report.jurisdiction,
      title: "Legal caveat",
      summary: report.legalCaveat,
      source_record_ids: sourceIds(report.sourceReferences),
      generated_at: report.generatedAt
    }),
    csvRow({
      table: "metadata",
      record_key: "report",
      jurisdiction: report.jurisdiction,
      status: report.reportType,
      title: "Internal readiness report",
      summary: report.assessmentId,
      source_record_ids: sourceIds(report.sourceReferences),
      generated_at: report.generatedAt
    }),
    ...report.controlResults.map((result) =>
      csvRow({
        table: "control_results",
        record_key: result.controlId,
        control_id: result.controlId,
        control_code: result.controlCode,
        jurisdiction: result.jurisdiction,
        status: result.status,
        title: result.confidence,
        summary: result.summary,
        evidence_artifact_ids: joinList(result.evidenceArtifactIds),
        provider_signal_ids: joinList(result.providerSignalIds),
        source_record_ids: sourceIds(result.sourceReferences),
        generated_at: report.generatedAt
      })
    ),
    ...report.gaps.map((gap, index) =>
      csvRow({
        table: "gaps",
        record_key: `${gap.controlId}:${index + 1}`,
        control_id: gap.controlId,
        control_code: gap.controlCode,
        jurisdiction: gap.jurisdiction,
        status: "gap",
        severity: gap.severity,
        title: joinList(gap.missingEvidence),
        summary: gap.summary,
        source_record_ids: sourceIds(gap.sourceReferences),
        generated_at: report.generatedAt
      })
    ),
    ...report.recommendations.map((recommendation, index) =>
      csvRow({
        table: "recommendations",
        record_key: `${recommendation.controlId}:${index + 1}`,
        control_id: recommendation.controlId,
        jurisdiction: recommendation.jurisdiction,
        status: recommendation.requiredEvidence ? "evidence_required" : "advisory",
        severity: recommendation.severity,
        title: recommendation.title,
        summary: recommendation.summary,
        source_record_ids: sourceIds(recommendation.sourceReferences ?? []),
        generated_at: report.generatedAt
      })
    ),
    ...(report.readinessPlan?.items ?? []).map((item) =>
      csvRow({
        table: "readiness_plan_items",
        record_key: item.id,
        control_id: item.controlId,
        jurisdiction: item.jurisdiction,
        status: item.status,
        title: item.actionType,
        summary: item.recommendedAction,
        source_record_ids: sourceIds(item.sourceReferences),
        generated_at: report.generatedAt
      })
    ),
    ...report.evidence.map((artifact) =>
      csvRow({
        table: "evidence",
        record_key: artifact.id,
        control_id: artifact.controlId,
        jurisdiction: artifact.jurisdiction,
        status: artifact.scanStatus,
        title: artifact.title,
        summary: artifact.sourceType,
        evidence_artifact_ids: artifact.id,
        source_record_ids: artifact.linkedSourceRecordId ?? "",
        generated_at: artifact.createdAt
      })
    ),
    ...report.sourceReferences.map((reference) =>
      csvRow({
        table: "source_references",
        record_key: reference.sourceRecordId,
        jurisdiction: reference.jurisdiction,
        status: reference.sourceVersion,
        title: reference.title ?? reference.label ?? reference.sourceRecordId,
        summary: [
          reference.article ? `Article ${reference.article}` : "",
          reference.paragraph ? `Paragraph ${reference.paragraph}` : "",
          reference.sourceLocation ?? "",
          reference.fieldKey ?? ""
        ]
          .filter(Boolean)
          .join(" | "),
        source_record_ids: reference.sourceRecordId,
        generated_at: report.generatedAt
      })
    )
  ];
  const tableNames = uniqueTableNames(rows);

  return stripUndefined({
    schemaVersion: "puresoc.export.internal_readiness_csv.v1",
    organizationId: report.organizationId,
    assessmentId: report.assessmentId,
    jurisdiction: report.jurisdiction,
    reportType: "internal_readiness",
    exportFormat: "csv",
    generatedAt: report.generatedAt,
    legalCaveat: report.legalCaveat,
    legalCaveatFallbackReason: report.legalCaveatFallbackReason,
    legalCaveatFallbackUsed: report.legalCaveatFallbackUsed,
    legalCaveatLocale: report.legalCaveatLocale,
    legalCaveatMessageKey: report.legalCaveatMessageKey,
    legalCaveatRequestedLocale: report.legalCaveatRequestedLocale,
    legalCaveatReviewStatus: report.legalCaveatReviewStatus,
    locale: report.locale,
    sourceReferences: report.sourceReferences,
    tableNames,
    rowCount: rows.length,
    csv: stableCsvExport(internalReadinessCsvColumns, rows)
  }) as InternalReadinessCsvExport;
};

export const stableCsvExport = <TColumn extends string>(
  columns: readonly TColumn[],
  rows: readonly Record<TColumn, CsvCellValue>[]
): string =>
  [
    columns.map(escapeCsvCell).join(","),
    ...rows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(","))
  ].join("\n") + "\n";

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
    provenance: controlResultProvenance(result),
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
    provenance: ["inferred_by_rule"],
    sourceReferences: uniqueSourceReferences(gap.sourceReferences ?? [])
  }) as ReportGapSummary;

const toRecommendationSummary = (recommendation: StoredAnalysisRecommendation): ReportRecommendationSummary => ({
  controlId: recommendation.controlId,
  jurisdiction: recommendation.jurisdiction,
  title: recommendation.title,
  severity: recommendation.severity,
  summary: recommendation.summary,
  requiredEvidence: recommendation.evidenceRequired,
  provenance: ["inferred_by_rule"],
  sourceReferences: uniqueSourceReferences(recommendation.sourceReferences ?? [])
});

const controlResultProvenance = (result: StoredAnalysisControlResult): ReportControlResultSummary["provenance"] => {
  const provenance = new Set<NonNullable<ReportControlResultSummary["provenance"]>[number]>(["declared_by_customer"]);
  if ((result.evidenceArtifactIds?.length ?? 0) > 0) {
    provenance.add("uploaded_evidence");
  }
  if ((result.providerSignalIds ?? []).some((signalId) => signalId.startsWith("m365:") || signalId.startsWith("microsoft365:"))) {
    provenance.add("verified_through_microsoft");
  }
  return [...provenance].sort();
};

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

const normalizeReportBranding = (branding: ReportBranding | undefined): ReportBranding | undefined => {
  if (!branding) {
    return undefined;
  }

  const normalized = stripUndefined({
    organizationName: normalizeBrandingText(branding.organizationName),
    legalName: branding.legalName === null ? null : normalizeBrandingText(branding.legalName),
    logoDataUrl: branding.logoDataUrl === null ? null : normalizeBrandingText(branding.logoDataUrl)
  });

  return Object.keys(normalized).length > 0 ? (normalized as ReportBranding) : undefined;
};

const normalizeBrandingText = (value: string | null | undefined): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const assertTenantBoundary = (organizationId: string, records: readonly { organizationId?: string }[]): void => {
  const crossTenantRecord = records.find((record) => record.organizationId && record.organizationId !== organizationId);
  if (crossTenantRecord) {
    throw new Error("Report input contains records from another organization.");
  }
};

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;

const csvRow = (input: Partial<Record<InternalReadinessCsvColumn, CsvCellValue>>): InternalReadinessCsvRow =>
  Object.fromEntries(
    internalReadinessCsvColumns.map((column) => [column, input[column] ?? ""])
  ) as InternalReadinessCsvRow;

const uniqueTableNames = (rows: readonly InternalReadinessCsvRow[]): InternalReadinessCsvTableName[] =>
  [...new Set(rows.map((row) => row.table).filter(isInternalReadinessCsvTableName))];

const isInternalReadinessCsvTableName = (value: CsvCellValue): value is InternalReadinessCsvTableName =>
  typeof value === "string" &&
  [
    "metadata",
    "control_results",
    "gaps",
    "recommendations",
    "readiness_plan_items",
    "evidence",
    "source_references"
  ].includes(value);

const joinList = (values: readonly string[] | undefined): string => (values ?? []).filter(Boolean).join(" | ");

const sourceIds = (references: readonly { sourceRecordId?: string }[] | undefined): string =>
  joinList([...(references ?? [])].map((reference) => reference.sourceRecordId).filter((value): value is string => Boolean(value)));

const escapeCsvCell = (value: CsvCellValue): string => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
