CREATE TYPE "NotificationChannelType" AS ENUM ('email', 'slack_webhook', 'teams_webhook');

CREATE TYPE "NotificationSendStatus" AS ENUM ('sent', 'failed');

CREATE TYPE "NotificationDeadlineSourceType" AS ENUM ('incident_reporting');

CREATE TYPE "NotificationDeadlineStatus" AS ENUM ('open', 'completed', 'canceled');

ALTER TABLE "checklist_runs" ADD COLUMN "due_date" TIMESTAMP(3);

CREATE TABLE "notification_channels" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "NotificationChannelType" NOT NULL,
    "destination" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel_id" UUID,
    "event_type" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "NotificationSendStatus" NOT NULL,
    "error_message" TEXT,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_deadlines" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "source_type" "NotificationDeadlineSourceType" NOT NULL,
    "source_id" TEXT,
    "deadline_type" TEXT NOT NULL,
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "status" "NotificationDeadlineStatus" NOT NULL DEFAULT 'open',
    "last_notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deadlines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "checklist_runs_org_due_date_idx" ON "checklist_runs"("organization_id", "due_date");

CREATE INDEX "notification_channels_org_enabled_idx" ON "notification_channels"("organization_id", "enabled");

CREATE INDEX "notification_logs_org_sent_at_idx" ON "notification_logs"("organization_id", "sent_at");

CREATE INDEX "notification_logs_org_event_payload_idx" ON "notification_logs"("organization_id", "event_type", "payload_hash");

CREATE INDEX "notification_deadlines_status_deadline_at_idx" ON "notification_deadlines"("status", "deadline_at");

CREATE INDEX "notification_deadlines_org_deadline_at_idx" ON "notification_deadlines"("organization_id", "deadline_at");
