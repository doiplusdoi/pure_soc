CREATE TABLE "notification_digest_items" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "digest_frequency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "delivered_at" TIMESTAMP(3),

  CONSTRAINT "notification_digest_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_digest_items_due_idx"
  ON "notification_digest_items" ("status", "digest_frequency", "created_at");

CREATE INDEX "notification_digest_items_org_status_idx"
  ON "notification_digest_items" ("organization_id", "status", "created_at");

CREATE INDEX "notification_digest_items_dedupe_idx"
  ON "notification_digest_items" ("organization_id", "event_type", "payload_hash", "digest_frequency", "status");
