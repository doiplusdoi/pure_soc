-- Repair the local-auth runtime surface for deployments where the initial
-- migration was marked applied but the auth/session/audit tables are absent or
-- still have their pre-hardening shape. This is intentionally forward-only and
-- idempotent: it does not reset data, drop tables, or rewrite existing rows
-- beyond backfilling required audit-chain metadata.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthProviderKey') THEN
    CREATE TYPE "AuthProviderKey" AS ENUM ('local', 'microsoft_entra', 'google', 'github', 'keycloak_broker');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrganizationMemberStatus') THEN
    CREATE TYPE "OrganizationMemberStatus" AS ENUM ('invited', 'active', 'suspended', 'removed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrganizationInvitationStatus') THEN
    CREATE TYPE "OrganizationInvitationStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "display_name" TEXT,
  "locale" TEXT DEFAULT 'en',
  "disabled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locale" TEXT DEFAULT 'en';

CREATE TABLE IF NOT EXISTS "identity_accounts" (
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

CREATE TABLE IF NOT EXISTS "local_credentials" (
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

CREATE TABLE IF NOT EXISTS "sessions" (
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

CREATE TABLE IF NOT EXISTS "mfa_factors" (
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

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organizations" (
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

CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'invited',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organization_invitations" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "invited_email" TEXT NOT NULL,
  "invited_role_key" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "invited_by_user_id" UUID NOT NULL,
  "status" "OrganizationInvitationStatus" NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_by_user_id" UUID,
  "accepted_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "roles" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "role_bindings" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "scope_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_bindings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID NOT NULL,
  "organization_id" UUID,
  "actor_user_id" UUID,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT,
  "action" TEXT NOT NULL,
  "scope_key" TEXT NOT NULL,
  "chain_sequence" INTEGER NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "context_json" JSONB NOT NULL DEFAULT '{}',
  "before_json" JSONB,
  "after_json" JSONB,
  "previous_hash" TEXT,
  "entry_hash" TEXT,
  "hash_algorithm" TEXT,
  "canonical_payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "scope_key" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "chain_sequence" INTEGER;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "context_json" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "previous_hash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entry_hash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "hash_algorithm" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "canonical_payload" JSONB;

UPDATE "audit_logs"
SET "scope_key" = COALESCE('org:' || "organization_id"::TEXT, 'global')
WHERE "scope_key" IS NULL;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "scope_key" ORDER BY "created_at", "id")::INTEGER AS "sequence"
  FROM "audit_logs"
  WHERE "chain_sequence" IS NULL
)
UPDATE "audit_logs"
SET "chain_sequence" = ranked."sequence"
FROM ranked
WHERE "audit_logs"."id" = ranked."id";

ALTER TABLE "audit_logs" ALTER COLUMN "scope_key" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "chain_sequence" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "identity_accounts_provider_subject_key" ON "identity_accounts"("provider_key", "provider_subject");
CREATE UNIQUE INDEX IF NOT EXISTS "local_credentials_user_id_key" ON "local_credentials"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "local_credentials_email_key" ON "local_credentials"("email");
CREATE INDEX IF NOT EXISTS "sessions_user_active_idx" ON "sessions"("user_id", "revoked_at", "expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_hash_key" ON "sessions"("session_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_expiry_idx" ON "password_reset_tokens"("user_id", "expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "email_verification_tokens_user_email_expiry_idx" ON "email_verification_tokens"("user_id", "email", "expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "organization_members_org_user_key" ON "organization_members"("organization_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "organization_invitations_token_hash_key" ON "organization_invitations"("token_hash");
CREATE INDEX IF NOT EXISTS "organization_invitations_org_email_status_idx" ON "organization_invitations"("organization_id", "invited_email", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "roles_key_key" ON "roles"("key");
CREATE INDEX IF NOT EXISTS "role_bindings_org_user_idx" ON "role_bindings"("organization_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "role_bindings_org_user_role_key" ON "role_bindings"("organization_id", "user_id", "role_id");
CREATE INDEX IF NOT EXISTS "audit_logs_org_created_idx" ON "audit_logs"("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_created_idx" ON "audit_logs"("actor_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_idx" ON "audit_logs"("action", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_org_entry_hash_idx" ON "audit_logs"("organization_id", "entry_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "audit_logs_scope_sequence_key" ON "audit_logs"("scope_key", "chain_sequence");
