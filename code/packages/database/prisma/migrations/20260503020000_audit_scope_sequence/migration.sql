-- Serialize and order audit hash-chain appends by persisted audit scope.
-- Existing rows are assigned deterministic per-scope sequence numbers by their
-- current creation order so historical exports remain readable.
ALTER TABLE "audit_logs" ADD COLUMN "scope_key" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "chain_sequence" INTEGER;

WITH ordered_audit_logs AS (
  SELECT
    "id",
    CASE
      WHEN "organization_id" IS NULL THEN 'global'
      ELSE 'organization:' || "organization_id"::TEXT
    END AS "computed_scope_key",
    ROW_NUMBER() OVER (
      PARTITION BY "organization_id"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS "computed_chain_sequence"
  FROM "audit_logs"
)
UPDATE "audit_logs"
SET
  "scope_key" = ordered_audit_logs."computed_scope_key",
  "chain_sequence" = ordered_audit_logs."computed_chain_sequence"
FROM ordered_audit_logs
WHERE "audit_logs"."id" = ordered_audit_logs."id";

ALTER TABLE "audit_logs" ALTER COLUMN "scope_key" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "chain_sequence" SET NOT NULL;

CREATE UNIQUE INDEX "audit_logs_scope_sequence_key"
  ON "audit_logs"("scope_key", "chain_sequence");
