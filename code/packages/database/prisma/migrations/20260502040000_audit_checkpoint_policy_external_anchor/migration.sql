-- Add production-shaped audit checkpoint policy and local/fake external-anchor
-- metadata. These columns do not make audit rows WORM, externally notarized,
-- legally certified, or database-admin-proof.
ALTER TABLE "audit_checkpoints"
  ADD COLUMN "external_checkpoint_provider" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "external_checkpoint_provider_status_json" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "external_checkpoint_recorded_at" TIMESTAMP(3),
  ADD COLUMN "external_checkpoint_payload_hash" TEXT,
  ADD COLUMN "external_checkpoint_metadata_json" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "retention_policy_json" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "audit_checkpoints_org_external_status_idx"
  ON "audit_checkpoints"("organization_id", "external_checkpoint_status");
