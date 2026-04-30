import type {
  CloudTenant,
  ProviderConnectionStatus,
  ProviderFindingInput,
  ProviderKey,
  ProviderNormalizedResourceInput,
  ProviderRawResourceInput,
  ProviderRecommendationInput,
  ProviderSyncModuleStatus
} from "./resources";
import type {
  ApplyActionInput,
  EvidenceCollectionInput,
  ProviderActionEvidenceArtifact,
  ProviderActionExecutionResult,
  ProviderActionValidationResult,
  ProviderActionVerificationResult,
  ValidateActionInput,
  VerifyActionInput
} from "./actions";

export interface ProviderConnectionRecord {
  id: string;
  organizationId: string;
  providerKey: ProviderKey | string;
  displayName: string;
  externalTenantId?: string;
  externalTenantName?: string;
  status: ProviderConnectionStatus;
  readEnabled: boolean;
  writeEnabled: boolean;
  metadata: Record<string, unknown>;
  lastSuccessfulSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderPermissionBundleRecord {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  providerKey: ProviderKey | string;
  bundleKey: string;
  permissionsRequired: string[];
  permissionsGranted: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProviderCredentialType = "oauth_token" | "certificate" | "service_account" | "api_key";

export interface ProviderCredentialRecord {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  providerKey: ProviderKey | string;
  credentialType: ProviderCredentialType;
  encryptedPayload: string;
  expiresAt?: string;
  rotationRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProviderCredentialInput = Omit<ProviderCredentialRecord, "id" | "createdAt" | "updatedAt">;

export type ProviderPermissionBundleInput = Omit<ProviderPermissionBundleRecord, "id" | "createdAt" | "updatedAt">;

export interface ProviderCapabilityRecord {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  providerKey: ProviderKey | string;
  moduleKey: string;
  capabilityKey: string;
  available: boolean;
  licenseRequired: string[];
  licenseDetected: string[];
  permissionsRequired: string[];
  permissionsGranted: string[];
  status: ProviderSyncModuleStatus;
  statusReason?: string;
  updatedAt: string;
}

export interface ProviderSyncRunRecord {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  providerKey: ProviderKey | string;
  status: ProviderSyncModuleStatus;
  startedAt: string;
  completedAt?: string;
  error?: Record<string, unknown>;
  summary: Record<string, unknown>;
}

export interface ProviderSyncModuleRecord {
  id: string;
  organizationId: string;
  providerConnectionId: string;
  syncRunId: string;
  providerKey: ProviderKey | string;
  moduleKey: string;
  status: ProviderSyncModuleStatus;
  missingPermissions: string[];
  missingLicenses: string[];
  statusReason?: string;
  startedAt: string;
  completedAt?: string;
  pagesRead: number;
  retryCount: number;
}

export interface BeginConnectionInput {
  organizationId: string;
  actorUserId: string;
  redirectUri: string;
  state: string;
  requestedPermissionBundles: string[];
  metadata?: Record<string, unknown>;
}

export interface ConnectionRedirect {
  url: string;
  state: string;
  expiresAt?: string;
}

export interface CompleteConnectionInput {
  organizationId: string;
  actorUserId: string;
  redirectUri: string;
  state: string;
  authorizationCode?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderConnectionResult {
  connection: ProviderConnectionRecord;
  grantedPermissionBundles: string[];
  permissionBundles?: ProviderPermissionBundleInput[];
  credentials?: ProviderCredentialInput[];
  capabilities: ProviderCapabilityRecord[];
  tenantProfile?: CloudTenant;
}

export interface TenantProfileInput {
  organizationId: string;
  providerConnectionId: string;
}

export interface SyncInput {
  organizationId: string;
  providerConnectionId: string;
  syncRunId: string;
  startedAt: string;
  requestedModules?: string[];
  maxRetries?: number;
  allowProviderWrites?: boolean;
}

export interface ProviderModuleSyncResult {
  moduleKey: string;
  status: ProviderSyncModuleStatus;
  missingPermissions: string[];
  missingLicenses: string[];
  statusReason?: string;
  rawResources: ProviderRawResourceInput[];
  normalizedResources: ProviderNormalizedResourceInput[];
  findings: ProviderFindingInput[];
  recommendations: ProviderRecommendationInput[];
  pagesRead: number;
  retryCount: number;
  error?: Record<string, unknown>;
}

export interface ProviderEvaluationInput {
  organizationId: string;
  providerConnectionId: string;
  syncRunId: string;
  normalizedResources: ProviderNormalizedResourceInput[];
}

export interface RecommendationInput {
  organizationId: string;
  providerConnectionId: string;
  syncRunId: string;
  findings: ProviderFindingInput[];
}

export interface CloudProviderConnector {
  providerKey: ProviderKey | string;
  beginConnection(input: BeginConnectionInput): Promise<ConnectionRedirect>;
  completeConnection(input: CompleteConnectionInput): Promise<ProviderConnectionResult>;
  getTenantProfile(input: TenantProfileInput): Promise<CloudTenant>;
  syncReadOnlyModules(input: SyncInput): Promise<ProviderModuleSyncResult[]>;
  evaluateControls(input: ProviderEvaluationInput): Promise<ProviderFindingInput[]>;
  getRecommendedActions(input: RecommendationInput): Promise<ProviderRecommendationInput[]>;
  validateAction?(input: ValidateActionInput): Promise<ProviderActionValidationResult>;
  applyAction?(input: ApplyActionInput): Promise<ProviderActionExecutionResult>;
  verifyAction?(input: VerifyActionInput): Promise<ProviderActionVerificationResult>;
  collectActionEvidence?(input: EvidenceCollectionInput): Promise<ProviderActionEvidenceArtifact[]>;
}

export const emptyProviderModuleSyncResult = (
  moduleKey: string,
  status: ProviderSyncModuleStatus = "skipped",
  statusReason?: string
): ProviderModuleSyncResult => ({
  moduleKey,
  status,
  missingPermissions: [],
  missingLicenses: [],
  statusReason,
  rawResources: [],
  normalizedResources: [],
  findings: [],
  recommendations: [],
  pagesRead: 0,
  retryCount: 0
});
