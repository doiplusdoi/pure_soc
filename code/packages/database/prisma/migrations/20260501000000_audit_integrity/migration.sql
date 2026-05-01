-- Add tamper-evident audit metadata. Columns are nullable so existing audit rows
-- can remain readable until a runtime backfill/export policy is selected.
ALTER TABLE "audit_logs" ADD COLUMN "previous_hash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "entry_hash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "hash_algorithm" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "canonical_payload" JSONB;

CREATE INDEX "audit_logs_org_entry_hash_idx" ON "audit_logs"("organization_id", "entry_hash");
