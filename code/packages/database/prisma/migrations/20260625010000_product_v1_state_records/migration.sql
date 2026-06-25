CREATE TABLE "product_v1_state_records" (
  "id" TEXT NOT NULL,
  "record_type" TEXT NOT NULL,
  "organization_id" TEXT,
  "partition_key" TEXT,
  "idempotency_key" TEXT,
  "record_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_v1_state_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_v1_state_records_type_org_idx"
  ON "product_v1_state_records" ("record_type", "organization_id");

CREATE INDEX "product_v1_state_records_type_partition_idx"
  ON "product_v1_state_records" ("record_type", "partition_key");

CREATE INDEX "product_v1_state_records_idempotency_idx"
  ON "product_v1_state_records" ("record_type", "organization_id", "idempotency_key");
