-- Persist provider OAuth/admin-consent callback state in Prisma mode.
-- The raw state value is never stored; callers persist a SHA-256 state hash.

CREATE TABLE "provider_consent_states" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_key" TEXT NOT NULL,
    "state_hash" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "requested_permission_bundles" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),

    CONSTRAINT "provider_consent_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "provider_consent_states_provider_state_key"
ON "provider_consent_states"("provider_key", "state_hash");

CREATE INDEX "provider_consent_states_org_provider_expiry_idx"
ON "provider_consent_states"("organization_id", "provider_key", "expires_at", "consumed_at");
