import { PURESOC_LEGAL_CAVEAT } from "../../shared/src/index";

export type ReportType =
  | "internal_readiness"
  | "country_classification"
  | "provider_posture"
  | "evidence_package"
  | "incident_draft";

export interface ReportSourceReference {
  sourceRecordId: string;
  title: string;
  jurisdiction: string;
  sourceUrl?: string;
  sourceVersion?: string;
}

export interface ReportRecommendationSummary {
  controlId: string;
  jurisdiction: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  requiredEvidence: boolean;
}

export interface InternalReadinessReport {
  organizationId: string;
  jurisdiction: string;
  reportType: ReportType;
  generatedAt: string;
  legalCaveat: string;
  sourceReferences: ReportSourceReference[];
  recommendations: ReportRecommendationSummary[];
}

export const createReportShell = (organizationId: string, jurisdiction = "eu"): InternalReadinessReport => ({
  organizationId,
  jurisdiction,
  reportType: "internal_readiness",
  generatedAt: new Date(0).toISOString(),
  legalCaveat: PURESOC_LEGAL_CAVEAT,
  sourceReferences: [],
  recommendations: []
});

