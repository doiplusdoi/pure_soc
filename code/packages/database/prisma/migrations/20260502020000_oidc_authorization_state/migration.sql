-- Persist user social-login OIDC callback state in Prisma mode.
-- State and nonce are hashes; the PKCE verifier is stored only as an AES-GCM envelope.

CREATE TABLE "oidc_authorization_states" (
    "id" UUID NOT NULL,
    "provider_key" "AuthProviderKey" NOT NULL,
    "state_hash" TEXT NOT NULL,
    "nonce_hash" TEXT,
    "code_verifier_envelope" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),

    CONSTRAINT "oidc_authorization_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oidc_authorization_states_provider_state_key"
ON "oidc_authorization_states"("provider_key", "state_hash");

CREATE INDEX "oidc_authorization_states_expiry_idx"
ON "oidc_authorization_states"("expires_at", "consumed_at");
