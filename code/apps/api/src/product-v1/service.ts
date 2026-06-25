import { createHash, randomUUID } from "node:crypto";

import { stableJsonExport } from "@puresoc/reports";

export type OrganizationRelationshipState =
  | "INVITED"
  | "PENDING_CUSTOMER_ACCEPTANCE"
  | "ACTIVE"
  | "SUSPENDED"
  | "TERMINATION_PENDING"
  | "TERMINATED"
  | "EXPIRED";

export type SupportSessionStatus = "active" | "ended" | "expired";

export type ProductV1OperationStatus = "queued" | "running" | "succeeded" | "failed" | "canceled" | "expired";

export type ProductV1OperationKind =
  | "sync"
  | "report"
  | "evidence"
  | "action"
  | "relationship"
  | "support_session"
  | "setup";

export type ProductV1CapabilityState =
  | "AVAILABLE"
  | "PERMISSION_REQUIRED"
  | "ROLE_REQUIRED"
  | "LICENSE_REQUIRED"
  | "CONSENT_EXPIRED"
  | "UNSUPPORTED_CLOUD"
  | "TEMPORARILY_UNAVAILABLE"
  | "ERROR";

export type ProductV1ClassificationOutcome =
  | "LIKELY_ESSENTIAL_OR_EQUIVALENT"
  | "LIKELY_IMPORTANT_OR_EQUIVALENT"
  | "LIKELY_OUT_OF_SCOPE"
  | "SPECIAL_DESIGNATION_POSSIBLE"
  | "INSUFFICIENT_INFORMATION"
  | "REQUIRES_PROFESSIONAL_REVIEW"
  | "OVERRIDDEN_BY_REVIEW";

export type ProductV1SetupStep =
  | "organization"
  | "jurisdiction"
  | "services"
  | "people"
  | "systems"
  | "suppliers"
  | "microsoft365"
  | "review";

export const productV1SetupSteps: readonly ProductV1SetupStep[] = [
  "organization",
  "jurisdiction",
  "services",
  "people",
  "systems",
  "suppliers",
  "microsoft365",
  "review"
];

