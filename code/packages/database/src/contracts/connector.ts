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

export interface ProviderPermissionBundleRecord {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  providerKey: string;
  bundleKey: string;
  permissionsRequired: string[];
  permissionsGranted: string[];
  enabled: boolean;
}

export interface ProviderCapabilityRecord {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  providerKey: string;
  moduleKey: string;
  capabilityKey: string;
  available: boolean;
  licenseRequired: string[];
  licenseDetected: string[];
  permissionsRequired: string[];
  permissionsGranted: string[];
  status: ProviderModuleStatus;
  statusReason?: string;
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
  pagesRead?: number;
  retryCount?: number;
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

export interface ProviderRecommendationRecord {
  id: string;
  organizationId: string;
  providerConnectionId?: string;
  sourceFindingId?: string;
  providerKey: string;
  moduleKey?: string;
  controlId?: string;
  jurisdiction: string;
  title: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: "low" | "medium" | "high";
  recommendationType: "manual" | "guided" | "technical" | "process" | "evidence_upload" | "country_registration" | "incident_reporting";
  automationMode: "manual" | "guided" | "preflightable" | "executable_later";
  requiredPermissions: string[];
  requiredLicense: string[];
  expectedChange?: string;
  blastRadius?: string;
  manualFallback?: string;
  evidenceRequired: boolean;
  status: "proposed" | "accepted" | "planned" | "completed" | "dismissed";
  sourceReferences?: Record<string, unknown>[];
}
