import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export interface PrismaFieldExpectation {
  name: string;
  type: string;
  isList?: boolean;
  isOptional?: boolean;
  mappedName?: string;
}

export interface PrismaModelExpectation {
  contractName: string;
  fields: PrismaFieldExpectation[];
  modelAttributes?: string[];
  modelName: string;
  tableName: string;
}

export interface ParsedPrismaField {
  attributes: string;
  isList: boolean;
  isOptional: boolean;
  mappedName?: string;
  name: string;
  rawLine: string;
  type: string;
}

export interface ParsedPrismaModel {
  fields: Map<string, ParsedPrismaField>;
  modelAttributes: string[];
  modelName: string;
  tableName: string;
}

export interface DriftIssue {
  actual?: string;
  expected?: string;
  fieldName?: string;
  kind:
    | "missing_model"
    | "table_name_mismatch"
    | "missing_field"
    | "type_mismatch"
    | "list_mismatch"
    | "optional_mismatch"
    | "map_mismatch"
    | "missing_model_attribute";
  message: string;
  modelName: string;
}

export interface DriftCheckResult {
  checkedFields: number;
  checkedModels: number;
  issues: DriftIssue[];
  valid: boolean;
}

const f = (
  name: string,
  type: string,
  options: Omit<PrismaFieldExpectation, "name" | "type"> = {}
): PrismaFieldExpectation => ({
  name,
  type,
  ...options
});

const s = (
  name: string,
  type: string,
  mappedName: string,
  options: Omit<PrismaFieldExpectation, "name" | "type" | "mappedName"> = {}
): PrismaFieldExpectation => f(name, type, { mappedName, ...options });