export interface ProductV1OperationRecord {
  id: string;
  organizationId?: string | null;
  kind: ProductV1OperationKind;
  status: ProductV1OperationStatus;
  idempotencyKey?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  progress: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type ProductV1InternalEventStatus = "pending" | "published" | "failed" | "skipped";

export interface ProductV1InternalEventRecord {
  id: string;
  organizationId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey?: string | null;
  payload: Record<string, unknown>;
  outboxStatus: ProductV1InternalEventStatus;
  attempts: number;
  nextAttemptAt?: string | null;
  publishedAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationRelationshipRecord {
  id: string;
  partnerId: string;
  customerOrganizationId: string;
  state: OrganizationRelationshipState;
  scopes: string[];
  invitedByUserId: string;
  acceptedByUserId?: string | null;
  suspendedByUserId?: string | null;
  terminationRequestedByUserId?: string | null;
  terminatedByUserId?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerAssignmentRecord {
  id: string;
  partnerId: string;
  relationshipId: string;
  customerOrganizationId: string;
  assigneeType: "user" | "team";
  assigneeId: string;
  scopes: string[];
  expiresAt?: string | null;
  createdByUserId: string;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportSessionRecord {
  id: string;
  organizationId: string;
  actorUserId: string;
  reason: string;
  policyBasis: "customer_approved" | "platform_break_glass";
  ticketReference?: string | null;
  status: SupportSessionStatus;
  startedAt: string;
  expiresAt: string;
  endedAt?: string | null;
  endReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SetupStateRecord {
  organizationId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "READY_FOR_REVIEW" | "COMPLETE" | "NEEDS_INFORMATION";
  currentStep?: ProductV1SetupStep | null;
  completedSteps: ProductV1SetupStep[];
  stepData: Partial<Record<ProductV1SetupStep, Record<string, unknown>>>;
  launchedAt?: string | null;
  updatedAt: string;
}

export interface BusinessServiceRecord {
  id: string;
  organizationId: string;
  name: string;
  criticality: "low" | "medium" | "high" | "critical";
  ownerPersonId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonResponsibilityRecord {
  id: string;
  organizationId: string;
  displayName: string;
  email?: string | null;
  responsibilities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRecord {
  id: string;
  organizationId: string;
  name: string;
  criticality: "low" | "medium" | "high" | "critical";
  services: string[];
  reviewCadenceMonths: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAssetRecord {
  id: string;
  organizationId: string;
  assetType: string;
  displayName: string;
  source: "manual" | "provider";
  lifecycleState: "active" | "retired" | "missing";
  createdAt: string;
  updatedAt: string;
}

export interface ProductFindingRecord {
  id: string;
  organizationId: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "accepted_risk" | "suppressed" | "remediated" | "verified" | "reopened";
  ownerUserId?: string | null;
  sourceType: "provider" | "manual" | "control" | "supplier" | "incident";
  createdAt: string;
  updatedAt: string;
}

export interface RemediationPlanRecord {
  id: string;
  organizationId: string;
  objective: string;
  status: "draft" | "active" | "completed" | "canceled";
  ownerUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  organizationId: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "AWAITING_REVIEW" | "DONE" | "CANCELED";
  priority: "low" | "medium" | "high" | "critical";
  ownerUserId?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentRecord {
  id: string;
  organizationId: string;
  title: string;
  status:
    | "NEW"
    | "TRIAGE"
    | "INVESTIGATING"
    | "CONTAINMENT"
    | "ERADICATION"
    | "RECOVERY"
    | "MONITORING"
    | "RESOLVED"
    | "CLOSED"
    | "REOPENED";
  awarenessTime: string;
  reportingClock: {
    ruleVersion: string;
    earlyWarningDueAt: string;
    incidentNotificationDueAt: string;
    finalReportDueAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RiskRecord {
  id: string;
  organizationId: string;
  statement: string;
  state:
    | "IDENTIFIED"
    | "ASSESSMENT_REQUIRED"
    | "ASSESSED"
    | "TREATMENT_PLANNED"
    | "TREATMENT_IN_PROGRESS"
    | "MONITORING"
    | "ACCEPTED"
    | "TRANSFERRED"
    | "CLOSED"
    | "REOPENED";
  inherentScore: number;
  residualScore: number;
  treatment: "mitigate" | "accept" | "transfer" | "avoid";
  ownerUserId?: string | null;
  reviewDueAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyDocumentRecord {
  id: string;
  organizationId: string;
  title: string;
  status: "draft" | "under_review" | "approved" | "published" | "superseded" | "retired";
  ownerUserId?: string | null;
  reviewDueAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierReviewRecord {
  id: string;
  organizationId: string;
  supplierId: string;
  status: "scheduled" | "in_progress" | "completed" | "overdue" | "canceled";
  outcome: "not_assessed" | "acceptable" | "gaps_found" | "remediation_required" | "blocked";
  ownerUserId?: string | null;
  reviewDueAt?: string | null;
  completedAt?: string | null;
  evidenceFileObjectIds: string[];
  riskIds: string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyReviewRecord {
  id: string;
  organizationId: string;
  policyDocumentId: string;
  status: "scheduled" | "in_progress" | "approved" | "changes_requested" | "superseded" | "canceled";
  reviewerUserId?: string | null;
  reviewDueAt?: string | null;
  completedAt?: string | null;
  comments?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyAcknowledgementRecord {
  id: string;
  organizationId: string;
  policyDocumentId: string;
  acknowledgedByUserId: string;
  status: "pending" | "acknowledged" | "overdue" | "revoked";
  dueAt?: string | null;
  acknowledgedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceActivityRecord {
  id: string;
  organizationId: string;
  activityType: "management_review" | "control_review" | "risk_review" | "supplier_review" | "training" | "attestation";
  title: string;
  status: "planned" | "in_progress" | "completed" | "blocked" | "canceled";
  ownerUserId?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  linkedRiskIds: string[];
  linkedPolicyIds: string[];
  linkedSupplierIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceCalendarEventRecord {
  id: string;
  organizationId: string;
  title: string;
  eventType: "review" | "deadline" | "training" | "attestation" | "renewal" | "report";
  startsAt: string;
  dueAt?: string | null;
  status: "scheduled" | "completed" | "overdue" | "canceled";
  ownerUserId?: string | null;
  sourceResourceType?: string | null;
  sourceResourceId?: string | null;
  recurrence?: "none" | "monthly" | "quarterly" | "annual" | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttestationRecord {
  id: string;
  organizationId: string;
  title: string;
  scope: string;
  status: "draft" | "open" | "submitted" | "accepted" | "rejected";
  attestedByUserId?: string | null;
  dueAt?: string | null;
  submittedAt?: string | null;
  evidenceFileObjectIds: string[];
  sourceReferences: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainingRecord {
  id: string;
  organizationId: string;
  subject: string;
  assigneeUserId?: string | null;
  personId?: string | null;
  status: "assigned" | "completed" | "overdue" | "waived";
  assignedAt: string;
  dueAt?: string | null;
  completedAt?: string | null;
  evidenceFileObjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type ProductV1FilePurpose =
  | "uploaded_evidence"
  | "generated_report"
  | "audit_export"
  | "policy_document"
  | "incident_package";

export type ProductV1FileScanStatus = "pending" | "clean" | "infected" | "failed" | "skipped";

export type ProductV1RetentionClass = "evidence" | "report_snapshot" | "audit_export" | "temporary";

export interface RetentionPolicyRecord {
  id: string;
  organizationId: string;
  name: string;
  retentionClass: ProductV1RetentionClass;
  retainForDays: number;
  allowDeleteAfterRetention: boolean;
  legalHoldDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileObjectRecord {
  id: string;
  organizationId: string;
  purpose: ProductV1FilePurpose;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  storage: {
    provider: string;
    bucket?: string | null;
    key: string;
    versionId?: string | null;
  };
  scanStatus: ProductV1FileScanStatus;
  scanFindings: string[];
  retentionClass: ProductV1RetentionClass;
  retentionPolicyId?: string | null;
  retentionPolicySnapshot: {
    name: string;
    retainForDays: number;
    allowDeleteAfterRetention: boolean;
  };
  retainUntil: string;
  legalHold: boolean;
  legalHoldReason?: string | null;
  encryption: {
    mode: "provider_managed" | "customer_managed" | "local_development";
    algorithm?: string | null;
    keyRef?: string | null;
  };
  sourceResourceType?: string | null;
  sourceResourceId?: string | null;
  sourceReferences: string[];
  createdByUserId: string;
  deletedAt?: string | null;
  deleteReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReportTemplateKey =
  | "security_baseline"
  | "executive_summary"
  | "nis2"
  | "controls_evidence"
  | "risk_register"
  | "incident_package"
  | "remediation_progress"
  | "partner_portfolio"
  | "customer_service"
  | "audit";

export type ReportSnapshotFormat = "json" | "pdf";

export interface ProductV1ReportSnapshotArtifact {
  filename: string;
  format: ReportSnapshotFormat;
  mimeType: string;
  body: Uint8Array;
  checksumSha256: string;
  renderer: string;
  renderedAt: string;
}

export interface ReportSnapshotRecord {
  id: string;
  organizationId: string;
  templateKey: ReportTemplateKey;
  locale: "en" | "ro" | "pl" | "de";
  format: ReportSnapshotFormat;
  version: string;
  status: "ready";
  fileObjectId: string;
  checksumSha256: string;
  legalCaveat: string;
  legalCaveatLocale: string;
  legalCaveatFallbackUsed: boolean;
  sourceReferences: string[];
  content: Record<string, unknown>;
  immutable: true;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductV1RecordType =
  | "operation"
  | "internal_event"
  | "setup_state"
  | "organization_relationship"
  | "partner_assignment"
  | "support_session"
  | "business_service"
  | "person_responsibility"
  | "supplier"
  | "asset"
  | "finding"
  | "remediation_plan"
  | "task"
  | "incident"
  | "risk"
  | "policy"
  | "supplier_review"
  | "policy_review"
  | "policy_acknowledgement"
  | "governance_activity"
  | "governance_calendar_event"
  | "attestation"
  | "training_record"
  | "retention_policy"
  | "file_object"
  | "report_snapshot";

export interface ProductV1RepositoryListFilter {
  organizationId?: string | null;
  partitionKey?: string | null;
}

export interface ProductV1RepositorySaveMetadata extends ProductV1RepositoryListFilter {
  idempotencyKey?: string | null;
}

export interface ProductV1Repository {
  get<T>(recordType: ProductV1RecordType, id: string): Promise<T | null>;
  list<T>(recordType: ProductV1RecordType, filter?: ProductV1RepositoryListFilter): Promise<T[]>;
  upsert<T extends { id: string }>(
    recordType: ProductV1RecordType,
    record: T,
    metadata?: ProductV1RepositorySaveMetadata
  ): Promise<T>;
  findByIdempotencyKey<T>(
    recordType: ProductV1RecordType,
    organizationId: string | null,
    idempotencyKey: string
  ): Promise<T | null>;
}

interface ProductV1StoredEnvelope {
  recordType: ProductV1RecordType;
  record: unknown;
  organizationId: string | null;
  partitionKey: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export class InMemoryProductV1Repository implements ProductV1Repository {
  private readonly records = new Map<string, ProductV1StoredEnvelope>();

  async get<T>(recordType: ProductV1RecordType, id: string): Promise<T | null> {
    const envelope = this.records.get(this.key(recordType, id));
    return envelope ? cloneRecord<T>(envelope.record) : null;
  }

  async list<T>(recordType: ProductV1RecordType, filter: ProductV1RepositoryListFilter = {}): Promise<T[]> {
    return [...this.records.values()]
      .filter((envelope) => envelope.recordType === recordType)
      .filter((envelope) =>
        filter.organizationId === undefined ? true : envelope.organizationId === filter.organizationId
      )
      .filter((envelope) => (filter.partitionKey === undefined ? true : envelope.partitionKey === filter.partitionKey))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((envelope) => cloneRecord<T>(envelope.record));
  }

  async upsert<T extends { id: string }>(
    recordType: ProductV1RecordType,
    record: T,
    metadata: ProductV1RepositorySaveMetadata = {}
  ): Promise<T> {
    const key = this.key(recordType, record.id);
    const existing = this.records.get(key);
    this.records.set(key, {
      recordType,
      record: cloneRecord(record),
      organizationId: metadata.organizationId ?? null,
      partitionKey: metadata.partitionKey ?? null,
      idempotencyKey: metadata.idempotencyKey ?? null,
      createdAt: existing?.createdAt ?? recordTimestamp(record, "createdAt"),
      updatedAt: recordTimestamp(record, "updatedAt")
    });
    return cloneRecord(record);
  }

  async findByIdempotencyKey<T>(
    recordType: ProductV1RecordType,
    organizationId: string | null,
    idempotencyKey: string
  ): Promise<T | null> {
    const envelope = [...this.records.values()].find(
      (candidate) =>
        candidate.recordType === recordType &&
        candidate.organizationId === organizationId &&
        candidate.idempotencyKey === idempotencyKey
    );
    return envelope ? cloneRecord<T>(envelope.record) : null;
  }

  private key(recordType: ProductV1RecordType, id: string): string {
    return `${recordType}:${id}`;
  }
}

const validRelationshipTransitions: Record<OrganizationRelationshipState, readonly OrganizationRelationshipState[]> = {
  INVITED: ["PENDING_CUSTOMER_ACCEPTANCE", "EXPIRED", "TERMINATED"],
  PENDING_CUSTOMER_ACCEPTANCE: ["ACTIVE", "EXPIRED", "TERMINATED"],
  ACTIVE: ["SUSPENDED", "TERMINATION_PENDING", "TERMINATED", "EXPIRED"],
  SUSPENDED: ["ACTIVE", "TERMINATION_PENDING", "TERMINATED", "EXPIRED"],
  TERMINATION_PENDING: ["TERMINATED", "ACTIVE"],
  TERMINATED: [],
  EXPIRED: []
};

export class ProductV1Service {
  constructor(
    readonly repository: ProductV1Repository = new InMemoryProductV1Repository(),
    private readonly options: { now?: () => Date; idFactory?: () => string } = {}
  ) {}

  async createOperation(input: {
    organizationId?: string | null;
    kind: ProductV1OperationKind;
    idempotencyKey?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    status?: ProductV1OperationStatus;
    progress?: Record<string, unknown>;
    result?: Record<string, unknown> | null;
  }): Promise<ProductV1OperationRecord> {
    const organizationId = input.organizationId ?? null;
    const existing = input.idempotencyKey
      ? await this.repository.findByIdempotencyKey<ProductV1OperationRecord>(
          "operation",
          organizationId,
          [organizationId ?? "global", input.kind, input.idempotencyKey].join(":")
        )
      : null;
    if (existing) {
      return existing;
    }

    const now = this.timestamp();
    const operation: ProductV1OperationRecord = {
      id: this.id("op"),
      organizationId,
      kind: input.kind,
      status: input.status ?? "queued",
      idempotencyKey: input.idempotencyKey ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      progress: input.progress ?? {},
      result: input.result ?? null,
      error: null,
      createdAt: now,
      updatedAt: now
    };
    return this.repository.upsert("operation", operation, {
      organizationId,
      idempotencyKey: operation.idempotencyKey
        ? [organizationId ?? "global", operation.kind, operation.idempotencyKey].join(":")
        : null
    });
  }

  async updateOperation(operation: ProductV1OperationRecord): Promise<ProductV1OperationRecord> {
    const updated = {
      ...operation,
      updatedAt: this.timestamp()
    };
    return this.repository.upsert("operation", updated, {
      organizationId: updated.organizationId ?? null,
      idempotencyKey: updated.idempotencyKey
        ? [updated.organizationId ?? "global", updated.kind, updated.idempotencyKey].join(":")
        : null
    });
  }

  async getOperation(operationId: string): Promise<ProductV1OperationRecord | null> {
    return this.repository.get("operation", operationId);
  }

  async listOperations(organizationId?: string | null): Promise<ProductV1OperationRecord[]> {
    return this.repository.list("operation", organizationId ? { organizationId } : {});
  }

  async findOperationByIdempotencyKey(input: {
    organizationId?: string | null;
    kind: ProductV1OperationKind;
    idempotencyKey: string;
  }): Promise<ProductV1OperationRecord | null> {
    const organizationId = input.organizationId ?? null;
    return this.repository.findByIdempotencyKey<ProductV1OperationRecord>(
      "operation",
      organizationId,
      [organizationId ?? "global", input.kind, input.idempotencyKey].join(":")
    );
  }

  async createInternalEvent(input: {
    organizationId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    idempotencyKey?: string | null;
    payload?: Record<string, unknown>;
    outboxStatus?: ProductV1InternalEventStatus;
    nextAttemptAt?: string | null;
  }): Promise<ProductV1InternalEventRecord> {
    const dedupeKey = input.idempotencyKey
      ? [input.organizationId, input.eventType, input.aggregateType, input.aggregateId, input.idempotencyKey].join(":")
      : null;
    const existing = dedupeKey
      ? await this.repository.findByIdempotencyKey<ProductV1InternalEventRecord>(
          "internal_event",
          input.organizationId,
          dedupeKey
        )
      : null;
    if (existing) {
      return existing;
    }
    const now = this.timestamp();
    const event: ProductV1InternalEventRecord = {
      id: this.id("event"),
      organizationId: input.organizationId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: input.idempotencyKey ?? null,
      payload: input.payload ?? {},
      outboxStatus: input.outboxStatus ?? "pending",
      attempts: 0,
      nextAttemptAt: input.nextAttemptAt ?? null,
      publishedAt: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now
    };
    return this.repository.upsert("internal_event", event, {
      organizationId: event.organizationId,
      idempotencyKey: dedupeKey
    });
  }

  async listInternalEvents(organizationId: string): Promise<ProductV1InternalEventRecord[]> {
    return this.repository.list("internal_event", { organizationId });
  }

  async updateInternalEventStatus(input: {
    organizationId: string;
    eventId: string;
    outboxStatus: ProductV1InternalEventStatus;
    failureReason?: string | null;
    nextAttemptAt?: string | null;
  }): Promise<ProductV1InternalEventRecord> {
    const event = await this.repository.get<ProductV1InternalEventRecord>("internal_event", input.eventId);
    if (!event || event.organizationId !== input.organizationId) {
      throw new Error(`Unknown product v1 internal_event: ${input.eventId}`);
    }
    const updated: ProductV1InternalEventRecord = {
      ...event,
      outboxStatus: input.outboxStatus,
      attempts: event.attempts + 1,
      publishedAt: input.outboxStatus === "published" ? this.timestamp() : event.publishedAt ?? null,
      failureReason: input.outboxStatus === "failed" ? input.failureReason ?? "publisher_failed" : null,
      nextAttemptAt: input.nextAttemptAt ?? null,
      updatedAt: this.timestamp()
    };
    return this.repository.upsert("internal_event", updated, { organizationId: updated.organizationId });
  }

  async updateStoredRecord<T extends { id: string; organizationId: string; updatedAt: string }>(
    recordType: ProductV1RecordType,
    organizationId: string,
    recordId: string,
    updates: Partial<Omit<T, "id" | "organizationId" | "createdAt" | "updatedAt">>
  ): Promise<{ before: T; after: T }> {
    const before = await this.repository.get<T>(recordType, recordId);
    if (!before || before.organizationId !== organizationId) {
      throw new Error(`Unknown product v1 ${recordType}: ${recordId}`);
    }
    const after = {
      ...before,
      ...updates,
      id: before.id,
      organizationId: before.organizationId,
      updatedAt: this.timestamp()
    } as T;
    return {
      before,
      after: await this.repository.upsert(recordType, after, { organizationId })
    };
  }

  async getSetupState(organizationId: string): Promise<SetupStateRecord> {
    const existing = await this.repository.get<SetupStateRecord>("setup_state", organizationId);
    if (existing) {
      return existing;
    }
    const now = this.timestamp();
    const created: SetupStateRecord = {
      organizationId,
      status: "NOT_STARTED",
      currentStep: "organization",
      completedSteps: [],
      stepData: {},
      launchedAt: null,
      updatedAt: now
    };
    return this.repository.upsert("setup_state", { ...created, id: organizationId }, { organizationId }) as Promise<
      SetupStateRecord
    >;
  }

  async saveSetupStep(input: {
    organizationId: string;
    step: ProductV1SetupStep;
    data: Record<string, unknown>;
    complete?: boolean;
  }): Promise<SetupStateRecord> {
    const state = await this.getSetupState(input.organizationId);
    const completedSteps = new Set(state.completedSteps);
    if (input.complete !== false) {
      completedSteps.add(input.step);
    }
    const updated: SetupStateRecord = {
      ...state,
      status: "IN_PROGRESS",
      currentStep: input.step,
      completedSteps: [...completedSteps],
      stepData: {
        ...state.stepData,
        [input.step]: input.data
      },
      updatedAt: this.timestamp()
    };
    return this.saveSetupState(updated);
  }

  async launchSetup(organizationId: string): Promise<{ state: SetupStateRecord; missingSteps: ProductV1SetupStep[] }> {
    const state = await this.getSetupState(organizationId);
    const required: readonly ProductV1SetupStep[] = ["organization", "jurisdiction", "services", "people", "review"];
    const missingSteps = required.filter((step) => !state.completedSteps.includes(step));
    const updated: SetupStateRecord = {
      ...state,
      status: missingSteps.length === 0 ? "COMPLETE" : "NEEDS_INFORMATION",
      launchedAt: missingSteps.length === 0 ? this.timestamp() : state.launchedAt ?? null,
      updatedAt: this.timestamp()
    };
    return { state: await this.saveSetupState(updated), missingSteps };
  }

  async createRelationship(input: {
    partnerId: string;
    customerOrganizationId: string;
    invitedByUserId: string;
    scopes?: string[];
    expiresAt?: string | null;
  }): Promise<OrganizationRelationshipRecord> {
    const existing = (await this.listRelationshipsForPartner(input.partnerId)).find(
      (relationship) =>
        relationship.customerOrganizationId === input.customerOrganizationId &&
        !["TERMINATED", "EXPIRED"].includes(relationship.state)
    );
    if (existing) {
      return existing;
    }

    const now = this.timestamp();
    const relationship: OrganizationRelationshipRecord = {
      id: this.id("rel"),
      partnerId: input.partnerId,
      customerOrganizationId: input.customerOrganizationId,
      state: "PENDING_CUSTOMER_ACCEPTANCE",
      scopes: input.scopes ?? ["security.read", "compliance.read"],
      invitedByUserId: input.invitedByUserId,
      acceptedByUserId: null,
      expiresAt: input.expiresAt ?? null,
      createdAt: now,
      updatedAt: now
    };
    return this.saveRelationship(relationship);
  }

  async backfillRelationshipFromGrant(input: {
    partnerId: string;
    customerOrganizationId: string;
    grantedByUserId: string;
    accessLevel: string;
  }): Promise<OrganizationRelationshipRecord> {
    const existing = (await this.listRelationshipsForPartner(input.partnerId)).find(
      (relationship) =>
        relationship.customerOrganizationId === input.customerOrganizationId && relationship.state === "ACTIVE"
    );
    if (existing) {
      return existing;
    }
    const now = this.timestamp();
    const relationship: OrganizationRelationshipRecord = {
      id: this.id("rel"),
      partnerId: input.partnerId,
      customerOrganizationId: input.customerOrganizationId,
      state: "ACTIVE",
      scopes: grantScopes(input.accessLevel),
      invitedByUserId: input.grantedByUserId,
      acceptedByUserId: input.grantedByUserId,
      expiresAt: null,
      createdAt: now,
      updatedAt: now
    };
    return this.saveRelationship(relationship);
  }

  async getRelationship(relationshipId: string): Promise<OrganizationRelationshipRecord | null> {
    return this.repository.get("organization_relationship", relationshipId);
  }

  async transitionRelationship(input: {
    relationshipId: string;
    nextState: OrganizationRelationshipState;
    actorUserId: string;
  }): Promise<OrganizationRelationshipRecord> {
    const relationship = await this.requireRelationship(input.relationshipId);
    if (!validRelationshipTransitions[relationship.state].includes(input.nextState)) {
      throw new Error(`Invalid relationship transition from ${relationship.state} to ${input.nextState}.`);
    }
    const updated: OrganizationRelationshipRecord = {
      ...relationship,
      state: input.nextState,
      acceptedByUserId: input.nextState === "ACTIVE" ? input.actorUserId : relationship.acceptedByUserId ?? null,
      suspendedByUserId: input.nextState === "SUSPENDED" ? input.actorUserId : relationship.suspendedByUserId,
      terminationRequestedByUserId:
        input.nextState === "TERMINATION_PENDING" ? input.actorUserId : relationship.terminationRequestedByUserId,
      terminatedByUserId: input.nextState === "TERMINATED" ? input.actorUserId : relationship.terminatedByUserId,
      updatedAt: this.timestamp()
    };
    return this.saveRelationship(updated);
  }

  async listRelationshipsForPartner(partnerId: string): Promise<OrganizationRelationshipRecord[]> {
    return this.repository.list("organization_relationship", { partitionKey: partnerId });
  }

  async listRelationshipsForOrganization(organizationId: string): Promise<OrganizationRelationshipRecord[]> {
    return this.repository.list("organization_relationship", { organizationId });
  }

  async createAssignment(input: {
    partnerId: string;
    relationshipId: string;
    customerOrganizationId: string;
    assigneeType: "user" | "team";
    assigneeId: string;
    scopes: string[];
    expiresAt?: string | null;
    createdByUserId: string;
  }): Promise<PartnerAssignmentRecord> {
    const relationship = await this.requireRelationship(input.relationshipId);
    if (
      relationship.state !== "ACTIVE" ||
      relationship.partnerId !== input.partnerId ||
      relationship.customerOrganizationId !== input.customerOrganizationId
    ) {
      throw new Error("Partner assignments require an active customer relationship.");
    }
    const now = this.timestamp();
    const assignment: PartnerAssignmentRecord = {
      id: this.id("assign"),
      partnerId: input.partnerId,
      relationshipId: input.relationshipId,
      customerOrganizationId: input.customerOrganizationId,
      assigneeType: input.assigneeType,
      assigneeId: input.assigneeId,
      scopes: input.scopes,
      expiresAt: input.expiresAt ?? null,
      createdByUserId: input.createdByUserId,
      revokedAt: null,
      createdAt: now,
      updatedAt: now
    };
    return this.saveAssignment(assignment);
  }

  async hasActiveAssignment(input: {
    partnerId: string;
    organizationId: string;
    userId: string;
    requiredScope?: string;
  }): Promise<boolean> {
    const now = this.now().toISOString();
    return (await this.listAssignments(input.partnerId)).some(
      (assignment) =>
        assignment.customerOrganizationId === input.organizationId &&
        assignment.assigneeType === "user" &&
        assignment.assigneeId === input.userId &&
        !assignment.revokedAt &&
        (!assignment.expiresAt || assignment.expiresAt > now) &&
        (!input.requiredScope || assignment.scopes.includes(input.requiredScope))
    );
  }

  async listAssignments(partnerId: string): Promise<PartnerAssignmentRecord[]> {
    return this.repository.list("partner_assignment", { partitionKey: partnerId });
  }

  async revokeAssignmentsForRelationship(relationshipId: string): Promise<PartnerAssignmentRecord[]> {
    const assignments = (await this.repository.list<PartnerAssignmentRecord>("partner_assignment")).filter(
      (assignment) => assignment.relationshipId === relationshipId && !assignment.revokedAt
    );
    const revokedAt = this.timestamp();
    const revoked = [];
    for (const assignment of assignments) {
      revoked.push(
        await this.saveAssignment({
          ...assignment,
          revokedAt,
          updatedAt: revokedAt
        })
      );
    }
    return revoked;
  }

  async createSupportSession(input: {
    organizationId: string;
    actorUserId: string;
    reason: string;
    policyBasis: "customer_approved" | "platform_break_glass";
    ticketReference?: string | null;
    ttlMinutes?: number;
  }): Promise<SupportSessionRecord> {
    const now = this.now();
    const ttlMinutes = Math.min(Math.max(input.ttlMinutes ?? 60, 5), 240);
    const session: SupportSessionRecord = {
      id: this.id("support"),
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      reason: input.reason,
      policyBasis: input.policyBasis,
      ticketReference: input.ticketReference ?? null,
      status: "active",
      startedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    return this.saveSupportSession(session);
  }

  async getSupportSession(supportSessionId: string): Promise<SupportSessionRecord | null> {
    return this.repository.get("support_session", supportSessionId);
  }

  async endSupportSession(input: { supportSessionId: string; reason: string }): Promise<SupportSessionRecord> {
    const session = await this.getSupportSession(input.supportSessionId);
    if (!session) {
      throw new Error(`Unknown support session: ${input.supportSessionId}`);
    }
    const ended: SupportSessionRecord = {
      ...session,
      status: "ended",
      endedAt: this.timestamp(),
      endReason: input.reason,
      updatedAt: this.timestamp()
    };
    return this.saveSupportSession(ended);
  }

  async listSupportSessions(organizationId?: string | null): Promise<SupportSessionRecord[]> {
    return this.repository.list("support_session", organizationId ? { organizationId } : {});
  }

  async createBusinessService(
    input: Omit<BusinessServiceRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<BusinessServiceRecord> {
    return this.createStoredRecord("business_service", "svc", input);
  }

  async listBusinessServices(organizationId: string): Promise<BusinessServiceRecord[]> {
    return this.repository.list("business_service", { organizationId });
  }

  async createPerson(
    input: Omit<PersonResponsibilityRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<PersonResponsibilityRecord> {
    return this.createStoredRecord("person_responsibility", "person", input);
  }

  async listPeople(organizationId: string): Promise<PersonResponsibilityRecord[]> {
    return this.repository.list("person_responsibility", { organizationId });
  }

  async createSupplier(input: Omit<SupplierRecord, "id" | "createdAt" | "updatedAt">): Promise<SupplierRecord> {
    return this.createStoredRecord("supplier", "supplier", input);
  }

  async listSuppliers(organizationId: string): Promise<SupplierRecord[]> {
    return this.repository.list("supplier", { organizationId });
  }

  async createAsset(input: Omit<ProductAssetRecord, "id" | "createdAt" | "updatedAt">): Promise<ProductAssetRecord> {
    return this.createStoredRecord("asset", "asset", input);
  }

  async listAssets(organizationId: string): Promise<ProductAssetRecord[]> {
    return this.repository.list("asset", { organizationId });
  }

  async createFinding(
    input: Omit<ProductFindingRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<ProductFindingRecord> {
    return this.createStoredRecord("finding", "finding", input);
  }

  async listFindings(organizationId: string): Promise<ProductFindingRecord[]> {
    return this.repository.list("finding", { organizationId });
  }

  async createRemediationPlan(
    input: Omit<RemediationPlanRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<RemediationPlanRecord> {
    return this.createStoredRecord("remediation_plan", "plan", input);
  }

  async listRemediationPlans(organizationId: string): Promise<RemediationPlanRecord[]> {
    return this.repository.list("remediation_plan", { organizationId });
  }

  async createTask(input: Omit<TaskRecord, "id" | "createdAt" | "updatedAt">): Promise<TaskRecord> {
    return this.createStoredRecord("task", "task", input);
  }

  async listTasks(organizationId: string): Promise<TaskRecord[]> {
    return this.repository.list("task", { organizationId });
  }

  async createIncident(input: { organizationId: string; title: string; awarenessTime?: string }): Promise<IncidentRecord> {
    const awarenessTime = input.awarenessTime ?? this.timestamp();
    return this.createStoredRecord("incident", "incident", {
      organizationId: input.organizationId,
      title: input.title,
      status: "NEW",
      awarenessTime,
      reportingClock: {
        ruleVersion: "nis2-eu-article-23-baseline.v1.review_required",
        earlyWarningDueAt: addHours(awarenessTime, 24),
        incidentNotificationDueAt: addHours(awarenessTime, 72),
        finalReportDueAt: addDays(addHours(awarenessTime, 72), 30)
      }
    });
  }

  async listIncidents(organizationId: string): Promise<IncidentRecord[]> {
    return this.repository.list("incident", { organizationId });
  }

  async createRisk(input: Omit<RiskRecord, "id" | "createdAt" | "updatedAt">): Promise<RiskRecord> {
    return this.createStoredRecord("risk", "risk", input);
  }

  async listRisks(organizationId: string): Promise<RiskRecord[]> {
    return this.repository.list("risk", { organizationId });
  }

  async createPolicy(input: Omit<PolicyDocumentRecord, "id" | "createdAt" | "updatedAt">): Promise<PolicyDocumentRecord> {
    return this.createStoredRecord("policy", "policy", input);
  }

  async listPolicies(organizationId: string): Promise<PolicyDocumentRecord[]> {
    return this.repository.list("policy", { organizationId });
  }

  async createSupplierReview(
    input: Omit<SupplierReviewRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<SupplierReviewRecord> {
    return this.createStoredRecord("supplier_review", "supplier_review", input);
  }

  async listSupplierReviews(organizationId: string): Promise<SupplierReviewRecord[]> {
    return this.repository.list("supplier_review", { organizationId });
  }

  async createPolicyReview(
    input: Omit<PolicyReviewRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<PolicyReviewRecord> {
    return this.createStoredRecord("policy_review", "policy_review", input);
  }

  async listPolicyReviews(organizationId: string): Promise<PolicyReviewRecord[]> {
    return this.repository.list("policy_review", { organizationId });
  }

  async createPolicyAcknowledgement(
    input: Omit<PolicyAcknowledgementRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<PolicyAcknowledgementRecord> {
    return this.createStoredRecord("policy_acknowledgement", "policy_ack", input);
  }

  async listPolicyAcknowledgements(organizationId: string): Promise<PolicyAcknowledgementRecord[]> {
    return this.repository.list("policy_acknowledgement", { organizationId });
  }

  async createGovernanceActivity(
    input: Omit<GovernanceActivityRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<GovernanceActivityRecord> {
    return this.createStoredRecord("governance_activity", "gov_activity", input);
  }

  async listGovernanceActivities(organizationId: string): Promise<GovernanceActivityRecord[]> {
    return this.repository.list("governance_activity", { organizationId });
  }

  async createGovernanceCalendarEvent(
    input: Omit<GovernanceCalendarEventRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<GovernanceCalendarEventRecord> {
    return this.createStoredRecord("governance_calendar_event", "gov_event", input);
  }

  async listGovernanceCalendarEvents(organizationId: string): Promise<GovernanceCalendarEventRecord[]> {
    return this.repository.list("governance_calendar_event", { organizationId });
  }

  async createAttestation(input: Omit<AttestationRecord, "id" | "createdAt" | "updatedAt">): Promise<AttestationRecord> {
    return this.createStoredRecord("attestation", "attestation", input);
  }

  async listAttestations(organizationId: string): Promise<AttestationRecord[]> {
    return this.repository.list("attestation", { organizationId });
  }

  async createTrainingRecord(
    input: Omit<TrainingRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<TrainingRecord> {
    return this.createStoredRecord("training_record", "training", input);
  }

  async listTrainingRecords(organizationId: string): Promise<TrainingRecord[]> {
    return this.repository.list("training_record", { organizationId });
  }

  async createRetentionPolicy(
    input: Omit<RetentionPolicyRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<RetentionPolicyRecord> {
    return this.createStoredRecord("retention_policy", "retention", input);
  }

  async getRetentionPolicy(retentionPolicyId: string): Promise<RetentionPolicyRecord | null> {
    return this.repository.get("retention_policy", retentionPolicyId);
  }

  async listRetentionPolicies(organizationId: string): Promise<RetentionPolicyRecord[]> {
    return this.repository.list("retention_policy", { organizationId });
  }

  async createFileObject(input: {
    organizationId: string;
    purpose: ProductV1FilePurpose;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256: string;
    storage: FileObjectRecord["storage"];
    scanStatus?: ProductV1FileScanStatus;
    scanFindings?: string[];
    retentionClass: ProductV1RetentionClass;
    retentionPolicyId?: string | null;
    legalHold?: boolean;
    legalHoldReason?: string | null;
    encryption?: Partial<FileObjectRecord["encryption"]>;
    sourceResourceType?: string | null;
    sourceResourceId?: string | null;
    sourceReferences?: string[];
    createdByUserId: string;
  }): Promise<FileObjectRecord> {
    const now = this.timestamp();
    const policy = input.retentionPolicyId ? await this.getRetentionPolicy(input.retentionPolicyId) : null;
    if (policy && policy.organizationId !== input.organizationId) {
      throw new Error("Retention policy does not belong to the organization.");
    }
    const retentionPolicy = policy
      ? {
          name: policy.name,
          retainForDays: policy.retainForDays,
          allowDeleteAfterRetention: policy.allowDeleteAfterRetention
        }
      : defaultRetentionPolicySnapshot(input.retentionClass);
    const fileObject: FileObjectRecord = {
      id: this.id("file"),
      organizationId: input.organizationId,
      purpose: input.purpose,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      storage: {
        provider: input.storage.provider,
        bucket: input.storage.bucket ?? null,
        key: input.storage.key,
        versionId: input.storage.versionId ?? null
      },
      scanStatus: input.scanStatus ?? "pending",
      scanFindings: input.scanFindings ?? [],
      retentionClass: input.retentionClass,
      retentionPolicyId: policy?.id ?? null,
      retentionPolicySnapshot: retentionPolicy,
      retainUntil: addDays(now, retentionPolicy.retainForDays),
      legalHold: input.legalHold ?? policy?.legalHoldDefault ?? false,
      legalHoldReason: input.legalHoldReason ?? null,
      encryption: {
        mode: input.encryption?.mode ?? "provider_managed",
        algorithm: input.encryption?.algorithm ?? null,
        keyRef: input.encryption?.keyRef ?? null
      },
      sourceResourceType: input.sourceResourceType ?? null,
      sourceResourceId: input.sourceResourceId ?? null,
      sourceReferences: input.sourceReferences ?? [],
      createdByUserId: input.createdByUserId,
      deletedAt: null,
      deleteReason: null,
      createdAt: now,
      updatedAt: now
    };
    return this.saveFileObject(fileObject);
  }

  async getFileObject(fileObjectId: string): Promise<FileObjectRecord | null> {
    return this.repository.get("file_object", fileObjectId);
  }

  async listFileObjects(organizationId: string): Promise<FileObjectRecord[]> {
    return this.repository.list("file_object", { organizationId });
  }

  async setFileObjectLegalHold(input: {
    organizationId: string;
    fileObjectId: string;
    legalHold: boolean;
    reason?: string | null;
  }): Promise<FileObjectRecord> {
    const fileObject = await this.requireFileObject(input.organizationId, input.fileObjectId);
    return this.saveFileObject({
      ...fileObject,
      legalHold: input.legalHold,
      legalHoldReason: input.legalHold ? input.reason ?? "legal_hold_applied" : null,
      updatedAt: this.timestamp()
    });
  }

  async tombstoneFileObject(input: {
    organizationId: string;
    fileObjectId: string;
    reason: string;
  }): Promise<{ fileObject: FileObjectRecord; deleted: boolean; blockedReason?: string }> {
    const fileObject = await this.requireFileObject(input.organizationId, input.fileObjectId);
    if (fileObject.deletedAt) {
      return { fileObject, deleted: true };
    }
    if (fileObject.legalHold) {
      return { fileObject, deleted: false, blockedReason: "legal_hold" };
    }
    if (new Date(fileObject.retainUntil).getTime() > this.now().getTime()) {
      return { fileObject, deleted: false, blockedReason: "retention_active" };
    }
    if (!fileObject.retentionPolicySnapshot.allowDeleteAfterRetention) {
      return { fileObject, deleted: false, blockedReason: "policy_disallows_delete" };
    }
    const tombstoned = await this.saveFileObject({
      ...fileObject,
      deletedAt: this.timestamp(),
      deleteReason: input.reason,
      updatedAt: this.timestamp()
    });
    return { fileObject: tombstoned, deleted: true };
  }

  async createReportSnapshot(input: {
    organizationId: string;
    templateKey: ReportTemplateKey;
    locale: "en" | "ro" | "pl" | "de";
    format?: ReportSnapshotFormat;
    version?: string;
    legalCaveat: string;
    legalCaveatLocale: string;
    legalCaveatFallbackUsed: boolean;
    sourceReferences: string[];
    content: Record<string, unknown>;
    createdByUserId: string;
  }): Promise<{ reportSnapshot: ReportSnapshotRecord; fileObject: FileObjectRecord }> {
    const now = this.timestamp();
    const reportSnapshotId = this.id("report");
    const format = input.format ?? "json";
    const version = input.version ?? "v1";
    const content = {
      schemaVersion: "puresoc.report-snapshot.v1",
      organizationId: input.organizationId,
      reportSnapshotId,
      templateKey: input.templateKey,
      locale: input.locale,
      format,
      version,
      generatedAt: now,
      legalCaveat: input.legalCaveat,
      sourceReferences: input.sourceReferences,
      content: input.content
    };
    const artifact = renderProductV1ReportSnapshotArtifact({
      id: reportSnapshotId,
      organizationId: input.organizationId,
      templateKey: input.templateKey,
      locale: input.locale,
      format,
      version,
      legalCaveat: input.legalCaveat,
      sourceReferences: input.sourceReferences,
      content,
      createdAt: now
    });
    const fileObject = await this.createFileObject({
      organizationId: input.organizationId,
      purpose: "generated_report",
      filename: artifact.filename,
      mimeType: artifact.mimeType,
      sizeBytes: artifact.body.byteLength,
      checksumSha256: artifact.checksumSha256,
      storage: {
        provider: "product_v1_state",
        bucket: "report-snapshots",
        key: `${input.organizationId}/${input.templateKey}/${reportSnapshotId}.${format}`
      },
      scanStatus: "skipped",
      scanFindings: [],
      retentionClass: "report_snapshot",
      encryption: {
        mode: "local_development",
        algorithm: "metadata-only",
        keyRef: "product_v1_state_records"
      },
      sourceResourceType: "report_snapshot",
      sourceResourceId: reportSnapshotId,
      sourceReferences: input.sourceReferences,
      createdByUserId: input.createdByUserId
    });
    const reportSnapshot: ReportSnapshotRecord = {
      id: reportSnapshotId,
      organizationId: input.organizationId,
      templateKey: input.templateKey,
      locale: input.locale,
      format,
      version,
      status: "ready",
      fileObjectId: fileObject.id,
      checksumSha256: artifact.checksumSha256,
      legalCaveat: input.legalCaveat,
      legalCaveatLocale: input.legalCaveatLocale,
      legalCaveatFallbackUsed: input.legalCaveatFallbackUsed,
      sourceReferences: input.sourceReferences,
      content,
      immutable: true,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now
    };
    return { reportSnapshot: await this.saveReportSnapshot(reportSnapshot), fileObject };
  }

  async listReportSnapshots(organizationId: string): Promise<ReportSnapshotRecord[]> {
    return this.repository.list("report_snapshot", { organizationId });
  }

  async getReportSnapshot(organizationId: string, reportSnapshotId: string): Promise<ReportSnapshotRecord | null> {
    const reportSnapshot = await this.repository.get<ReportSnapshotRecord>("report_snapshot", reportSnapshotId);
    return reportSnapshot?.organizationId === organizationId ? reportSnapshot : null;
  }

  private async saveSetupState(state: SetupStateRecord): Promise<SetupStateRecord> {
    const saved = await this.repository.upsert(
      "setup_state",
      { ...state, id: state.organizationId },
      { organizationId: state.organizationId }
    );
    const { id: _id, ...withoutId } = saved as SetupStateRecord & { id: string };
    return withoutId;
  }

  private async saveRelationship(relationship: OrganizationRelationshipRecord): Promise<OrganizationRelationshipRecord> {
    return this.repository.upsert("organization_relationship", relationship, {
      organizationId: relationship.customerOrganizationId,
      partitionKey: relationship.partnerId
    });
  }

  private async saveAssignment(assignment: PartnerAssignmentRecord): Promise<PartnerAssignmentRecord> {
    return this.repository.upsert("partner_assignment", assignment, {
      organizationId: assignment.customerOrganizationId,
      partitionKey: assignment.partnerId
    });
  }

  private async saveSupportSession(session: SupportSessionRecord): Promise<SupportSessionRecord> {
    return this.repository.upsert("support_session", session, { organizationId: session.organizationId });
  }

  private async saveFileObject(fileObject: FileObjectRecord): Promise<FileObjectRecord> {
    return this.repository.upsert("file_object", fileObject, { organizationId: fileObject.organizationId });
  }

  private async saveReportSnapshot(reportSnapshot: ReportSnapshotRecord): Promise<ReportSnapshotRecord> {
    return this.repository.upsert("report_snapshot", reportSnapshot, { organizationId: reportSnapshot.organizationId });
  }

  private async requireRelationship(relationshipId: string): Promise<OrganizationRelationshipRecord> {
    const relationship = await this.getRelationship(relationshipId);
    if (!relationship) {
      throw new Error(`Unknown organization relationship: ${relationshipId}`);
    }
    return relationship;
  }

  private async requireFileObject(organizationId: string, fileObjectId: string): Promise<FileObjectRecord> {
    const fileObject = await this.getFileObject(fileObjectId);
    if (!fileObject || fileObject.organizationId !== organizationId) {
      throw new Error(`Unknown file object: ${fileObjectId}`);
    }
    return fileObject;
  }

  private async createStoredRecord<T extends { id: string; organizationId: string; createdAt: string; updatedAt: string }>(
    recordType: ProductV1RecordType,
    idPrefix: string,
    input: Omit<T, "id" | "createdAt" | "updatedAt">
  ): Promise<T> {
    const now = this.timestamp();
    const record = {
      ...input,
      id: this.id(idPrefix),
      createdAt: now,
      updatedAt: now
    } as unknown as T;
    return this.repository.upsert(recordType, record, { organizationId: record.organizationId });
  }

  private id(prefix: string): string {
    return `${prefix}_${this.options.idFactory?.() ?? randomUUID()}`;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }
}

const cloneRecord = <T>(record: unknown): T => JSON.parse(JSON.stringify(record)) as T;

const recordTimestamp = (record: unknown, key: "createdAt" | "updatedAt"): string => {
  const value = typeof record === "object" && record !== null ? (record as Record<string, unknown>)[key] : null;
  return typeof value === "string" ? value : new Date().toISOString();
};

const grantScopes = (accessLevel: string): string[] => {
  if (accessLevel === "viewer") {
    return ["security.read", "compliance.read", "report.read"];
  }
  if (accessLevel === "analyst") {
    return ["security.read", "finding.manage", "task.manage", "compliance.read", "report.read"];
  }
  return ["security.read", "finding.manage", "task.manage", "compliance.read", "evidence.manage", "report.generate"];
};

const defaultRetentionPolicySnapshot = (
  retentionClass: ProductV1RetentionClass
): FileObjectRecord["retentionPolicySnapshot"] => {
  if (retentionClass === "temporary") {
    return {
      name: "Default temporary retention",
      retainForDays: 30,
      allowDeleteAfterRetention: true
    };
  }
  if (retentionClass === "audit_export") {
    return {
      name: "Default audit export retention",
      retainForDays: 2555,
      allowDeleteAfterRetention: false
    };
  }
  return {
    name: retentionClass === "report_snapshot" ? "Default report snapshot retention" : "Default evidence retention",
    retainForDays: 2555,
    allowDeleteAfterRetention: true
  };
};

const addHours = (isoTimestamp: string, hours: number): string =>
  new Date(new Date(isoTimestamp).getTime() + hours * 60 * 60 * 1000).toISOString();

const addDays = (isoTimestamp: string, days: number): string =>
  new Date(new Date(isoTimestamp).getTime() + days * 24 * 60 * 60 * 1000).toISOString();

export const renderProductV1ReportSnapshotArtifact = (
  reportSnapshot: Pick<
    ReportSnapshotRecord,
    | "id"
    | "organizationId"
    | "templateKey"
    | "locale"
    | "format"
    | "version"
    | "legalCaveat"
    | "sourceReferences"
    | "content"
    | "createdAt"
  >
): ProductV1ReportSnapshotArtifact => {
  const filename = `${reportSnapshot.templateKey}.${reportSnapshot.locale}.${reportSnapshot.format}`;
  const renderedAt = reportSnapshot.createdAt;

  if (reportSnapshot.format === "json") {
    const body = Buffer.from(stableJsonExport(reportSnapshot.content), "utf8");
    return {
      filename,
      format: "json",
      mimeType: "application/json",
      body,
      checksumSha256: sha256Hex(body),
      renderer: "puresoc-product-v1-state-renderer",
      renderedAt
    };
  }

  const reportJson = stableJsonExport(reportSnapshot.content);
  const body = Buffer.from(
    [
      "%PDF-1.4",
      "% PureSOC deterministic product-v1 report snapshot artifact",
      stableJsonExport({
        schemaVersion: "puresoc.product_v1.report_snapshot.pdf_artifact.v1",
        renderer: "puresoc-product-v1-state-renderer",
        renderedAt,
        organizationId: reportSnapshot.organizationId,
        reportSnapshotId: reportSnapshot.id,
        templateKey: reportSnapshot.templateKey,
        locale: reportSnapshot.locale,
        version: reportSnapshot.version,
        reportDataHashSha256: sha256Hex(Buffer.from(reportJson, "utf8")),
        legalCaveat: reportSnapshot.legalCaveat,
        sourceReferenceCount: reportSnapshot.sourceReferences.length
      }),
      "%%EOF",
      ""
    ].join("\n"),
    "utf8"
  );

  return {
    filename,
    format: "pdf",
    mimeType: "application/pdf",
    body,
    checksumSha256: sha256Hex(body),
    renderer: "puresoc-product-v1-state-renderer",
    renderedAt
  };
};

const sha256Hex = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
