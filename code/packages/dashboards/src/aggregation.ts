import type { DashboardSnapshotContract, DashboardWidgetContract } from "./dashboard.types";

export interface StoredDashboardControlResult {
  organizationId: string;
  assessmentId: string;
  status: string;
  evidenceCompleteness?: {
    required: number;
    present: number;
    missing: number;
    ratio: number;
  };
}

export interface StoredDashboardGap {
  organizationId: string;
  assessmentId: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface StoredDashboardRecommendation {
  organizationId: string;
  status: string;
  severity: "informational" | "low" | "medium" | "high" | "critical";
  evidenceRequired: boolean;
}

export interface StoredDashboardEvidenceArtifact {
  organizationId: string;
  scanStatus?: string;
}

export interface BuildDashboardSnapshotInput {
  organizationId: string;
  assessmentId?: string;
  generatedAt?: string;
  countryPackCompleteness?: number;
  providerConnectionHealth?: number;
  controlResults: readonly StoredDashboardControlResult[];
  gaps?: readonly StoredDashboardGap[];
  recommendations?: readonly StoredDashboardRecommendation[];
  evidenceArtifacts?: readonly StoredDashboardEvidenceArtifact[];
}

const processGapStatuses = new Set(["partial", "not_started", "needs_evidence"]);
const internalReadinessWeights = {
  technicalPosture: 35,
  processCompliance: 25,
  evidenceCompleteness: 25,
  countryPackCompleteness: 15
};
const statusInternalReadinessScore: Record<string, number> = {
  passing: 100,
  not_applicable: 100,
  accepted_risk: 75,
  partial: 50,
  needs_evidence: 35,
  unsupported: 25,
  failing: 0,
  not_started: 0
};
const compliantControlStatuses = new Set(["passing", "not_applicable", "accepted_risk"]);

export const aggregateDashboardFromStoredAnalysis = (
  input: BuildDashboardSnapshotInput
): DashboardSnapshotContract => {
  assertTenantBoundary(input.organizationId, [
    ...input.controlResults,
    ...(input.gaps ?? []),
    ...(input.recommendations ?? []),
    ...(input.evidenceArtifacts ?? [])
  ]);

  const controlResults = input.controlResults;
  const gaps = input.gaps ?? [];
  const recommendations = input.recommendations ?? [];
  const evidenceArtifacts = input.evidenceArtifacts ?? [];
  const processGaps = controlResults.filter((result) => processGapStatuses.has(result.status));
  const evidenceRequirements = controlResults
    .map((result) => result.evidenceCompleteness)
    .filter((value): value is NonNullable<StoredDashboardControlResult["evidenceCompleteness"]> => Boolean(value));
  const requiredEvidence = evidenceRequirements.reduce((sum, item) => sum + item.required, 0);
  const presentEvidence = evidenceRequirements.reduce((sum, item) => sum + item.present, 0);
  const technicalPostureScore = averageScores(controlResults.map((result) => scoreForStatus(result.status)));
  const processComplianceScore = percentage(controlResults.length - processGaps.length, controlResults.length);
  const evidenceCompletenessScore = requiredEvidence === 0 ? 100 : percentage(presentEvidence, requiredEvidence);
  const countryPackCompletenessScore = clampScore(input.countryPackCompleteness ?? 0);
  const controlsCompliant = controlResults.filter((result) => compliantControlStatuses.has(result.status)).length;
  const gapCountBySeverity = countGapsBySeverity(gaps);
  const highRecommendations = recommendations.filter(
    (recommendation) => recommendation.status !== "completed" && ["high", "critical"].includes(recommendation.severity)
  );
  const widgets: DashboardWidgetContract[] = [
    {
      key: "open_gaps",
      title: "Open gaps",
      value: gaps.length,
      sourceQuery: "compliance_gaps:assessment_id=current"
    },
    {
      key: "high_recommendations",
      title: "High recommendations",
      value: highRecommendations.length,
      sourceQuery: "provider_recommendations:severity>=high,status!=completed",
      severity: highRecommendations.some((recommendation) => recommendation.severity === "critical") ? "critical" : "high"
    },
    {
      key: "evidence_artifacts",
      title: "Evidence artifacts",
      value: evidenceArtifacts.length,
      sourceQuery: "evidence_artifacts:organization_id=current"
    },
    {
      key: "scan_attention",
      title: "Scan attention",
      value: evidenceArtifacts.filter((artifact) => ["infected", "failed", "pending"].includes(artifact.scanStatus ?? ""))
        .length,
      sourceQuery: "evidence_artifacts:scan_status in (pending,infected,failed)",
      severity: "medium"
    }
  ];

  return {
    schemaVersion: "puresoc.dashboard.snapshot.v1",
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    snapshotType: "readiness_overview",
    source: "stored_analysis",
    readinessScoreLabel: "PureSOC internal readiness",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    readinessScores: {
      euApplicability: percentage(controlResults.length, controlResults.length),
      countryPackCompleteness: countryPackCompletenessScore,
      technicalPosture: technicalPostureScore,
      processCompliance: processComplianceScore,
      evidenceCompleteness: evidenceCompletenessScore,
      overallInternalReadiness: weightedAverageScore([
        [technicalPostureScore, internalReadinessWeights.technicalPosture],
        [processComplianceScore, internalReadinessWeights.processCompliance],
        [evidenceCompletenessScore, internalReadinessWeights.evidenceCompleteness],
        [countryPackCompletenessScore, internalReadinessWeights.countryPackCompleteness]
      ])
    },
    widgets,
    sourceRecordCounts: {
      controlResults: controlResults.length,
      gaps: gaps.length,
      recommendations: recommendations.length,
      evidenceArtifacts: evidenceArtifacts.length
    },
    trendMetrics: {
      overallScore: percentage(controlsCompliant, controlResults.length),
      gapCountBySeverity,
      controlsCompliant,
      controlsTotal: controlResults.length,
      providerConnectionHealth: Math.max(0, Math.round(input.providerConnectionHealth ?? 0))
    }
  };
};

const countGapsBySeverity = (
  gaps: readonly StoredDashboardGap[]
): DashboardSnapshotContract["trendMetrics"]["gapCountBySeverity"] =>
  gaps.reduce<DashboardSnapshotContract["trendMetrics"]["gapCountBySeverity"]>(
    (counts, gap) => ({
      ...counts,
      [gap.severity]: counts[gap.severity] + 1
    }),
    {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
  );

const percentage = (numerator: number, denominator: number): number => {
  if (denominator <= 0) {
    return 0;
  }

  return clampScore(Math.round((numerator / denominator) * 100));
};

const averageScores = (scores: readonly number[]): number => {
  if (scores.length === 0) {
    return 0;
  }

  return clampScore(Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length));
};

const weightedAverageScore = (scores: ReadonlyArray<readonly [number, number]>): number => {
  const totalWeight = scores.reduce((sum, [, weight]) => sum + weight, 0);

  if (totalWeight <= 0) {
    return 0;
  }

  return clampScore(Math.round(scores.reduce((sum, [score, weight]) => sum + score * weight, 0) / totalWeight));
};

const scoreForStatus = (status: string): number => statusInternalReadinessScore[status] ?? 0;

const clampScore = (score: number): number => Math.max(0, Math.min(100, score));

const assertTenantBoundary = (organizationId: string, records: readonly { organizationId?: string }[]): void => {
  const crossTenantRecord = records.find((record) => record.organizationId && record.organizationId !== organizationId);
  if (crossTenantRecord) {
    throw new Error("Dashboard input contains records from another organization.");
  }
};
