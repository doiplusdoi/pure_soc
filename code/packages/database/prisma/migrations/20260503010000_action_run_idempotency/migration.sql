ALTER TABLE "provider_action_runs"
  ADD COLUMN "idempotency_key" VARCHAR(128);

CREATE UNIQUE INDEX "provider_action_runs_org_idempotency_key_key"
  ON "provider_action_runs"("organization_id", "idempotency_key");
