import type { DashboardSnapshotContract } from "@puresoc/dashboards";
import type { EvidenceArtifactMetadata } from "@puresoc/evidence";
import type { ComplianceControlResult, ComplianceGap, ReadinessPlan } from "@puresoc/compliance-core";
import type { RecommendationContract } from "@puresoc/recommendations";
import type { InternalReadinessReport, RomaniaNotificationDraftExport } from "@puresoc/reports";

export interface StoredAnalysisRecord {
  organizationId: string;
  assessmentId: string;
  jurisdiction: string;
  catalogVersion?: string;
  recordedAt: string;
  results: ComplianceControlResult[];
  gaps: ComplianceGap[];
  recommendations: RecommendationContract[];
  readinessPlan: ReadinessPlan;
  evidenceArtifacts: EvidenceArtifactMetadata[];
}

export interface GeneratedReportRecord {
  id: string;
  organizationId: string;
  assessmentId?: string;
  reportType: string;
  jurisdiction?: string;
  status: "draft" | "rendering" | "ready" | "failed" | "superseded";
  legalCaveat: string;
  sourceReferences: string[];
  reportData: InternalReadinessReport | RomaniaNotificationDraftExport;
  evidenceArtifactId?: string;
  createdBy?: string;
  createdAt: string;
}

export interface DashboardSnapshotRecord {
  id: string;
  organizationId: string;
  assessmentId?: string;
  snapshotType: string;
  source: "stored_analysis";
  snapshot: DashboardSnapshotContract;
  createdAt: string;
}