export const defaultPrismaDriftExpectations: PrismaModelExpectation[] = [
  {
    contractName: "AuditLogRecord",
    modelName: "AuditLog",
    tableName: "audit_logs",
    modelAttributes: ['@@unique([scopeKey, chainSequence], map: "audit_logs_scope_sequence_key")'],
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id", { isOptional: true }),
      s("actorUserId", "String", "actor_user_id", { isOptional: true }),
      s("targetType", "String", "target_type"),
      s("targetId", "String", "target_id", { isOptional: true }),
      f("action", "String"),
      s("scopeKey", "String", "scope_key"),
      s("chainSequence", "Int", "chain_sequence"),
      s("ipAddress", "String", "ip_address", { isOptional: true }),
      s("userAgent", "String", "user_agent", { isOptional: true }),
      s("contextJson", "Json", "context_json"),
      s("beforeJson", "Json", "before_json", { isOptional: true }),
      s("afterJson", "Json", "after_json", { isOptional: true }),
      s("previousHash", "String", "previous_hash", { isOptional: true }),
      s("entryHash", "String", "entry_hash", { isOptional: true }),
      s("hashAlgorithm", "String", "hash_algorithm", { isOptional: true }),
      s("canonicalPayload", "Json", "canonical_payload", { isOptional: true }),
      s("createdAt", "DateTime", "created_at")
    ]
  },
  {
    contractName: "AuditCheckpointRecord",
    modelName: "AuditCheckpoint",
    tableName: "audit_checkpoints",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id", { isOptional: true }),
      s("scopeType", "String", "scope_type"),
      s("exportId", "String", "export_id"),
      s("exportedAt", "DateTime", "exported_at"),
      s("createdAt", "DateTime", "created_at"),
      s("createdByUserId", "String", "created_by_user_id", { isOptional: true }),
      s("recordCount", "Int", "record_count"),
      s("firstRecordId", "String", "first_record_id", { isOptional: true }),
      s("terminalRecordId", "String", "terminal_record_id", { isOptional: true }),
      s("initialPreviousHash", "String", "initial_previous_hash", { isOptional: true }),
      s("terminalHash", "String", "terminal_hash", { isOptional: true }),
      s("exportHash", "String", "export_hash"),
      s("hashAlgorithm", "String", "hash_algorithm"),
      s("verificationStatus", "String", "verification_status"),
      s("verificationViolationsJson", "Json", "verification_violations_json"),
      s("externalCheckpointStatus", "String", "external_checkpoint_status"),
      s("externalCheckpointReference", "String", "external_checkpoint_reference", { isOptional: true }),
      s("externalCheckpointProvider", "String", "external_checkpoint_provider"),
      s("externalCheckpointProviderStatusJson", "Json", "external_checkpoint_provider_status_json"),
      s("externalCheckpointRecordedAt", "DateTime", "external_checkpoint_recorded_at", { isOptional: true }),
      s("externalCheckpointPayloadHash", "String", "external_checkpoint_payload_hash", { isOptional: true }),
      s("externalCheckpointMetadataJson", "Json", "external_checkpoint_metadata_json"),
      s("retentionPolicyJson", "Json", "retention_policy_json"),
      s("guaranteesJson", "Json", "guarantees_json")
    ]
  },
  {
    contractName: "OidcAuthorizationStateRecord",
    modelName: "OidcAuthorizationState",
    tableName: "oidc_authorization_states",
    fields: [
      f("id", "String"),
      s("providerKey", "AuthProviderKey", "provider_key"),
      s("stateHash", "String", "state_hash"),
      s("nonceHash", "String", "nonce_hash", { isOptional: true }),
      s("codeVerifierEnvelope", "String", "code_verifier_envelope"),
      s("redirectUri", "String", "redirect_uri"),
      s("createdAt", "DateTime", "created_at"),
      s("expiresAt", "DateTime", "expires_at"),
      s("consumedAt", "DateTime", "consumed_at", { isOptional: true })
    ]
  },
  {
    contractName: "ProviderConsentStateRecord",
    modelName: "ProviderConsentState",
    tableName: "provider_consent_states",
    modelAttributes: [
      '@@unique([providerKey, stateHash], map: "provider_consent_states_provider_state_key")',
      '@@index([organizationId, providerKey, expiresAt, consumedAt], map: "provider_consent_states_org_provider_expiry_idx")'
    ],
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("providerKey", "String", "provider_key"),
      s("stateHash", "String", "state_hash"),
      s("actorUserId", "String", "actor_user_id"),
      s("redirectUri", "String", "redirect_uri"),
      s("requestedPermissionBundles", "String", "requested_permission_bundles", { isList: true }),
      s("createdAt", "DateTime", "created_at"),
      s("expiresAt", "DateTime", "expires_at"),
      s("consumedAt", "DateTime", "consumed_at", { isOptional: true })
    ]
  },
  {
    contractName: "OrganizationInvitationRecord",
    modelName: "OrganizationInvitation",
    tableName: "organization_invitations",
    modelAttributes: [
      '@@unique([tokenHash], map: "organization_invitations_token_hash_key")',
      '@@index([organizationId, invitedEmail, status], map: "organization_invitations_org_email_status_idx")'
    ],
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("invitedEmail", "String", "invited_email"),
      s("invitedRoleKey", "String", "invited_role_key"),
      s("tokenHash", "String", "token_hash"),
      s("invitedByUserId", "String", "invited_by_user_id"),
      f("status", "OrganizationInvitationStatus"),
      s("expiresAt", "DateTime", "expires_at"),
      s("acceptedByUserId", "String", "accepted_by_user_id", { isOptional: true }),
      s("acceptedAt", "DateTime", "accepted_at", { isOptional: true }),
      s("revokedAt", "DateTime", "revoked_at", { isOptional: true }),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "RoNis2OnboardingProgressRecord",
    modelName: "RoNis2OnboardingProgress",
    tableName: "ro_nis2_onboarding_progress",
    modelAttributes: ['@@index([organizationId, status], map: "ro_nis2_onboarding_progress_org_status_idx")'],
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("assessmentId", "String", "assessment_id", { isOptional: true }),
      s("businessProfileId", "String", "business_profile_id", { isOptional: true }),
      f("status", "RoNis2OnboardingStatus"),
      s("currentStep", "String", "current_step"),
      s("completedSteps", "String", "completed_steps", { isList: true }),
      s("answersJson", "Json", "answers_json"),
      s("sourceVersion", "String", "source_version"),
      s("sourceReferencesJson", "Json", "source_references_json"),
      s("missingRequiredFields", "String", "missing_required_fields", { isList: true }),
      s("savedBy", "String", "saved_by", { isOptional: true }),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "ProviderConnectionRecord",
    modelName: "ProviderConnection",
    tableName: "provider_connections",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("providerKey", "String", "provider_key"),
      s("displayName", "String", "display_name"),
      s("externalTenantId", "String", "external_tenant_id", { isOptional: true }),
      s("externalTenantName", "String", "external_tenant_name", { isOptional: true }),
      f("status", "ProviderConnectionStatus"),
      s("readEnabled", "Boolean", "read_enabled"),
      s("writeEnabled", "Boolean", "write_enabled"),
      s("metadataJson", "Json", "metadata_json"),
      s("lastSuccessfulSyncAt", "DateTime", "last_successful_sync_at", { isOptional: true }),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "ProviderCredentialRecord",
    modelName: "ProviderCredential",
    tableName: "provider_credentials",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("providerConnectionId", "String", "provider_connection_id"),
      s("providerKey", "String", "provider_key"),
      s("credentialType", "ProviderCredentialType", "credential_type"),
      s("encryptedPayload", "String", "encrypted_payload"),
      s("expiresAt", "DateTime", "expires_at", { isOptional: true }),
      s("rotationRequired", "Boolean", "rotation_required"),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "ProviderPermissionBundleRecord",
    modelName: "ProviderPermissionBundle",
    tableName: "provider_permission_bundles",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("providerConnectionId", "String", "provider_connection_id"),
      s("providerKey", "String", "provider_key"),
      s("bundleKey", "String", "bundle_key"),
      s("permissionsRequired", "String", "permissions_required", { isList: true }),
      s("permissionsGranted", "String", "permissions_granted", { isList: true }),
      f("enabled", "Boolean"),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "ProviderCapabilityRecord",
    modelName: "ProviderCapability",
    tableName: "provider_capabilities",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("providerConnectionId", "String", "provider_connection_id"),
      s("providerKey", "String", "provider_key"),
      s("moduleKey", "String", "module_key"),
      s("capabilityKey", "String", "capability_key"),
      f("available", "Boolean"),
      s("licenseRequired", "String", "license_required", { isList: true }),
      s("licenseDetected", "String", "license_detected", { isList: true }),
      s("permissionsRequired", "String", "permissions_required", { isList: true }),
      s("permissionsGranted", "String", "permissions_granted", { isList: true }),
      f("status", "ProviderModuleStatus"),
      s("statusReason", "String", "status_reason", { isOptional: true }),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "ProviderSyncRunRecord",
    modelName: "ProviderSyncRun",
    tableName: "provider_sync_runs",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("providerConnectionId", "String", "provider_connection_id"),
      s("providerKey", "String", "provider_key"),
      f("status", "ProviderModuleStatus"),
      s("startedAt", "DateTime", "started_at"),
      s("completedAt", "DateTime", "completed_at", { isOptional: true }),
      s("errorJson", "Json", "error_json", { isOptional: true }),
      s("summaryJson", "Json", "summary_json")
    ]
  },
  {
    contractName: "ProviderSyncModuleRecord",
    modelName: "ProviderSyncModule",
    tableName: "provider_sync_modules",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("providerConnectionId", "String", "provider_connection_id"),
      s("syncRunId", "String", "sync_run_id"),
      s("providerKey", "String", "provider_key"),
      s("moduleKey", "String", "module_key"),
      f("status", "ProviderModuleStatus"),
      s("missingPermissions", "String", "missing_permissions", { isList: true }),
      s("missingLicenses", "String", "missing_licenses", { isList: true }),
      s("statusReason", "String", "status_reason", { isOptional: true }),
      s("pagesRead", "Int", "pages_read"),
      s("retryCount", "Int", "retry_count"),
      s("startedAt", "DateTime", "started_at"),
      s("completedAt", "DateTime", "completed_at", { isOptional: true })
    ]
  },
  {
    contractName: "ProviderRawResourceContract",
    modelName: "ProviderRawResource",
    tableName: "provider_raw_resources",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("providerConnectionId", "String", "provider_connection_id"),
      s("providerKey", "String", "provider_key"),
      s("externalId", "String", "external_id"),
      s("externalResourceType", "String", "external_resource_type"),
      s("sourceModule", "String", "source_module"),
      s("syncRunId", "String", "sync_run_id"),
      s("rawJson", "Json", "raw_json"),
      s("contentHash", "String", "content_hash"),
      s("firstSeenAt", "DateTime", "first_seen_at"),
      s("lastSeenAt", "DateTime", "last_seen_at"),
      s("deletedAt", "DateTime", "deleted_at", { isOptional: true }),
      s("lifecycleStatus", "ResourceLifecycleStatus", "lifecycle_status")
    ]
  },
  {
    contractName: "ProviderNormalizedResourceContract",
    modelName: "ProviderNormalizedResource",
    tableName: "provider_normalized_resources",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("providerConnectionId", "String", "provider_connection_id"),
      s("providerKey", "String", "provider_key"),
      s("rawResourceId", "String", "raw_resource_id", { isOptional: true }),
      s("externalId", "String", "external_id"),
      s("externalResourceType", "String", "external_resource_type"),
      s("resourceType", "String", "resource_type"),
      s("sourceModule", "String", "source_module"),
      s("normalizedJson", "Json", "normalized_json"),
      s("contentHash", "String", "content_hash"),
      s("firstSeenAt", "DateTime", "first_seen_at"),
      s("lastSeenAt", "DateTime", "last_seen_at"),
      s("deletedAt", "DateTime", "deleted_at", { isOptional: true }),
      s("lifecycleStatus", "ResourceLifecycleStatus", "lifecycle_status")
    ]
  },
  {
    contractName: "ProviderFindingRecord",
    modelName: "ProviderFinding",
    tableName: "provider_findings",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("providerConnectionId", "String", "provider_connection_id"),
      s("normalizedResourceId", "String", "normalized_resource_id", { isOptional: true }),
      s("resourceExternalId", "String", "resource_external_id", { isOptional: true }),
      s("resourceType", "String", "resource_type", { isOptional: true }),
      s("syncRunId", "String", "sync_run_id", { isOptional: true }),
      s("providerKey", "String", "provider_key"),
      s("moduleKey", "String", "module_key"),
      s("findingKey", "String", "finding_key"),
      f("title", "String"),
      f("summary", "String"),
      f("severity", "FindingSeverity"),
      f("status", "FindingStatus"),
      s("evidenceJson", "Json", "evidence_json"),
      s("firstSeenAt", "DateTime", "first_seen_at"),
      s("lastSeenAt", "DateTime", "last_seen_at"),
      s("resolvedAt", "DateTime", "resolved_at", { isOptional: true })
    ]
  },
  {
    contractName: "ProviderRecommendationRecord",
    modelName: "ProviderRecommendation",
    tableName: "provider_recommendations",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("assessmentId", "String", "assessment_id", { isOptional: true }),
      s("providerConnectionId", "String", "provider_connection_id", { isOptional: true }),
      s("sourceFindingId", "String", "source_finding_id", { isOptional: true }),
      s("sourceFindingKey", "String", "source_finding_key", { isOptional: true }),
      s("sourceFindingIds", "String", "source_finding_ids", { isList: true }),
      s("manualTaskIds", "String", "manual_task_ids", { isList: true }),
      s("providerKey", "String", "provider_key"),
      s("moduleKey", "String", "module_key", { isOptional: true }),
      s("controlId", "String", "control_id", { isOptional: true }),
      f("jurisdiction", "String"),
      f("title", "String"),
      f("summary", "String"),
      f("severity", "ActionableSeverity"),
      f("confidence", "String"),
      s("recommendationType", "RecommendationType", "recommendation_type"),
      s("automationMode", "AutomationMode", "automation_mode"),
      s("requiredPermissions", "String", "required_permissions", { isList: true }),
      s("requiredLicense", "String", "required_license", { isList: true }),
      s("expectedChange", "String", "expected_change", { isOptional: true }),
      s("blastRadius", "String", "blast_radius", { isOptional: true }),
      s("manualFallback", "String", "manual_fallback", { isOptional: true }),
      s("evidenceRequired", "Boolean", "evidence_required"),
      f("status", "RecommendationStatus"),
      s("sourceReferencesJson", "Json", "source_references_json"),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "ComplianceControlResultContract",
    modelName: "ComplianceControlResult",
    tableName: "compliance_control_results",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("assessmentId", "String", "assessment_id"),
      s("controlId", "String", "control_id"),
      f("jurisdiction", "String"),
      f("status", "ComplianceStatus"),
      f("confidence", "String"),
      s("providerSignalIds", "String", "provider_signal_ids", { isList: true }),
      s("evidenceArtifactIds", "String", "evidence_artifact_ids", { isList: true }),
      s("checklistRunItemIds", "String", "checklist_run_item_ids", { isList: true }),
      f("summary", "String"),
      s("evidenceCompletenessJson", "Json", "evidence_completeness_json"),
      s("sourceReferencesJson", "Json", "source_references_json"),
      s("evaluatedAt", "DateTime", "evaluated_at")
    ]
  },
  {
    contractName: "RoNis2ClassificationRunRecord",
    modelName: "RoNis2ClassificationRun",
    tableName: "ro_nis2_classification_runs",
    modelAttributes: ['@@index([organizationId, result, classifiedAt], map: "ro_nis2_classification_runs_org_result_idx")'],
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("assessmentId", "String", "assessment_id", { isOptional: true }),
      s("onboardingProgressId", "String", "onboarding_progress_id", { isOptional: true }),
      f("result", "RoNis2ClassificationResult"),
      s("article9Required", "Boolean", "article9_required"),
      s("notificationRecommended", "Boolean", "notification_recommended"),
      s("inputJson", "Json", "input_json"),
      s("reasonsJson", "Json", "reasons_json"),
      s("matchedRulesJson", "Json", "matched_rules_json"),
      s("missingRequiredFields", "String", "missing_required_fields", { isList: true }),
      s("sourceVersion", "String", "source_version"),
      s("sourceReferencesJson", "Json", "source_references_json"),
      s("classifiedAt", "DateTime", "classified_at")
    ]
  },
  {
    contractName: "ComplianceGapContract",
    modelName: "ComplianceGap",
    tableName: "compliance_gaps",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("assessmentId", "String", "assessment_id"),
      s("controlResultId", "String", "control_result_id", { isOptional: true }),
      s("controlId", "String", "control_id"),
      f("jurisdiction", "String"),
      f("status", "ComplianceStatus"),
      f("severity", "ActionableSeverity"),
      s("findingIds", "String", "finding_ids", { isList: true }),
      f("confidence", "String"),
      f("summary", "String"),
      s("findingsJson", "Json", "findings_json"),
      s("missingEvidenceJson", "Json", "missing_evidence_json"),
      s("recommendedActionsJson", "Json", "recommended_actions_json"),
      s("providerSignalsJson", "Json", "provider_signals_json"),
      s("manualTaskIds", "String", "manual_task_ids", { isList: true }),
      s("manualTasksJson", "Json", "manual_tasks_json"),
      s("countryPackWarningsJson", "Json", "country_pack_warnings_json"),
      s("sourceReferencesJson", "Json", "source_references_json"),
      s("createdAt", "DateTime", "created_at")
    ]
  },
  {
    contractName: "ReadinessPlanContract",
    modelName: "ReadinessPlan",
    tableName: "readiness_plans",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("assessmentId", "String", "assessment_id"),
      f("title", "String"),
      s("targetReadinessPercent", "Int", "target_readiness_percent"),
      f("status", "String"),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "ReadinessPlanItemContract",
    modelName: "ReadinessPlanItem",
    tableName: "readiness_plan_items",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("readinessPlanId", "String", "readiness_plan_id"),
      s("controlId", "String", "control_id", { isOptional: true }),
      s("providerRecommendationId", "String", "provider_recommendation_id", { isOptional: true }),
      f("jurisdiction", "String"),
      s("gapSummary", "String", "gap_summary"),
      s("recommendedAction", "String", "recommended_action"),
      s("actionType", "RecommendationType", "action_type"),
      s("ownerUserId", "String", "owner_user_id", { isOptional: true }),
      s("dueDate", "DateTime", "due_date", { isOptional: true }),
      s("automationAvailable", "Boolean", "automation_available"),
      s("evidenceRequired", "Boolean", "evidence_required"),
      s("findingIds", "String", "finding_ids", { isList: true }),
      s("manualTaskIds", "String", "manual_task_ids", { isList: true }),
      s("dependenciesJson", "Json", "dependencies_json"),
      f("status", "RecommendationStatus"),
      s("legalReviewRequired", "Boolean", "legal_review_required"),
      s("sourceReferencesJson", "Json", "source_references_json"),
      s("createdAt", "DateTime", "created_at")
    ]
  },
  {
    contractName: "EvidenceArtifactMetadata",
    modelName: "EvidenceArtifact",
    tableName: "evidence_artifacts",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("controlId", "String", "control_id", { isOptional: true }),
      f("jurisdiction", "String", { isOptional: true }),
      s("sourceType", "EvidenceSourceType", "source_type"),
      s("sourceProvider", "String", "source_provider", { isOptional: true }),
      s("providerConnectionId", "String", "provider_connection_id", { isOptional: true }),
      s("manualSourceLabel", "String", "manual_source_label", { isOptional: true }),
      f("title", "String"),
      f("description", "String", { isOptional: true }),
      s("storageUri", "String", "storage_uri"),
      s("contentHashSha256", "String", "content_hash_sha256"),
      s("mimeType", "String", "mime_type"),
      s("sizeBytes", "BigInt", "size_bytes", { isOptional: true }),
      s("scanStatus", "EvidenceScanStatus", "scan_status"),
      s("scanScannerName", "String", "scan_scanner_name", { isOptional: true }),
      s("scanFindingsJson", "Json", "scan_findings_json"),
      s("scannedAt", "DateTime", "scanned_at", { isOptional: true }),
      s("createdBy", "String", "created_by", { isOptional: true }),
      s("createdAt", "DateTime", "created_at"),
      s("validFrom", "DateTime", "valid_from", { isOptional: true }),
      s("validUntil", "DateTime", "valid_until", { isOptional: true }),
      s("linkedAssessmentId", "String", "linked_assessment_id", { isOptional: true }),
      s("linkedActionId", "String", "linked_action_id", { isOptional: true }),
      s("linkedSourceRecordId", "String", "linked_source_record_id", { isOptional: true }),
      s("exportGroupKey", "String", "export_group_key", { isOptional: true }),
      s("retentionPolicy", "String", "retention_policy", { isOptional: true }),
      s("retentionExpiresAt", "DateTime", "retention_expires_at", { isOptional: true })
    ]
  },
  {
    contractName: "EvidenceLink",
    modelName: "EvidenceLink",
    tableName: "evidence_links",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("evidenceArtifactId", "String", "evidence_artifact_id"),
      s("targetType", "String", "target_type"),
      s("targetId", "String", "target_id"),
      f("relation", "String"),
      s("createdAt", "DateTime", "created_at")
    ]
  },
  {
    contractName: "EvidenceAccessLogEntry",
    modelName: "EvidenceAccessLog",
    tableName: "evidence_access_logs",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("evidenceArtifactId", "String", "evidence_artifact_id"),
      s("actorUserId", "String", "actor_user_id", { isOptional: true }),
      f("action", "String"),
      s("ipAddress", "String", "ip_address", { isOptional: true }),
      s("userAgent", "String", "user_agent", { isOptional: true }),
      s("createdAt", "DateTime", "created_at")
    ]
  },
  {
    contractName: "BillingCustomerRecord",
    modelName: "BillingCustomer",
    tableName: "billing_customers",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("providerKey", "BillingProviderKey", "provider_key"),
      s("externalCustomerId", "String", "external_customer_id", { isOptional: true }),
      s("billingEmail", "String", "billing_email", { isOptional: true }),
      s("metadataJson", "Json", "metadata_json"),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "BillingSubscriptionRecord",
    modelName: "BillingSubscription",
    tableName: "billing_subscriptions",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("billingCustomerId", "String", "billing_customer_id"),
      s("providerKey", "BillingProviderKey", "provider_key"),
      s("externalSubscriptionId", "String", "external_subscription_id", { isOptional: true }),
      s("externalPriceId", "String", "external_price_id", { isOptional: true }),
      s("externalProductId", "String", "external_product_id", { isOptional: true }),
      s("subscriptionStatus", "BillingSubscriptionStatus", "subscription_status"),
      s("currentPeriodStart", "DateTime", "current_period_start", { isOptional: true }),
      s("currentPeriodEnd", "DateTime", "current_period_end", { isOptional: true }),
      s("cancelAtPeriodEnd", "Boolean", "cancel_at_period_end"),
      s("trialEnd", "DateTime", "trial_end", { isOptional: true }),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "BillingEntitlementRecord",
    modelName: "BillingEntitlement",
    tableName: "billing_entitlements",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("entitlementKey", "String", "entitlement_key"),
      f("enabled", "Boolean"),
      f("source", "String"),
      s("expiresAt", "DateTime", "expires_at", { isOptional: true }),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "BillingEventRecord",
    modelName: "BillingEvent",
    tableName: "billing_events",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id", { isOptional: true }),
      s("providerKey", "BillingProviderKey", "provider_key"),
      s("externalEventId", "String", "external_event_id"),
      s("eventType", "String", "event_type"),
      s("payloadJson", "Json", "payload_json"),
      s("processedAt", "DateTime", "processed_at", { isOptional: true }),
      s("createdAt", "DateTime", "created_at")
    ]
  },
  {
    contractName: "RegulatorySourceRecord",
    modelName: "RegulatorySource",
    tableName: "regulatory_sources",
    fields: [
      f("id", "String"),
      s("frameworkKey", "String", "framework_key"),
      f("jurisdiction", "String"),
      s("sourceType", "RegulatorySourceType", "source_type"),
      f("title", "String"),
      f("url", "String", { isOptional: true }),
      s("localFilePath", "String", "local_file_path", { isOptional: true }),
      s("publicationDate", "DateTime", "publication_date", { isOptional: true }),
      s("lastCheckedAt", "DateTime", "last_checked_at", { isOptional: true }),
      s("versionLabel", "String", "version_label", { isOptional: true }),
      s("authorityName", "String", "authority_name", { isOptional: true }),
      s("trustLevel", "RegulatorySourceTrustLevel", "trust_level"),
      f("status", "RegulatorySourceStatus"),
      s("activationStatus", "RegulatorySourceStatus", "activation_status"),
      s("activeVersionId", "String", "active_version_id", { isOptional: true }),
      f("notes", "String", { isOptional: true }),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "RegulatorySourceVersionRecord",
    modelName: "RegulatorySourceVersion",
    tableName: "regulatory_source_versions",
    fields: [
      f("id", "String"),
      s("sourceId", "String", "source_id"),
      s("versionLabel", "String", "version_label"),
      s("contentHashSha256", "String", "content_hash_sha256", { isOptional: true }),
      s("activationStatus", "RegulatorySourceStatus", "activation_status"),
      s("validationStatus", "String", "validation_status"),
      s("metadataJson", "Json", "metadata_json"),
      s("importValidationReportJson", "Json", "import_validation_report_json"),
      s("activatedAt", "DateTime", "activated_at", { isOptional: true }),
      s("activatedBy", "String", "activated_by", { isOptional: true }),
      s("supersededAt", "DateTime", "superseded_at", { isOptional: true }),
      s("supersededByVersionId", "String", "superseded_by_version_id", { isOptional: true }),
      s("createdAt", "DateTime", "created_at")
    ]
  },
  {
    contractName: "RegulatorySourceMapEntryRecord",
    modelName: "RegulatorySourceMap",
    tableName: "regulatory_source_maps",
    fields: [
      f("id", "String"),
      s("sourceId", "String", "source_id"),
      s("sourceVersionId", "String", "source_version_id", { isOptional: true }),
      s("targetCollection", "String", "target_collection"),
      s("targetKey", "String", "target_key"),
      s("sourceLocation", "String", "source_location"),
      s("mappingJson", "Json", "mapping_json"),
      s("createdAt", "DateTime", "created_at")
    ]
  },
  {
    contractName: "RegulatoryReviewTaskRecord",
    modelName: "RegulatoryReviewTask",
    tableName: "regulatory_review_tasks",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id", { isOptional: true }),
      s("sourceId", "String", "source_id", { isOptional: true }),
      s("sourceVersionId", "String", "source_version_id", { isOptional: true }),
      s("countryPackVersionId", "String", "country_pack_version_id", { isOptional: true }),
      s("assignedRoleKey", "String", "assigned_role_key"),
      f("status", "RegulatoryReviewTaskStatus"),
      f("reason", "String"),
      s("createdForStatus", "RegulatorySourceStatus", "created_for_status"),
      s("metadataJson", "Json", "metadata_json"),
      s("createdAt", "DateTime", "created_at"),
      s("resolvedAt", "DateTime", "resolved_at", { isOptional: true })
    ]
  },
  {
    contractName: "RegulatoryReviewDecisionRecord",
    modelName: "RegulatoryReviewDecision",
    tableName: "regulatory_review_decisions",
    fields: [
      f("id", "String"),
      s("taskId", "String", "task_id"),
      s("sourceVersionId", "String", "source_version_id", { isOptional: true }),
      f("decision", "RegulatoryReviewDecisionType"),
      s("decidedBy", "String", "decided_by"),
      s("decidedAt", "DateTime", "decided_at"),
      f("notes", "String", { isOptional: true }),
      s("decisionJson", "Json", "decision_json")
    ]
  },
  {
    contractName: "ProviderActionRunContract",
    modelName: "ProviderActionRun",
    tableName: "provider_action_runs",
    modelAttributes: ['@@unique([organizationId, idempotencyKey], map: "provider_action_runs_org_idempotency_key_key")'],
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("idempotencyKey", "String", "idempotency_key", { isOptional: true }),
      s("providerConnectionId", "String", "provider_connection_id"),
      s("recommendationId", "String", "recommendation_id", { isOptional: true }),
      s("actionTemplateId", "String", "action_template_id", { isOptional: true }),
      s("controlId", "String", "control_id"),
      f("jurisdiction", "String"),
      s("providerKey", "String", "provider_key"),
      s("moduleKey", "String", "module_key", { isOptional: true }),
      s("actionKey", "String", "action_key"),
      s("actionType", "RecommendationType", "action_type"),
      s("automationMode", "AutomationMode", "automation_mode"),
      f("title", "String"),
      s("riskLevel", "ActionableSeverity", "risk_level"),
      s("licenseRequired", "String", "license_required", { isList: true }),
      s("permissionsRequired", "String", "permissions_required", { isList: true }),
      s("preconditionsJson", "Json", "preconditions_json"),
      s("expectedChange", "String", "expected_change"),
      s("blastRadius", "String", "blast_radius"),
      s("rollbackStrategy", "String", "rollback_strategy"),
      s("manualFallback", "String", "manual_fallback"),
      s("evidenceRequired", "Boolean", "evidence_required"),
      s("highRiskForbiddenInV1", "Boolean", "high_risk_forbidden_in_v1"),
      f("status", "ProviderActionRunStatus"),
      s("approvalStatus", "ProviderActionApprovalStatus", "approval_status"),
      s("approvalRequestedBy", "String", "approval_requested_by", { isOptional: true }),
      s("approvalRequestedAt", "DateTime", "approval_requested_at", { isOptional: true }),
      s("approvedBy", "String", "approved_by", { isOptional: true }),
      s("approvedAt", "DateTime", "approved_at", { isOptional: true }),
      s("approvalRejectedBy", "String", "approval_rejected_by", { isOptional: true }),
      s("approvalRejectedAt", "DateTime", "approval_rejected_at", { isOptional: true }),
      s("approvalRejectionReason", "String", "approval_rejection_reason", { isOptional: true }),
      s("preflightStatus", "ProviderActionPreflightStatus", "preflight_status"),
      s("preflightJson", "Json", "preflight_json"),
      s("preStateSnapshotJson", "Json", "pre_state_snapshot_json"),
      s("postStateSnapshotJson", "Json", "post_state_snapshot_json"),
      s("verificationStatus", "ProviderActionVerificationStatus", "verification_status"),
      s("verificationJson", "Json", "verification_json"),
      s("evidenceArtifactIds", "String", "evidence_artifact_ids", { isList: true }),
      s("checklistTaskIds", "String", "checklist_task_ids", { isList: true }),
      s("workerJobJson", "Json", "worker_job_json"),
      s("failureReason", "String", "failure_reason", { isOptional: true }),
      s("closedBy", "String", "closed_by", { isOptional: true }),
      s("closedAt", "DateTime", "closed_at", { isOptional: true }),
      s("executedByService", "String", "executed_by_service", { isOptional: true }),
      s("executedAt", "DateTime", "executed_at", { isOptional: true }),
      s("runJson", "Json", "run_json"),
      s("sourceReferencesJson", "Json", "source_references_json"),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "GeneratedReportRecord",
    modelName: "GeneratedReport",
    tableName: "generated_reports",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("assessmentId", "String", "assessment_id", { isOptional: true }),
      s("reportType", "String", "report_type"),
      f("jurisdiction", "String", { isOptional: true }),
      f("status", "GeneratedReportStatus"),
      s("legalCaveat", "String", "legal_caveat"),
      s("sourceReferencesJson", "Json", "source_references_json"),
      s("reportDataJson", "Json", "report_data_json"),
      s("evidenceArtifactId", "String", "evidence_artifact_id", { isOptional: true }),
      s("contentHashSha256", "String", "content_hash_sha256", { isOptional: true }),
      s("createdBy", "String", "created_by", { isOptional: true }),
      s("createdAt", "DateTime", "created_at")
    ]
  },
  {
    contractName: "ReportExportMetadata",
    modelName: "ReportExport",
    tableName: "report_exports",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("generatedReportId", "String", "generated_report_id"),
      s("exportFormat", "String", "export_format"),
      f("status", "ExportStatus"),
      s("storageUri", "String", "storage_uri", { isOptional: true }),
      s("contentHashSha256", "String", "content_hash_sha256", { isOptional: true }),
      s("createdAt", "DateTime", "created_at"),
      s("expiresAt", "DateTime", "expires_at", { isOptional: true })
    ]
  },
  {
    contractName: "DashboardSnapshotRecord",
    modelName: "DashboardSnapshot",
    tableName: "dashboard_snapshots",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("assessmentId", "String", "assessment_id", { isOptional: true }),
      s("snapshotType", "String", "snapshot_type"),
      f("source", "String"),
      s("snapshotJson", "Json", "snapshot_json"),
      s("createdAt", "DateTime", "created_at")
    ]
  },
  {
    contractName: "DashboardWidgetContract",
    modelName: "DashboardWidget",
    tableName: "dashboard_widgets",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("dashboardSnapshotId", "String", "dashboard_snapshot_id"),
      s("widgetKey", "String", "widget_key"),
      f("title", "String"),
      s("valueJson", "Json", "value_json"),
      s("sourceQuery", "String", "source_query")
    ]
  },
  {
    contractName: "NotificationDraftContract",
    modelName: "NotificationDraft",
    tableName: "notification_drafts",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("assessmentId", "String", "assessment_id", { isOptional: true }),
      f("jurisdiction", "String"),
      s("notificationType", "String", "notification_type"),
      f("status", "NotificationDraftStatus"),
      s("payloadJson", "Json", "payload_json"),
      s("sourceReferencesJson", "Json", "source_references_json"),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  },
  {
    contractName: "RoNis2NotificationDraftContract",
    modelName: "RoNis2NotificationDraft",
    tableName: "ro_nis2_notification_drafts",
    fields: [
      f("id", "String"),
      s("organizationId", "String", "organization_id"),
      s("assessmentId", "String", "assessment_id", { isOptional: true }),
      s("onboardingProgressId", "String", "onboarding_progress_id", { isOptional: true }),
      s("classificationRunId", "String", "classification_run_id", { isOptional: true }),
      s("notificationDraftId", "String", "notification_draft_id", { isOptional: true }),
      f("status", "NotificationDraftStatus"),
      s("payloadJson", "Json", "payload_json"),
      s("sourceReferencesJson", "Json", "source_references_json"),
      s("legalCaveat", "String", "legal_caveat"),
      s("createdBy", "String", "created_by", { isOptional: true }),
      s("createdAt", "DateTime", "created_at"),
      s("updatedAt", "DateTime", "updated_at")
    ]
  }
];

