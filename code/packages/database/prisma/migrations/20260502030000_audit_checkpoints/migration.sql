-- Add database-only audit export checkpoints. These records preserve exported
-- segment anchors and verification metadata, but they are not WORM storage or
-- external notarization.
CREATE TABLE "audit_checkpoints" (
  "id" UUID NOT NULL,
  "organization_id" UUID,
  "scope_type" TEXT NOT NULL,
  "export_id" TEXT NOT NULL,
  "exported_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_id" UUID,
  "record_count" INTEGER NOT NULL,
  "first_record_id" TEXT,
  "terminal_record_id" TEXT,
  "initial_previous_hash" TEXT,
  "terminal_hash" TEXT,
  "export_hash" TEXT NOT NULL,
  "hash_algorithm" TEXT NOT NULL,
  "verification_status" TEXT NOT NULL,
  "verification_violations_json" JSONB NOT NULL DEFAULT '[]',
  "external_checkpoint_status" TEXT NOT NULL DEFAULT 'not_configured',
  "external_checkpoint_reference" TEXT,
  "guarantees_json" JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "audit_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_checkpoints_org_created_idx" ON "audit_checkpoints"("organization_id", "created_at");
CREATE INDEX "audit_checkpoints_org_terminal_hash_idx" ON "audit_checkpoints"("organization_id", "terminal_hash");
