-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AuthProviderKey" AS ENUM ('local', 'microsoft_entra', 'google', 'github', 'keycloak_broker');

-- CreateEnum
CREATE TYPE "OrganizationMemberStatus" AS ENUM ('invited', 'active', 'suspended', 'removed');

-- CreateEnum
CREATE TYPE "ProviderConnectionStatus" AS ENUM ('pending', 'connected', 'degraded', 'revoked', 'failed');

-- CreateEnum
CREATE TYPE "ProviderCredentialType" AS ENUM ('oauth_token', 'certificate', 'service_account', 'api_key');

-- CreateEnum
CREATE TYPE "ProviderModuleStatus" AS ENUM ('pending', 'running', 'succeeded', 'partial', 'failed', 'skipped', 'unavailable_license', 'missing_permission', 'unsupported_api', 'rate_limited', 'revoked_consent');

-- CreateEnum
CREATE TYPE "ResourceLifecycleStatus" AS ENUM ('active', 'stale', 'deleted');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('informational', 'low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "ActionableSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('open', 'acknowledged', 'resolved', 'suppressed');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('manual', 'guided', 'technical', 'process', 'evidence_upload', 'country_registration', 'incident_reporting');

-- CreateEnum
CREATE TYPE "AutomationMode" AS ENUM ('manual', 'guided', 'preflightable', 'executable_later');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('proposed', 'accepted', 'planned', 'completed', 'dismissed');

-- CreateEnum
CREATE TYPE "ProviderActionRunStatus" AS ENUM ('draft', 'preflight_pending', 'preflight_failed', 'approval_requested', 'approved', 'queued', 'running', 'succeeded', 'failed', 'verification_failed', 'canceled');

-- CreateEnum
CREATE TYPE "RegulatorySourceType" AS ENUM ('directive', 'regulation', 'official_national_law', 'official_authority_guidance', 'official_registration_portal', 'official_commission_country_page', 'enisa_reference', 'secondary_tracker', 'internal_excel_seed');

-- CreateEnum
CREATE TYPE "RegulatorySourceTrustLevel" AS ENUM ('primary', 'secondary', 'internal_seed');

-- CreateEnum
CREATE TYPE "RegulatorySourceStatus" AS ENUM ('draft', 'validated', 'review_required', 'active', 'stale', 'superseded', 'unreachable', 'needs_review', 'deprecated');

-- CreateEnum
CREATE TYPE "RegulatoryReviewTaskStatus" AS ENUM ('open', 'reviewed', 'rejected', 'activated');

-- CreateEnum
CREATE TYPE "RegulatoryReviewDecisionType" AS ENUM ('reviewed', 'rejected', 'activated');

-- CreateEnum
CREATE TYPE "CountryPackCompleteness" AS ENUM ('baseline_only', 'planned_full_pack', 'official_sources_identified', 'registration_rules_partial', 'classification_rules_partial', 'incident_rules_partial', 'full_pack_ready', 'requires_legal_review', 'deprecated');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('draft', 'running', 'completed', 'superseded');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('not_started', 'not_applicable', 'passing', 'failing', 'partial', 'unsupported', 'needs_evidence', 'accepted_risk');

-- CreateEnum
CREATE TYPE "EvidenceSourceType" AS ENUM ('provider_snapshot', 'manual_upload', 'generated_report', 'signed_document', 'checklist_completion', 'action_pre_state', 'action_post_state', 'audit_log_export', 'policy_document', 'risk_acceptance', 'regulatory_source_snapshot', 'country_registration_draft', 'incident_reporting_draft');

-- CreateEnum
CREATE TYPE "EvidenceScanStatus" AS ENUM ('pending', 'clean', 'infected', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "GeneratedReportStatus" AS ENUM ('draft', 'rendering', 'ready', 'failed', 'superseded');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('queued', 'running', 'ready', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "NotificationDraftStatus" AS ENUM ('draft', 'ready_for_review', 'exported', 'superseded');

-- CreateEnum
CREATE TYPE "RoNis2ClassificationResult" AS ENUM ('insufficient_data', 'out_of_scope', 'voluntary_registration_possible', 'important_entity', 'essential_entity');

-- CreateEnum
CREATE TYPE "RoNis2OnboardingStatus" AS ENUM ('draft', 'in_progress', 'ready_for_classification', 'classification_complete', 'ready_for_notification_export');

-- CreateEnum
CREATE TYPE "BillingProviderKey" AS ENUM ('none', 'stripe', 'offline_license');

-- CreateEnum
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused', 'offline_active', 'none');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "locale" TEXT DEFAULT 'en',
    "disabled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_key" "AuthProviderKey" NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "provider_email" TEXT,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "identity_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_credentials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_hash_algorithm" TEXT NOT NULL,
    "password_updated_at" TIMESTAMP(3) NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "active_organization_id" UUID,
    "session_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_factors" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "factor_type" TEXT NOT NULL,
    "display_name" TEXT,
    "secret_hash" TEXT,
    "enabled_at" TIMESTAMP(3),
    "disabled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "billing_status" TEXT NOT NULL DEFAULT 'none',
    "default_locale" TEXT NOT NULL DEFAULT 'en',
    "primary_country_code" TEXT,
    "headquarters_country_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'invited',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_bindings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "scope_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "actor_user_id" UUID,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "action" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "legal_name" TEXT,
    "tax_identifier" TEXT,
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_profile_id" UUID,
    "entity_name" TEXT NOT NULL,
    "sector_json" JSONB NOT NULL DEFAULT '{}',
    "size_json" JSONB NOT NULL DEFAULT '{}',
    "answers_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_locations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_profile_id" UUID NOT NULL,
    "country_code" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "address_line" TEXT,
    "is_headquarters" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_contacts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_profile_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,

    CONSTRAINT "business_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_services" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_profile_id" UUID NOT NULL,
    "service_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criticality" TEXT,

    CONSTRAINT "business_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_service_countries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_service_id" UUID NOT NULL,
    "country_code" TEXT NOT NULL,

    CONSTRAINT "business_service_countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_nace_codes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_profile_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "business_nace_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_size_assessments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_profile_id" UUID NOT NULL,
    "employee_count" INTEGER,
    "annual_revenue" DECIMAL(65,30),
    "balance_sheet_total" DECIMAL(65,30),
    "size_category" TEXT,
    "source_json" JSONB NOT NULL DEFAULT '{}',
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_size_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jurisdiction_assessments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_profile_id" UUID,
    "jurisdiction" TEXT NOT NULL,
    "applicability" TEXT NOT NULL,
    "classification" TEXT,
    "rationale_json" JSONB NOT NULL DEFAULT '{}',
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jurisdiction_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ro_nis2_onboarding_progress" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID,
    "business_profile_id" UUID,
    "status" "RoNis2OnboardingStatus" NOT NULL DEFAULT 'draft',
    "current_step" TEXT NOT NULL,
    "completed_steps" TEXT[],
    "answers_json" JSONB NOT NULL DEFAULT '{}',
    "source_version" TEXT NOT NULL,
    "source_references_json" JSONB NOT NULL DEFAULT '[]',
    "missing_required_fields" TEXT[],
    "saved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ro_nis2_onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_profile_id" UUID,
    "title" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "storage_uri" TEXT NOT NULL,
    "content_hash_sha256" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_connections" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "external_tenant_id" TEXT,
    "external_tenant_name" TEXT,
    "status" "ProviderConnectionStatus" NOT NULL DEFAULT 'pending',
    "read_enabled" BOOLEAN NOT NULL DEFAULT true,
    "write_enabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "last_successful_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_credentials" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_connection_id" UUID NOT NULL,
    "credential_type" "ProviderCredentialType" NOT NULL,
    "encrypted_payload" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "rotation_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_permission_bundles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_connection_id" UUID NOT NULL,
    "provider_key" TEXT NOT NULL,
    "bundle_key" TEXT NOT NULL,
    "permissions_required" TEXT[],
    "permissions_granted" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_permission_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_capabilities" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_connection_id" UUID NOT NULL,
    "provider_key" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "capability_key" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "license_required" TEXT[],
    "license_detected" TEXT[],
    "permissions_required" TEXT[],
    "permissions_granted" TEXT[],
    "status" "ProviderModuleStatus" NOT NULL DEFAULT 'pending',
    "status_reason" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_sync_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_connection_id" UUID NOT NULL,
    "provider_key" TEXT NOT NULL,
    "status" "ProviderModuleStatus" NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_json" JSONB,
    "summary_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "provider_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_sync_modules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_connection_id" UUID NOT NULL,
    "sync_run_id" UUID NOT NULL,
    "provider_key" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "status" "ProviderModuleStatus" NOT NULL DEFAULT 'pending',
    "missing_permissions" TEXT[],
    "missing_licenses" TEXT[],
    "status_reason" TEXT,
    "pages_read" INTEGER NOT NULL DEFAULT 0,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "provider_sync_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_raw_resources" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_connection_id" UUID NOT NULL,
    "provider_key" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "external_resource_type" TEXT NOT NULL,
    "source_module" TEXT NOT NULL,
    "sync_run_id" UUID NOT NULL,
    "raw_json" JSONB NOT NULL,
    "content_hash" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "lifecycle_status" "ResourceLifecycleStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "provider_raw_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_normalized_resources" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_connection_id" UUID NOT NULL,
    "provider_key" TEXT NOT NULL,
    "raw_resource_id" UUID,
    "external_id" TEXT NOT NULL,
    "external_resource_type" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "source_module" TEXT NOT NULL,
    "normalized_json" JSONB NOT NULL,
    "content_hash" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "lifecycle_status" "ResourceLifecycleStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "provider_normalized_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_findings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_connection_id" UUID NOT NULL,
    "normalized_resource_id" UUID,
    "sync_run_id" UUID,
    "provider_key" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "finding_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'open',
    "evidence_json" JSONB NOT NULL DEFAULT '{}',
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "provider_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_recommendations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID,
    "provider_connection_id" UUID,
    "source_finding_id" UUID,
    "source_finding_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "manual_task_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "provider_key" TEXT NOT NULL,
    "module_key" TEXT,
    "control_id" TEXT,
    "jurisdiction" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" "ActionableSeverity" NOT NULL,
    "confidence" TEXT NOT NULL,
    "recommendation_type" "RecommendationType" NOT NULL,
    "automation_mode" "AutomationMode" NOT NULL,
    "required_permissions" TEXT[],
    "required_license" TEXT[],
    "expected_change" TEXT,
    "blast_radius" TEXT,
    "manual_fallback" TEXT,
    "evidence_required" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'proposed',
    "source_references_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_action_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "provider_key" TEXT NOT NULL,
    "module_key" TEXT,
    "action_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "risk_level" "FindingSeverity" NOT NULL,
    "license_required" TEXT[],
    "permissions_required" TEXT[],
    "preconditions_json" JSONB NOT NULL DEFAULT '{}',
    "expected_change" TEXT NOT NULL,
    "blast_radius" TEXT NOT NULL,
    "rollback_strategy" TEXT NOT NULL,
    "manual_fallback" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_action_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_action_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_connection_id" UUID NOT NULL,
    "recommendation_id" UUID,
    "action_template_id" UUID,
    "provider_key" TEXT NOT NULL,
    "module_key" TEXT,
    "action_type" TEXT NOT NULL,
    "status" "ProviderActionRunStatus" NOT NULL DEFAULT 'draft',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "executed_by_service" TEXT,
    "executed_at" TIMESTAMP(3),
    "pre_state_evidence_id" UUID,
    "post_state_evidence_id" UUID,
    "verification_status" TEXT,
    "run_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_action_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_frameworks" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulatory_frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_framework_versions" (
    "id" UUID NOT NULL,
    "framework_id" UUID NOT NULL,
    "version_label" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3),
    "effective_until" TIMESTAMP(3),
    "source_json" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',

    CONSTRAINT "regulatory_framework_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_sources" (
    "id" UUID NOT NULL,
    "framework_key" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "source_type" "RegulatorySourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "local_file_path" TEXT,
    "publication_date" TIMESTAMP(3),
    "last_checked_at" TIMESTAMP(3),
    "version_label" TEXT,
    "authority_name" TEXT,
    "trust_level" "RegulatorySourceTrustLevel" NOT NULL,
    "status" "RegulatorySourceStatus" NOT NULL DEFAULT 'draft',
    "activation_status" "RegulatorySourceStatus" NOT NULL DEFAULT 'draft',
    "active_version_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulatory_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_source_versions" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "version_label" TEXT NOT NULL,
    "content_hash_sha256" TEXT,
    "activation_status" "RegulatorySourceStatus" NOT NULL DEFAULT 'draft',
    "validation_status" TEXT NOT NULL DEFAULT 'not_validated',
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "import_validation_report_json" JSONB NOT NULL DEFAULT '{}',
    "activated_at" TIMESTAMP(3),
    "activated_by" UUID,
    "superseded_at" TIMESTAMP(3),
    "superseded_by_version_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulatory_source_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_source_snapshots" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "source_version_id" UUID,
    "storage_uri" TEXT NOT NULL,
    "content_hash_sha256" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulatory_source_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_review_tasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "source_id" UUID,
    "source_version_id" UUID,
    "country_pack_version_id" UUID,
    "assigned_role_key" TEXT NOT NULL DEFAULT 'regulatory_admin',
    "status" "RegulatoryReviewTaskStatus" NOT NULL DEFAULT 'open',
    "reason" TEXT NOT NULL,
    "created_for_status" "RegulatorySourceStatus" NOT NULL DEFAULT 'review_required',
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "regulatory_review_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_review_decisions" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "source_version_id" UUID,
    "decision" "RegulatoryReviewDecisionType" NOT NULL,
    "decided_by" UUID NOT NULL,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "decision_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "regulatory_review_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jurisdictions" (
    "id" UUID NOT NULL,
    "country_code" TEXT NOT NULL,
    "country_name" TEXT NOT NULL,
    "official_languages" TEXT[],
    "currency" TEXT NOT NULL,
    "commission_country_page_url" TEXT,
    "national_authority_status" TEXT NOT NULL DEFAULT 'unknown',
    "country_pack_status" "CountryPackCompleteness" NOT NULL DEFAULT 'baseline_only',
    "last_source_reviewed_at" TIMESTAMP(3),
    "next_review_due_at" TIMESTAMP(3),

    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_packs" (
    "id" UUID NOT NULL,
    "country_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "completeness" "CountryPackCompleteness" NOT NULL DEFAULT 'baseline_only',
    "active_version_id" UUID,
    "unsupported_features" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "country_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_pack_versions" (
    "id" UUID NOT NULL,
    "country_pack_id" UUID NOT NULL,
    "version_label" TEXT NOT NULL,
    "completeness" "CountryPackCompleteness" NOT NULL,
    "source_summary_json" JSONB NOT NULL DEFAULT '{}',
    "status" "RegulatorySourceStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),

    CONSTRAINT "country_pack_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_questions" (
    "id" UUID NOT NULL,
    "country_pack_version_id" UUID,
    "framework_key" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "question_key" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer_type" TEXT NOT NULL,
    "source_map_id" UUID,

    CONSTRAINT "regulatory_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_options" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "option_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "regulatory_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_answers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "assessment_id" UUID,
    "answer_json" JSONB NOT NULL,
    "answered_by" UUID,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulatory_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_source_maps" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "source_version_id" UUID,
    "target_collection" TEXT NOT NULL,
    "target_key" TEXT NOT NULL,
    "source_location" TEXT NOT NULL,
    "mapping_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulatory_source_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_catalog" (
    "id" UUID NOT NULL,
    "framework_key" TEXT NOT NULL,
    "jurisdiction_scope" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "control_group" TEXT NOT NULL,
    "applicability" TEXT NOT NULL,
    "implementation_type" TEXT NOT NULL,
    "active_version_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_versions" (
    "id" UUID NOT NULL,
    "control_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "body_json" JSONB NOT NULL,
    "status" "RegulatorySourceStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),

    CONSTRAINT "control_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_legal_references" (
    "id" UUID NOT NULL,
    "control_id" TEXT NOT NULL,
    "source_record_id" UUID NOT NULL,
    "article" TEXT,
    "paragraph" TEXT,
    "annex" TEXT,
    "national_reference" TEXT,
    "source_url" TEXT,
    "source_version" TEXT,

    CONSTRAINT "control_legal_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_provider_mappings" (
    "id" UUID NOT NULL,
    "control_id" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "signal_keys" TEXT[],
    "recommendation_keys" TEXT[],
    "can_auto_evaluate" BOOLEAN NOT NULL DEFAULT false,
    "can_auto_remediate" BOOLEAN NOT NULL DEFAULT false,
    "license_requirements" TEXT[],
    "permission_requirements" TEXT[],

    CONSTRAINT "control_provider_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_evidence_requirements" (
    "id" UUID NOT NULL,
    "control_id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "requirement_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source_map_id" UUID,

    CONSTRAINT "control_evidence_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_assessments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "framework_key" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'draft',
    "input_json" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ro_nis2_classification_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID,
    "onboarding_progress_id" UUID,
    "result" "RoNis2ClassificationResult" NOT NULL,
    "article9_required" BOOLEAN NOT NULL DEFAULT false,
    "notification_recommended" BOOLEAN NOT NULL DEFAULT false,
    "input_json" JSONB NOT NULL DEFAULT '{}',
    "reasons_json" JSONB NOT NULL DEFAULT '[]',
    "matched_rules_json" JSONB NOT NULL DEFAULT '[]',
    "missing_required_fields" TEXT[],
    "source_version" TEXT NOT NULL,
    "source_references_json" JSONB NOT NULL DEFAULT '[]',
    "classified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ro_nis2_classification_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_control_results" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "control_id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "status" "ComplianceStatus" NOT NULL,
    "confidence" TEXT NOT NULL,
    "provider_signal_ids" TEXT[],
    "evidence_artifact_ids" TEXT[],
    "checklist_run_item_ids" TEXT[],
    "summary" TEXT NOT NULL,
    "evidence_completeness_json" JSONB NOT NULL DEFAULT '{}',
    "source_references_json" JSONB NOT NULL DEFAULT '[]',
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_control_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_result_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "catalog_version" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "result_set_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_result_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_gaps" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "control_result_id" UUID,
    "control_id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "status" "ComplianceStatus" NOT NULL,
    "severity" "ActionableSeverity" NOT NULL,
    "finding_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "findings_json" JSONB NOT NULL DEFAULT '[]',
    "missing_evidence_json" JSONB NOT NULL DEFAULT '[]',
    "recommended_actions_json" JSONB NOT NULL DEFAULT '[]',
    "provider_signals_json" JSONB NOT NULL DEFAULT '[]',
    "manual_task_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "manual_tasks_json" JSONB NOT NULL DEFAULT '[]',
    "country_pack_warnings_json" JSONB NOT NULL DEFAULT '[]',
    "source_references_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readiness_plans" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "target_readiness_percent" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readiness_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readiness_plan_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "readiness_plan_id" UUID NOT NULL,
    "control_id" TEXT,
    "provider_recommendation_id" TEXT,
    "jurisdiction" TEXT NOT NULL,
    "gap_summary" TEXT NOT NULL,
    "recommended_action" TEXT NOT NULL,
    "action_type" "RecommendationType" NOT NULL,
    "owner_user_id" UUID,
    "due_date" DATE,
    "automation_available" BOOLEAN NOT NULL DEFAULT false,
    "evidence_required" BOOLEAN NOT NULL DEFAULT false,
    "finding_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "manual_task_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dependencies_json" JSONB NOT NULL DEFAULT '[]',
    "status" "RecommendationStatus" NOT NULL DEFAULT 'proposed',
    "legal_review_required" BOOLEAN NOT NULL DEFAULT false,
    "source_references_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readiness_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_acceptances" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "control_id" TEXT NOT NULL,
    "assessment_id" UUID,
    "accepted_by" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "template_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "source_control_id" TEXT,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_template_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "template_id" UUID NOT NULL,
    "item_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "checklist_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "assessment_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "checklist_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_run_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "checklist_run_id" UUID NOT NULL,
    "template_item_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'open',
    "evidence_artifact_id" UUID,
    "completed_by" UUID,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "checklist_run_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_artifacts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "control_id" TEXT,
    "jurisdiction" TEXT,
    "source_type" "EvidenceSourceType" NOT NULL,
    "source_provider" TEXT,
    "provider_connection_id" UUID,
    "manual_source_label" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "storage_uri" TEXT NOT NULL,
    "content_hash_sha256" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT,
    "scan_status" "EvidenceScanStatus" NOT NULL DEFAULT 'pending',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "linked_assessment_id" UUID,
    "linked_action_id" UUID,
    "linked_source_record_id" UUID,
    "export_group_key" TEXT,
    "retention_policy" TEXT,
    "retention_expires_at" TIMESTAMP(3),

    CONSTRAINT "evidence_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_links" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "evidence_artifact_id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_access_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "evidence_artifact_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_reports" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID,
    "report_type" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "status" "GeneratedReportStatus" NOT NULL DEFAULT 'draft',
    "legal_caveat" TEXT NOT NULL,
    "source_references_json" JSONB NOT NULL DEFAULT '[]',
    "report_data_json" JSONB NOT NULL,
    "evidence_artifact_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_exports" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "generated_report_id" UUID NOT NULL,
    "export_format" TEXT NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'queued',
    "storage_uri" TEXT,
    "content_hash_sha256" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID,
    "snapshot_type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'stored_analysis',
    "snapshot_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "dashboard_snapshot_id" UUID NOT NULL,
    "widget_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "source_query" TEXT NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_drafts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID,
    "jurisdiction" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "status" "NotificationDraftStatus" NOT NULL DEFAULT 'draft',
    "payload_json" JSONB NOT NULL,
    "source_references_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ro_nis2_notification_drafts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID,
    "onboarding_progress_id" UUID,
    "classification_run_id" UUID,
    "notification_draft_id" UUID,
    "status" "NotificationDraftStatus" NOT NULL DEFAULT 'draft',
    "payload_json" JSONB NOT NULL,
    "source_references_json" JSONB NOT NULL DEFAULT '[]',
    "legal_caveat" TEXT NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ro_nis2_notification_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_key" "BillingProviderKey" NOT NULL,
    "external_customer_id" TEXT,
    "billing_email" TEXT,
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_subscriptions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "billing_customer_id" UUID NOT NULL,
    "provider_key" "BillingProviderKey" NOT NULL,
    "external_subscription_id" TEXT,
    "external_price_id" TEXT,
    "external_product_id" TEXT,
    "subscription_status" "BillingSubscriptionStatus" NOT NULL,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "trial_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_entitlements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "entitlement_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "provider_key" "BillingProviderKey" NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "identity_accounts_provider_subject_key" ON "identity_accounts"("provider_key", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "local_credentials_user_id_key" ON "local_credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "local_credentials_email_key" ON "local_credentials"("email");

-- CreateIndex
CREATE INDEX "sessions_user_active_idx" ON "sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_hash_key" ON "sessions"("session_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_expiry_idx" ON "password_reset_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_email_expiry_idx" ON "email_verification_tokens"("user_id", "email", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_org_user_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE INDEX "role_bindings_org_user_idx" ON "role_bindings"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_bindings_org_user_role_key" ON "role_bindings"("organization_id", "user_id", "role_id");

-- CreateIndex
CREATE INDEX "audit_logs_org_created_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_service_countries_service_country_key" ON "business_service_countries"("business_service_id", "country_code");

-- CreateIndex
CREATE INDEX "ro_nis2_onboarding_progress_org_status_idx" ON "ro_nis2_onboarding_progress"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "provider_permission_bundles_connection_bundle_key" ON "provider_permission_bundles"("provider_connection_id", "bundle_key");

-- CreateIndex
CREATE UNIQUE INDEX "provider_capabilities_connection_capability_key" ON "provider_capabilities"("provider_connection_id", "capability_key");

-- CreateIndex
CREATE UNIQUE INDEX "provider_sync_modules_run_module_key" ON "provider_sync_modules"("sync_run_id", "module_key");

-- CreateIndex
CREATE UNIQUE INDEX "provider_resource_idempotency_key" ON "provider_raw_resources"("organization_id", "provider_connection_id", "provider_key", "external_resource_type", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_normalized_resource_idempotency_key" ON "provider_normalized_resources"("organization_id", "provider_connection_id", "provider_key", "resource_type", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_findings_connection_finding_key" ON "provider_findings"("organization_id", "provider_connection_id", "provider_key", "finding_key");

-- CreateIndex
CREATE UNIQUE INDEX "provider_action_templates_provider_action_org_key" ON "provider_action_templates"("provider_key", "action_key", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_frameworks_key_key" ON "regulatory_frameworks"("key");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_framework_versions_framework_version_key" ON "regulatory_framework_versions"("framework_id", "version_label");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_source_versions_source_version_key" ON "regulatory_source_versions"("source_id", "version_label");

-- CreateIndex
CREATE UNIQUE INDEX "jurisdictions_country_code_key" ON "jurisdictions"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "country_packs_country_code_key" ON "country_packs"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "country_pack_versions_pack_version_key" ON "country_pack_versions"("country_pack_id", "version_label");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_questions_jurisdiction_key_version_key" ON "regulatory_questions"("jurisdiction", "question_key", "country_pack_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "control_catalog_framework_jurisdiction_code_key" ON "control_catalog"("framework_key", "jurisdiction_scope", "jurisdiction", "code");

-- CreateIndex
CREATE UNIQUE INDEX "control_versions_control_version_key" ON "control_versions"("control_id", "version");

-- CreateIndex
CREATE INDEX "ro_nis2_classification_runs_org_result_idx" ON "ro_nis2_classification_runs"("organization_id", "result", "classified_at");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_control_results_assessment_control_jurisdiction_key" ON "compliance_control_results"("assessment_id", "control_id", "jurisdiction");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_result_snapshots_org_assessment_key" ON "compliance_result_snapshots"("organization_id", "assessment_id");

-- CreateIndex
CREATE INDEX "ro_nis2_notification_drafts_org_status_idx" ON "ro_nis2_notification_drafts"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_organization_id_key" ON "billing_customers"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_entitlements_org_key" ON "billing_entitlements"("organization_id", "entitlement_key");

-- CreateIndex
CREATE UNIQUE INDEX "billing_events_provider_external_event_key" ON "billing_events"("provider_key", "external_event_id");