export const parsePrismaModels = (schemaText: string): Map<string, ParsedPrismaModel> => {
  const models = new Map<string, ParsedPrismaModel>();

  for (const [, modelName, body] of schemaText.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\n\}/g)) {
    const tableName = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? modelName;
    const fields = new Map<string, ParsedPrismaField>();
    const modelAttributes: string[] = [];

    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//")) {
        continue;
      }

      if (line.startsWith("@@")) {
        modelAttributes.push(line);
        continue;
      }

      const [name, rawType, ...attributeParts] = line.split(/\s+/);
      if (!name || !rawType || name.startsWith("@")) {
        continue;
      }

      let normalizedType = rawType;
      const isList = normalizedType.endsWith("[]");
      if (isList) {
        normalizedType = normalizedType.slice(0, -2);
      }

      const isOptional = normalizedType.endsWith("?");
      if (isOptional) {
        normalizedType = normalizedType.slice(0, -1);
      }

      const attributes = attributeParts.join(" ");
      fields.set(name, {
        attributes,
        isList,
        isOptional,
        mappedName: attributes.match(/@map\("([^"]+)"\)/)?.[1],
        name,
        rawLine: line,
        type: normalizedType
      });
    }

    models.set(modelName, {
      fields,
      modelAttributes,
      modelName,
      tableName
    });
  }

  return models;
};

