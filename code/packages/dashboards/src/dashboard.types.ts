import type { ActionableSeverity } from "@puresoc/shared";

export type DashboardSnapshotSource = "stored_analysis";

export interface DashboardWidgetContract {
  key: string;
  title: string;
  value: number | string | boolean;
  sourceQuery: string;
  severity?: ActionableSeverity;
}

export interface DashboardSnapshotContract {
  schemaVersion: "puresoc.dashboard.snapshot.v1";
  organizationId: string;
  assessmentId?: string;
  snapshotType: "readiness_overview" | "evidence_overview" | "provider_overview" | string;
  source: DashboardSnapshotSource;
  readinessScoreLabel: "PureSOC internal readiness";
  generatedAt: string;
  readinessScores: {
    euApplicability: number;
    countryPackCompleteness: number;
    technicalPosture: number;
    processCompliance: number;
    evidenceCompleteness: number;
    overallInternalReadiness: number;
  };
  widgets: DashboardWidgetContract[];
  sourceRecordCounts: {
    controlResults: number;
    gaps: number;
    recommendations: number;
    evidenceArtifacts: number;
  };
}

export const createStoredAnalysisDashboardSnapshot = (
  organizationId: string,
  widgets: DashboardWidgetContract[] = []
): DashboardSnapshotContract => ({
  schemaVersion: "puresoc.dashboard.snapshot.v1",
  organizationId,
  snapshotType: "readiness_overview",
  source: "stored_analysis",
  readinessScoreLabel: "PureSOC internal readiness",
  generatedAt: new Date(0).toISOString(),
  readinessScores: {
    euApplicability: 0,
    countryPackCompleteness: 0,
    technicalPosture: 0,
    processCompliance: 0,
    evidenceCompleteness: 0,
    overallInternalReadiness: 0
  },
  widgets,
  sourceRecordCounts: {
    controlResults: 0,
    gaps: 0,
    recommendations: 0,
    evidenceArtifacts: 0
  }
});
