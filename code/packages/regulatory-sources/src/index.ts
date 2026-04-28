export type RegulatorySourceActivationStatus = "draft" | "validated" | "review_required" | "active" | "superseded";

export type RegulatorySourceOperationalStatus = "stale" | "unreachable";

export type RegulatorySourceRecordStatus = RegulatorySourceActivationStatus | RegulatorySourceOperationalStatus;

export type RegulatorySourceType =
  | "directive"
  | "regulation"
  | "official_national_law"
  | "official_authority_guidance"
  | "official_registration_portal"
  | "official_commission_country_page"
  | "enisa_reference"
  | "secondary_tracker"
  | "internal_excel_seed";

export type RegulatorySourceTrustLevel = "primary" | "secondary" | "internal_seed";

export interface RegulatorySourceRecord {
  id: string;
  frameworkKey: "nis2" | "nis2-eu" | "nis2-implementing-regulation-2024-2690";
  jurisdiction: "EU" | string;
  sourceType: RegulatorySourceType;
  title: string;
  url?: string;
  localFilePath?: string;
  publicationDate?: string;
  lastCheckedAt: string;
  versionLabel?: string;
  authorityName?: string;
  trustLevel: RegulatorySourceTrustLevel;
  status: RegulatorySourceRecordStatus;
  activationStatus: RegulatorySourceActivationStatus;
  notes?: string;
}

export interface RegulatorySourceChangeEvaluation {
  validationPassed: boolean;
  containsLegalLogicChange: boolean;
  reviewerApproved?: boolean;
}

export interface RegulatoryReviewTaskSkeleton {
  assignedRoleKey: "regulatory_admin";
  reason: string;
  status: "open";
  sourceRecordId?: string;
  createdForStatus: "review_required";
}

export const regulatorySourceActivationLifecycle: RegulatorySourceActivationStatus[] = [
  "draft",
  "validated",
  "review_required",
  "active",
  "superseded"
];

export const changedLegalLogicDefaultStatus: RegulatorySourceActivationStatus = "review_required";

export const defaultImportedSourceStatus: RegulatorySourceActivationStatus = "draft";

export const determineSourceActivationStatus = (
  evaluation: RegulatorySourceChangeEvaluation
): RegulatorySourceActivationStatus => {
  if (!evaluation.validationPassed) {
    return "draft";
  }

  if (evaluation.containsLegalLogicChange) {
    return changedLegalLogicDefaultStatus;
  }

  if (evaluation.reviewerApproved) {
    return "active";
  }

  return "validated";
};

export const canAutoActivateRegulatoryChange = (evaluation: RegulatorySourceChangeEvaluation): boolean =>
  evaluation.validationPassed && !evaluation.containsLegalLogicChange && evaluation.reviewerApproved === true;

export const createRegulatoryReviewTaskSkeleton = (
  sourceRecordId: string | undefined,
  reason = "Changed or newly imported legal logic requires regulatory review before activation."
): RegulatoryReviewTaskSkeleton => ({
  assignedRoleKey: "regulatory_admin",
  reason,
  status: "open",
  sourceRecordId,
  createdForStatus: "review_required"
});