export const checkPrismaContractDrift = (input: {
  expectations?: PrismaModelExpectation[];
  schemaText: string;
}): DriftCheckResult => {
  const expectations = input.expectations ?? defaultPrismaDriftExpectations;
  const models = parsePrismaModels(input.schemaText);
  const issues: DriftIssue[] = [];
  let checkedFields = 0;

  for (const expectation of expectations) {
    const model = models.get(expectation.modelName);
    if (!model) {
      issues.push({
        kind: "missing_model",
        message: `${expectation.contractName} expects Prisma model ${expectation.modelName}, but it was not found.`,
        modelName: expectation.modelName
      });
      continue;
    }

    if (model.tableName !== expectation.tableName) {
      issues.push({
        actual: model.tableName,
        expected: expectation.tableName,
        kind: "table_name_mismatch",
        message: `${expectation.modelName} maps to ${model.tableName}, expected ${expectation.tableName}.`,
        modelName: expectation.modelName
      });
    }

    for (const expectedField of expectation.fields) {
      checkedFields += 1;
      const actual = model.fields.get(expectedField.name);
      if (!actual) {
        issues.push({
          expected: expectedField.type,
          fieldName: expectedField.name,
          kind: "missing_field",
          message: `${expectation.modelName}.${expectedField.name} is required by ${expectation.contractName}.`,
          modelName: expectation.modelName
        });
        continue;
      }

      if (actual.type !== expectedField.type) {
        issues.push({
          actual: actual.type,
          expected: expectedField.type,
          fieldName: expectedField.name,
          kind: "type_mismatch",
          message: `${expectation.modelName}.${expectedField.name} has type ${actual.type}, expected ${expectedField.type}.`,
          modelName: expectation.modelName
        });
      }

      if (actual.isList !== Boolean(expectedField.isList)) {
        issues.push({
          actual: String(actual.isList),
          expected: String(Boolean(expectedField.isList)),
          fieldName: expectedField.name,
          kind: "list_mismatch",
          message: `${expectation.modelName}.${expectedField.name} list shape drifted.`,
          modelName: expectation.modelName
        });
      }

      if (actual.isOptional !== Boolean(expectedField.isOptional)) {
        issues.push({
          actual: String(actual.isOptional),
          expected: String(Boolean(expectedField.isOptional)),
          fieldName: expectedField.name,
          kind: "optional_mismatch",
          message: `${expectation.modelName}.${expectedField.name} optional/nullability shape drifted.`,
          modelName: expectation.modelName
        });
      }

      if (expectedField.mappedName && actual.mappedName !== expectedField.mappedName) {
        issues.push({
          actual: actual.mappedName,
          expected: expectedField.mappedName,
          fieldName: expectedField.name,
          kind: "map_mismatch",
          message: `${expectation.modelName}.${expectedField.name} maps to ${actual.mappedName ?? "(none)"}, expected ${expectedField.mappedName}.`,
          modelName: expectation.modelName
        });
      }
    }

    for (const expectedAttribute of expectation.modelAttributes ?? []) {
      if (!model.modelAttributes.includes(expectedAttribute)) {
        issues.push({
          expected: expectedAttribute,
          kind: "missing_model_attribute",
          message: `${expectation.modelName} is missing model attribute ${expectedAttribute}.`,
          modelName: expectation.modelName
        });
      }
    }
  }

  return {
    checkedFields,
    checkedModels: expectations.length,
    issues,
    valid: issues.length === 0
  };
};

export const formatPrismaContractDriftResult = (result: DriftCheckResult): string => {
  if (result.valid) {
    return `Prisma schema/contract drift check passed (${result.checkedModels} models, ${result.checkedFields} fields).`;
  }

  return [
    `Prisma schema/contract drift check failed (${result.issues.length} issue${result.issues.length === 1 ? "" : "s"}):`,
    ...result.issues.map((issue) => `- ${issue.message}`)
  ].join("\n");
};

export const runPrismaContractDriftCheck = (workspaceRoot = process.cwd()): DriftCheckResult => {
  const schemaPath = join(workspaceRoot, "packages/database/prisma/schema.prisma");
  return checkPrismaContractDrift({
    schemaText: readFileSync(schemaPath, "utf8")
  });
};

const isDirectRun = (): boolean => {
  const executedPath = process.argv[1];
  return executedPath ? pathToFileURL(executedPath).href === import.meta.url : false;
};

if (isDirectRun()) {
  const result = runPrismaContractDriftCheck();
  const formatted = formatPrismaContractDriftResult(result);
  if (result.valid) {
    console.log(formatted);
  } else {
    console.error(formatted);
    process.exit(1);
  }
}
