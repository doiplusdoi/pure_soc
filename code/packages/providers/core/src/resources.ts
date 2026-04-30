import type { ActionableSeverity, FindingSeverity } from "../../../shared/src/index";

export type ProviderKey = "microsoft365" | "google_workspace" | "google-workspace" | "mock";

export type ProviderConnectionStatus = "pending" | "connected" | "degraded" | "revoked" | "failed";

export type ProviderSyncModuleStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "partial"
  | "failed"
  | "skipped"
  | "unavailable_license"
  | "missing_permission"
  | "unsupported_api"
  | "rate_limited"
  | "revoked_consent";

export type ProviderFindingSeverity = FindingSeverity;

export type ProviderFindingStatus = "open" | "acknowledged" | "resolved" | "suppressed";

export type ProviderRecommendationType =
  | "manual"
  | "guided"
  | "technical"
  | "process"
  | "evidence_upload"
  | "country_registration"
  | "incident_reporting";

export type ProviderAutomationMode = "manual" | "guided" | "preflightable" | "executable_later";

export type ProviderRecommendationStatus = "proposed" | "accepted" | "planned" | "completed" | "dismissed";

export type ProviderResourceType =
  | "cloud_tenant"
  | "cloud_user"
  | "cloud_group"
  | "cloud_admin_role"
  | "cloud_device"
  | "cloud_application"
  | "cloud_policy"
  | "cloud_security_alert"
  | "cloud_incident"
  | "cloud_audit_event"
  | "cloud_license"
  | "cloud_secure_score"
  | "cloud_finding"
  | "cloud_recommendation"
  | "cloud_action";

export interface ProviderResourceIdentity {
  organizationId: string;
  providerConnectionId: string;
  providerKey: ProviderKey | string;
  externalId: string;
  externalResourceType: string;
}

export interface ProviderRawResourceInput extends ProviderResourceIdentity {
  sourceModule: string;
  syncRunId: string;
  rawJson: Record<string, unknown>;
  observedAt?: string;
}

export interface ProviderRawResource extends ProviderResourceIdentity {
  id: string;
  sourceModule: string;
  syncRunId: string;
  rawJson: Record<string, unknown>;
  contentHash: string;
  firstSeenAt: string;
  lastSeenAt: string;
  deletedAt?: string;
}

export interface ProviderNormalizedResource<TNormalized extends Record<string, unknown> = Record<string, unknown>>
  extends ProviderResourceIdentity {
  id: string;
  rawResourceId?: string;
  resourceType: ProviderResourceType;
  sourceModule: string;
  normalizedJson: TNormalized;
  contentHash: string;
  firstSeenAt: string;
  lastSeenAt: string;
  deletedAt?: string;
}

export interface ProviderNormalizedResourceInput<
  TNormalized extends Record<string, unknown> = Record<string, unknown>
> extends ProviderResourceIdentity {
  rawResourceId?: string;
  resourceType: ProviderResourceType;
  sourceModule: string;
  syncRunId?: string;
  normalizedJson: TNormalized;
  observedAt?: string;
}

export interface ProviderFindingInput {
  organizationId: string;
  providerConnectionId: string;
  normalizedResourceId?: string;
  resourceExternalId?: string;
  resourceType?: ProviderResourceType;
  syncRunId?: string;
  providerKey: ProviderKey | string;
  moduleKey: string;
  findingKey: string;
  title: string;
  summary: string;
  severity: ProviderFindingSeverity;
  status?: ProviderFindingStatus;
  evidence: Record<string, unknown>;
  observedAt?: string;
}

export interface ProviderFinding {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  normalizedResourceId?: string;
  resourceExternalId?: string;
  resourceType?: ProviderResourceType;
  syncRunId?: string;
  providerKey: ProviderKey | string;
  moduleKey: string;
  findingKey: string;
  title: string;
  summary: string;
  severity: ProviderFindingSeverity;
  status: ProviderFindingStatus;
  evidence: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string;
}

