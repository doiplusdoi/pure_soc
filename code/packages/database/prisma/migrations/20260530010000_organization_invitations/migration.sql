CREATE TYPE "OrganizationInvitationStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

CREATE TABLE "organization_invitations" (
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

CREATE UNIQUE INDEX "organization_invitations_token_hash_key" ON "organization_invitations"("token_hash");
CREATE INDEX "organization_invitations_org_email_status_idx" ON "organization_invitations"("organization_id", "invited_email", "status");
