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
  controlResults: readonly StoredDashboardControlResult[];
  gaps?: readonly StoredDashboardGap[];
  recommendations?: readonly StoredDashboardRecommendation[];
  evidenceArtifacts?: readonly StoredDashboardEvidenceArtifact[];
}

const readyStatuses = new Set(["passing", "not_applicable", "accepted_risk"]);
const processGapStatuses = new Set(["partial", "not_started", "needs_evidence"]);

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
  const technicalControls = controlResults.filter((result) => result.status !== "not_started");
  const readyControls = controlResults.filter((result) => readyStatuses.has(result.status));
  const processGaps = controlResults.filter((result) => processGapStatuses.has(result.status));
  const evidenceRequirements = controlResults
    .map((result) => result.evidenceCompleteness)
    .filter((value): value is NonNullable<StoredDashboardControlResult["evidenceCompleteness"]> => Boolean(value));
  const requiredEvidence = evidenceRequirements.reduce((sum, item) => sum + item.required, 0);
  const presentEvidence = evidenceRequirements.reduce((sum, item) => sum + item.present, 0);
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
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    readinessScores: {
      euApplicability: percentage(controlResults.length, controlResults.length),
      countryPackCompleteness: clampScore(input.countryPackCompleteness ?? 0),
      technicalPosture: percentage(readyControls.length, Math.max(technicalControls.length, controlResults.length)),
      processCompliance: percentage(controlResults.length - processGaps.length, controlResults.length),
      evidenceCompleteness: requiredEvidence === 0 ? 100 : percentage(presentEvidence, requiredEvidence),
      overallInternalReadiness: averageScores([
        percentage(readyControls.length, controlResults.length),
        percentage(controlResults.length - processGaps.length, controlResults.length),
        requiredEvidence === 0 ? 100 : percentage(presentEvidence, requiredEvidence),
        clampScore(input.countryPackCompleteness ?? 0)
      ])
    },
    widgets,
    sourceRecordCounts: {
      controlResults: controlResults.length,
      gaps: gaps.length,
      recommendations: recommendations.length,
      evidenceArtifacts: evidenceArtifacts.length
    }
  };
};

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

const clampScore = (score: number): number => Math.max(0, Math.min(100, score));

const assertTenantBoundary = (organizationId: string, records: readonly { organizationId?: string }[]): void => {
  const crossTenantRecord = records.find((record) => record.organizationId && record.organizationId !== organizationId);
  if (crossTenantRecord) {
    throw new Error("Dashboard input contains records from another organization.");
  }
};
