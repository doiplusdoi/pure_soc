CREATE TABLE "notification_delivery_retries" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "channel_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 1,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "next_attempt_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),

  CONSTRAINT "notification_delivery_retries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_delivery_retries_due_idx"
  ON "notification_delivery_retries" ("status", "next_attempt_at");

CREATE INDEX "notification_delivery_retries_org_status_idx"
  ON "notification_delivery_retries" ("organization_id", "status", "next_attempt_at");

CREATE INDEX "notification_delivery_retries_dedupe_idx"
  ON "notification_delivery_retries" ("organization_id", "channel_id", "event_type", "payload_hash", "status");
