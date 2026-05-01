-- Align persisted provider telemetry with the provider-neutral runtime contract.

ALTER TABLE "provider_credentials" ADD COLUMN "provider_key" TEXT NOT NULL DEFAULT 'unknown';

UPDATE "provider_credentials" AS credential
SET "provider_key" = connection."provider_key"
FROM "provider_connections" AS connection
WHERE credential."provider_connection_id" = connection."id";

ALTER TABLE "provider_credentials" ALTER COLUMN "provider_key" DROP DEFAULT;

CREATE UNIQUE INDEX "provider_credentials_connection_type_key"
ON "provider_credentials"("provider_connection_id", "credential_type");

ALTER TABLE "provider_findings" ADD COLUMN "resource_external_id" TEXT;
ALTER TABLE "provider_findings" ADD COLUMN "resource_type" TEXT;

ALTER TABLE "provider_recommendations" ADD COLUMN "source_finding_key" TEXT;
