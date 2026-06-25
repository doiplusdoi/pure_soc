CREATE TABLE "notification_operator_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "source_retry_item_id" UUID,
    "channel_id" UUID,
    "event_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),

    CONSTRAINT "notification_operator_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_operator_alerts_org_status_idx" ON "notification_operator_alerts"("organization_id", "status", "created_at");
CREATE INDEX "notification_operator_alerts_dedupe_idx" ON "notification_operator_alerts"("organization_id", "source_retry_item_id", "alert_type", "status");
