CREATE TYPE "PartnerStatus" AS ENUM ('active', 'suspended', 'archived');

CREATE TYPE "PartnerMemberRole" AS ENUM ('owner', 'admin', 'analyst', 'viewer');

CREATE TYPE "PartnerMemberStatus" AS ENUM ('active', 'suspended', 'removed');

CREATE TYPE "PartnerTenantAccessLevel" AS ENUM ('admin', 'analyst', 'viewer');

CREATE TYPE "PartnerTenantGrantStatus" AS ENUM ('active', 'revoked');

CREATE TYPE "TenantAccessSessionStatus" AS ENUM ('active', 'ended', 'expired');

CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'active',
    "parent_partner_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_members" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "PartnerMemberRole" NOT NULL,
    "status" "PartnerMemberStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_tenant_grants" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "access_level" "PartnerTenantAccessLevel" NOT NULL,
    "status" "PartnerTenantGrantStatus" NOT NULL DEFAULT 'active',
    "granted_by_user_id" UUID NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_tenant_grants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_access_sessions" (
    "id" UUID NOT NULL,
    "real_actor_user_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "effective_organization_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "TenantAccessSessionStatus" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "end_reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "trace_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_access_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "audit_logs" ADD COLUMN "context_json" JSONB NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX "partners_slug_key" ON "partners"("slug");

CREATE INDEX "partners_parent_partner_idx" ON "partners"("parent_partner_id");

CREATE UNIQUE INDEX "partner_members_partner_user_key" ON "partner_members"("partner_id", "user_id");

CREATE INDEX "partner_members_user_status_idx" ON "partner_members"("user_id", "status");

CREATE INDEX "partner_tenant_grants_partner_status_idx" ON "partner_tenant_grants"("partner_id", "status");

CREATE INDEX "partner_tenant_grants_org_status_idx" ON "partner_tenant_grants"("organization_id", "status");

CREATE UNIQUE INDEX "partner_tenant_grants_active_partner_org_key"
    ON "partner_tenant_grants"("partner_id", "organization_id")
    WHERE "status" = 'active';

CREATE INDEX "tenant_access_sessions_actor_status_expiry_idx" ON "tenant_access_sessions"("real_actor_user_id", "status", "expires_at");

CREATE INDEX "tenant_access_sessions_partner_org_status_idx" ON "tenant_access_sessions"("partner_id", "effective_organization_id", "status");

CREATE INDEX "audit_logs_context_gin_idx" ON "audit_logs" USING GIN ("context_json");