export interface ProviderRecommendationInput {
  organizationId: string;
  providerConnectionId?: string;
  sourceFindingId?: string;
  sourceFindingKey?: string;
  providerKey: ProviderKey | string;
  moduleKey?: string;
  controlId?: string;
  jurisdiction: string;
  title: string;
  summary: string;
  severity: ActionableSeverity;
  confidence: "low" | "medium" | "high";
  recommendationType: ProviderRecommendationType;
  automationMode: ProviderAutomationMode;
  requiredPermissions: string[];
  requiredLicense: string[];
  expectedChange?: string;
  blastRadius?: string;
  manualFallback?: string;
  evidenceRequired: boolean;
  sourceReferences?: Record<string, unknown>[];
  status?: ProviderRecommendationStatus;
}

export interface ProviderRecommendation {
  id: string;
  organizationId: string;
  providerConnectionId?: string;
  sourceFindingId?: string;
  sourceFindingKey?: string;
  providerKey: ProviderKey | string;
  moduleKey?: string;
  controlId?: string;
  jurisdiction: string;
  title: string;
  summary: string;
  severity: ActionableSeverity;
  confidence: "low" | "medium" | "high";
  recommendationType: ProviderRecommendationType;
  automationMode: ProviderAutomationMode;
  requiredPermissions: string[];
  requiredLicense: string[];
  expectedChange?: string;
  blastRadius?: string;
  manualFallback?: string;
  evidenceRequired: boolean;
  sourceReferences?: Record<string, unknown>[];
  status: ProviderRecommendationStatus;
  createdAt: string;
  updatedAt: string;
}

export const providerResourceIdempotencyParts = [
  "organizationId",
  "providerConnectionId",
  "providerKey",
  "externalResourceType",
  "externalId"
] as const;

export interface CloudResourceBase<
  TResourceType extends ProviderResourceType,
  TNormalized extends Record<string, unknown>
> extends ProviderNormalizedResource<TNormalized> {
  resourceType: TResourceType;
}

export type CloudTenant = CloudResourceBase<
  "cloud_tenant",
  {
    tenantId: string;
    displayName: string;
    domains?: string[];
  }
>;

export type CloudUser = CloudResourceBase<
  "cloud_user",
  {
    userPrincipalName: string;
    displayName: string;
    accountEnabled: boolean;
    userType?: "member" | "guest";
    mfaEnabled?: boolean;
    lastSignInAt?: string;
  }
>;

export type CloudGroup = CloudResourceBase<"cloud_group", { displayName: string; groupType?: string }>;

export type CloudAdminRole = CloudResourceBase<
  "cloud_admin_role",
  {
    roleName: string;
    assignedPrincipalIds: string[];
    privileged: boolean;
  }
>;

export type CloudDevice = CloudResourceBase<
  "cloud_device",
  {
    displayName: string;
    complianceState?: string;
    managed?: boolean;
  }
>;

export type CloudApplication = CloudResourceBase<
  "cloud_application",
  {
    displayName: string;
    appId?: string;
    credentialExpiryAt?: string;
    permissions?: string[];
  }
>;

export type CloudPolicy = CloudResourceBase<
  "cloud_policy",
  {
    displayName: string;
    policyType: string;
    enabled: boolean;
  }
>;

export type CloudSecurityAlert = CloudResourceBase<
  "cloud_security_alert",
  {
    title: string;
    severity: ProviderFindingSeverity;
    status: string;
  }
>;

export type CloudIncident = CloudResourceBase<
  "cloud_incident",
  {
    title: string;
    severity: ProviderFindingSeverity;
    status: string;
  }
>;

export type CloudAuditEvent = CloudResourceBase<
  "cloud_audit_event",
  {
    eventType: string;
    actor?: string;
    occurredAt: string;
  }
>;

export type CloudLicense = CloudResourceBase<
  "cloud_license",
  {
    skuPartNumber: string;
    servicePlans: string[];
  }
>;

export type CloudSecureScore = CloudResourceBase<
  "cloud_secure_score",
  {
    currentScore: number;
    maxScore: number;
  }
>;

export type CloudFinding = CloudResourceBase<"cloud_finding", Record<string, unknown>>;

export type CloudRecommendation = CloudResourceBase<"cloud_recommendation", Record<string, unknown>>;

export type CloudAction = CloudResourceBase<
  "cloud_action",
  {
    actionType: string;
    status: "disabled" | "manual_only" | "approval_required";
  }
>;
