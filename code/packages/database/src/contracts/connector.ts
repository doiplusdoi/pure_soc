export type ProviderConnectionStatus = "pending" | "connected" | "degraded" | "revoked" | "failed";

export type ProviderModuleStatus =
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

export interface ProviderConnectionRecord {
  id: string;
  organizationId: string;
  providerKey: string;
  displayName: string;
  externalTenantId?: string;
  externalTenantName?: string;
  status: ProviderConnectionStatus;
  readEnabled: boolean;
  writeEnabled: boolean;
  metadata: Record<string, unknown>;
  lastSuccessfulSyncAt?: string;
}

export interface ProviderSyncRunRecord {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  providerKey: string;
  status: ProviderModuleStatus;
  startedAt: string;
  completedAt?: string;
  summary: Record<string, unknown>;
}

export interface ProviderSyncModuleRecord {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  syncRunId: string;
  providerKey: string;
  moduleKey: string;
  status: ProviderModuleStatus;
  missingPermissions: string[];
  missingLicenses: string[];
  statusReason?: string;
}

export interface ProviderFindingRecord {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  normalizedResourceId?: string;
  syncRunId?: string;
  providerKey: string;
  moduleKey: string;
  findingKey: string;
  title: string;
  summary: string;
  severity: "informational" | "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved" | "suppressed";
}

