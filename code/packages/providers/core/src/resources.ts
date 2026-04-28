export type ProviderKey = "microsoft365" | "google_workspace" | "google-workspace" | "mock";

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

export interface ProviderFinding {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  normalizedResourceId?: string;
  providerKey: ProviderKey | string;
  moduleKey: string;
  findingKey: string;
  title: string;
  summary: string;
  severity: "informational" | "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved" | "suppressed";
  evidence: Record<string, unknown>;
}

export interface ProviderRecommendation {
  id: string;
  organizationId: string;
  providerConnectionId?: string;
  sourceFindingId?: string;
  providerKey: ProviderKey | string;
  moduleKey?: string;
  controlId?: string;
  jurisdiction: string;
  title: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: "low" | "medium" | "high";
  automationMode: "manual" | "guided" | "preflightable" | "executable_later";
  requiredPermissions: string[];
  requiredLicense: string[];
  expectedChange?: string;
  blastRadius?: string;
  manualFallback?: string;
  evidenceRequired: boolean;
}

export const providerResourceIdempotencyParts = [
  "organizationId",
  "providerConnectionId",
  "providerKey",
  "externalResourceType",
  "externalId"
] as const;

