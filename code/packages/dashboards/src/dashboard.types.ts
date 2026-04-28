export type DashboardSnapshotSource = "stored_analysis";

export interface DashboardWidgetContract {
  key: string;
  title: string;
  value: number | string | boolean;
  sourceQuery: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface DashboardSnapshotContract {
  organizationId: string;
  assessmentId?: string;
  source: DashboardSnapshotSource;
  readinessScores: {
    euApplicability: number;
    countryPackCompleteness: number;
    technicalPosture: number;
    processCompliance: number;
    evidenceCompleteness: number;
    overallInternalReadiness: number;
  };
  widgets: DashboardWidgetContract[];
}

export const createStoredAnalysisDashboardSnapshot = (
  organizationId: string,
  widgets: DashboardWidgetContract[] = []
): DashboardSnapshotContract => ({
  organizationId,
  source: "stored_analysis",
  readinessScores: {
    euApplicability: 0,
    countryPackCompleteness: 0,
    technicalPosture: 0,
    processCompliance: 0,
    evidenceCompleteness: 0,
    overallInternalReadiness: 0
  },
  widgets
});

