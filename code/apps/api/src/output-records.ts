import type { DashboardSnapshotContract } from "../../../packages/dashboards/src/index";
import type { EvidenceArtifactMetadata } from "../../../packages/evidence/src/index";
import type { ComplianceControlResult, ComplianceGap, ReadinessPlan } from "../../../packages/compliance/core/src/index";
import type { RecommendationContract } from "../../../packages/recommendations/src/index";
import type { InternalReadinessReport, RomaniaNotificationDraftExport } from "../../../packages/reports/src/index";

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
