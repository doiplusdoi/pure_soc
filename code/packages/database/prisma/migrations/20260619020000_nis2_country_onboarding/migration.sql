CREATE TABLE "nis2_onboarding_progress" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID,
    "country_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "current_screen" TEXT NOT NULL,
    "completed_screens" TEXT[],
    "answers_json" JSONB NOT NULL DEFAULT '{}',
    "source_version" TEXT NOT NULL,
    "source_references_json" JSONB NOT NULL DEFAULT '[]',
    "missing_required_fields" TEXT[],
    "saved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nis2_onboarding_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nis2_classification_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assessment_id" UUID,
    "onboarding_progress_id" UUID,
    "country_code" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "legal_review_required" BOOLEAN NOT NULL DEFAULT true,
    "input_json" JSONB NOT NULL DEFAULT '{}',
    "explanation" TEXT NOT NULL,
    "assumptions_json" JSONB NOT NULL DEFAULT '[]',
    "matched_rules_json" JSONB NOT NULL DEFAULT '[]',
    "missing_information" TEXT[],
    "legal_basis_json" JSONB NOT NULL DEFAULT '[]',
    "source_version" TEXT NOT NULL,
    "classified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nis2_classification_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "nis2_onboarding_progress_org_country_status_idx"
    ON "nis2_onboarding_progress"("organization_id", "country_code", "status");

CREATE INDEX "nis2_onboarding_progress_org_country_updated_idx"
    ON "nis2_onboarding_progress"("organization_id", "country_code", "updated_at");

CREATE INDEX "nis2_classification_runs_org_country_result_idx"
    ON "nis2_classification_runs"("organization_id", "country_code", "result", "classified_at");

CREATE INDEX "nis2_classification_runs_progress_idx"
    ON "nis2_classification_runs"("organization_id", "onboarding_progress_id", "classified_at");
