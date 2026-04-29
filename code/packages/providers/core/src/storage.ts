import { createHash, randomUUID } from "node:crypto";

import type {
  ProviderCapabilityRecord,
  ProviderConnectionRecord,
  ProviderCredentialInput,
  ProviderCredentialRecord,
  ProviderPermissionBundleInput,
  ProviderPermissionBundleRecord,
  ProviderSyncModuleRecord,
  ProviderSyncRunRecord
} from "./connector";
import type {
  ProviderFinding,
  ProviderFindingInput,
  ProviderKey,
  ProviderNormalizedResource,
  ProviderNormalizedResourceInput,
  ProviderRawResource,
  ProviderRawResourceInput,
  ProviderRecommendation,
  ProviderRecommendationInput,
  ProviderSyncModuleStatus
} from "./resources";

export class ProviderStoreIsolationError extends Error {
  readonly code = "cross_organization_provider_resource";

  constructor(resourceType: string, resourceId: string, organizationId: string) {
    super(`Provider ${resourceType} ${resourceId} does not belong to organization ${organizationId}.`);
    this.name = "ProviderStoreIsolationError";
  }
}

export const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
};

export const contentHash = (value: unknown): string =>
  createHash("sha256").update(stableStringify(value)).digest("hex");

export const providerResourceIdempotencyKey = (identity: {
  organizationId: string;
  providerConnectionId: string;
  providerKey: ProviderKey | string;
  externalResourceType: string;
  externalId: string;
}): string =>
  [
    identity.organizationId,
    identity.providerConnectionId,
    identity.providerKey,
    identity.externalResourceType,
    identity.externalId
  ].join(":");

export const providerNormalizedResourceIdempotencyKey = (identity: {
  organizationId: string;
  providerConnectionId: string;
  providerKey: ProviderKey | string;
  resourceType: string;
  externalId: string;
}): string =>
  [identity.organizationId, identity.providerConnectionId, identity.providerKey, identity.resourceType, identity.externalId].join(
    ":"
  );

const recommendationKey = (input: ProviderRecommendationInput): string =>
  [
    input.organizationId,
    input.providerConnectionId ?? "global",
    input.providerKey,
    input.sourceFindingId ?? input.sourceFindingKey ?? "no_finding",
    input.title
  ].join(":");

export interface CreateProviderConnectionInput {
  id?: string;
  organizationId: string;
  providerKey: ProviderKey | string;
  displayName: string;
  externalTenantId?: string;
  externalTenantName?: string;
  status?: ProviderConnectionRecord["status"];
  readEnabled?: boolean;
  writeEnabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProviderResourceStore {
  createConnection(input: CreateProviderConnectionInput): Promise<ProviderConnectionRecord>;
  getConnectionForOrganization(organizationId: string, providerConnectionId: string): Promise<ProviderConnectionRecord>;
  listConnections(organizationId: string): Promise<ProviderConnectionRecord[]>;
  upsertCredential(input: ProviderCredentialInput): Promise<ProviderCredentialRecord>;
  listCredentials(organizationId: string, providerConnectionId: string): Promise<ProviderCredentialRecord[]>;
  upsertPermissionBundle(input: ProviderPermissionBundleInput): Promise<ProviderPermissionBundleRecord>;
  listPermissionBundles(organizationId: string, providerConnectionId: string): Promise<ProviderPermissionBundleRecord[]>;
  createSyncRun(input: {
    organizationId: string;
    providerConnectionId: string;
    providerKey: ProviderKey | string;
  }): Promise<ProviderSyncRunRecord>;
  completeSyncRun(
    syncRunId: string,
    status: ProviderSyncModuleStatus,
    summary: Record<string, unknown>,
    error?: Record<string, unknown>
  ): Promise<ProviderSyncRunRecord>;
  upsertSyncModule(input: Omit<ProviderSyncModuleRecord, "id" | "startedAt" | "completedAt">): Promise<ProviderSyncModuleRecord>;
  upsertCapability(input: Omit<ProviderCapabilityRecord, "id" | "updatedAt">): Promise<ProviderCapabilityRecord>;
  listCapabilities(organizationId: string, providerConnectionId: string): Promise<ProviderCapabilityRecord[]>;
  upsertRawResource(input: ProviderRawResourceInput): Promise<ProviderRawResource>;
  upsertNormalizedResource(input: ProviderNormalizedResourceInput): Promise<ProviderNormalizedResource>;
  upsertFinding(input: ProviderFindingInput): Promise<ProviderFinding>;
  upsertRecommendation(input: ProviderRecommendationInput): Promise<ProviderRecommendation>;
  getRawResourceForOrganization(organizationId: string, resourceId: string): Promise<ProviderRawResource>;
  listSyncModules(syncRunId: string): Promise<ProviderSyncModuleRecord[]>;
  listSyncModulesForConnection(organizationId: string, providerConnectionId: string): Promise<ProviderSyncModuleRecord[]>;
  listRawResources(organizationId: string, providerConnectionId: string): Promise<ProviderRawResource[]>;
  listNormalizedResources(organizationId: string, providerConnectionId: string): Promise<ProviderNormalizedResource[]>;
  listFindings(organizationId: string, providerConnectionId: string): Promise<ProviderFinding[]>;
  listRecommendations(organizationId: string, providerConnectionId: string): Promise<ProviderRecommendation[]>;
}

export class InMemoryProviderResourceStore implements ProviderResourceStore {
  readonly connections = new Map<string, ProviderConnectionRecord>();
  readonly credentials = new Map<string, ProviderCredentialRecord>();
  readonly permissionBundles = new Map<string, ProviderPermissionBundleRecord>();
  readonly capabilities = new Map<string, ProviderCapabilityRecord>();
  readonly syncRuns = new Map<string, ProviderSyncRunRecord>();
  readonly syncModules = new Map<string, ProviderSyncModuleRecord>();
  readonly rawResources = new Map<string, ProviderRawResource>();
  readonly normalizedResources = new Map<string, ProviderNormalizedResource>();
  readonly findings = new Map<string, ProviderFinding>();
  readonly recommendations = new Map<string, ProviderRecommendation>();

  private readonly rawResourceKeys = new Map<string, string>();
  private readonly normalizedResourceKeys = new Map<string, string>();
  private readonly findingKeys = new Map<string, string>();
  private readonly recommendationKeys = new Map<string, string>();
  private readonly credentialKeys = new Map<string, string>();
  private readonly permissionBundleKeys = new Map<string, string>();
  private readonly capabilityKeys = new Map<string, string>();
  private readonly syncModuleKeys = new Map<string, string>();
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: { now?: () => Date; idFactory?: () => string } = {}) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async createConnection(input: CreateProviderConnectionInput): Promise<ProviderConnectionRecord> {
    const timestamp = this.timestamp();
    const record: ProviderConnectionRecord = {
      id: input.id ?? this.idFactory(),
      organizationId: input.organizationId,
      providerKey: input.providerKey,
      displayName: input.displayName,
      externalTenantId: input.externalTenantId,
      externalTenantName: input.externalTenantName,
      status: input.status ?? "connected",
      readEnabled: input.readEnabled ?? true,
      writeEnabled: input.writeEnabled ?? false,
      metadata: input.metadata ?? {},
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.connections.set(record.id, record);
    return record;
  }

  async getConnectionForOrganization(organizationId: string, providerConnectionId: string): Promise<ProviderConnectionRecord> {
    const connection = this.connections.get(providerConnectionId);
    if (!connection || connection.organizationId !== organizationId) {
      throw new ProviderStoreIsolationError("connection", providerConnectionId, organizationId);
    }

    return connection;
  }

  async listConnections(organizationId: string): Promise<ProviderConnectionRecord[]> {
    return [...this.connections.values()].filter((connection) => connection.organizationId === organizationId);
  }

  async upsertCredential(input: ProviderCredentialInput): Promise<ProviderCredentialRecord> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);

    const key = [input.providerConnectionId, input.credentialType].join(":");
    const existingId = this.credentialKeys.get(key);
    const existing = existingId ? this.credentials.get(existingId) : undefined;
    const timestamp = this.timestamp();
    const record: ProviderCredentialRecord = {
      ...input,
      id: existing?.id ?? this.idFactory(),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };

    this.credentialKeys.set(key, record.id);
    this.credentials.set(record.id, record);
    return record;
  }

  async listCredentials(organizationId: string, providerConnectionId: string): Promise<ProviderCredentialRecord[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    return [...this.credentials.values()].filter(
      (credential) =>
        credential.organizationId === organizationId && credential.providerConnectionId === providerConnectionId
    );
  }

  async upsertPermissionBundle(input: ProviderPermissionBundleInput): Promise<ProviderPermissionBundleRecord> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);

    const key = [input.providerConnectionId, input.bundleKey].join(":");
    const existingId = this.permissionBundleKeys.get(key);
    const existing = existingId ? this.permissionBundles.get(existingId) : undefined;
    const timestamp = this.timestamp();
    const record: ProviderPermissionBundleRecord = {
      ...input,
      id: existing?.id ?? this.idFactory(),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };

    this.permissionBundleKeys.set(key, record.id);
    this.permissionBundles.set(record.id, record);
    return record;
  }

  async listPermissionBundles(
    organizationId: string,
    providerConnectionId: string
  ): Promise<ProviderPermissionBundleRecord[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    return [...this.permissionBundles.values()].filter(
      (bundle) => bundle.organizationId === organizationId && bundle.providerConnectionId === providerConnectionId
    );
  }

  async createSyncRun(input: {
    organizationId: string;
    providerConnectionId: string;
    providerKey: ProviderKey | string;
  }): Promise<ProviderSyncRunRecord> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);

    const run: ProviderSyncRunRecord = {
      id: this.idFactory(),
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      providerKey: input.providerKey,
      status: "running",
      startedAt: this.timestamp(),
      summary: {}
    };

    this.syncRuns.set(run.id, run);
    return run;
  }

  async completeSyncRun(
    syncRunId: string,
    status: ProviderSyncModuleStatus,
    summary: Record<string, unknown>,
    error?: Record<string, unknown>
  ): Promise<ProviderSyncRunRecord> {
    const existing = this.syncRuns.get(syncRunId);
    if (!existing) {
      throw new Error(`Unknown provider sync run: ${syncRunId}`);
    }

    const updated: ProviderSyncRunRecord = {
      ...existing,
      status,
      completedAt: this.timestamp(),
      summary,
      error
    };
    this.syncRuns.set(syncRunId, updated);
    return updated;
  }

  async upsertSyncModule(
    input: Omit<ProviderSyncModuleRecord, "id" | "startedAt" | "completedAt">
  ): Promise<ProviderSyncModuleRecord> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);

    const key = [input.syncRunId, input.moduleKey].join(":");
    const existingId = this.syncModuleKeys.get(key);
    const existing = existingId ? this.syncModules.get(existingId) : undefined;
    const record: ProviderSyncModuleRecord = {
      ...input,
      id: existing?.id ?? this.idFactory(),
      startedAt: existing?.startedAt ?? this.timestamp(),
      completedAt: this.timestamp()
    };

    this.syncModuleKeys.set(key, record.id);
    this.syncModules.set(record.id, record);
    return record;
  }

  async upsertCapability(input: Omit<ProviderCapabilityRecord, "id" | "updatedAt">): Promise<ProviderCapabilityRecord> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);

    const key = [input.providerConnectionId, input.capabilityKey].join(":");
    const existingId = this.capabilityKeys.get(key);
    const record: ProviderCapabilityRecord = {
      ...input,
      id: existingId ?? this.idFactory(),
      updatedAt: this.timestamp()
    };

    this.capabilityKeys.set(key, record.id);
    this.capabilities.set(record.id, record);
    return record;
  }

  async listCapabilities(organizationId: string, providerConnectionId: string): Promise<ProviderCapabilityRecord[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    return [...this.capabilities.values()].filter(
      (capability) =>
        capability.organizationId === organizationId && capability.providerConnectionId === providerConnectionId
    );
  }

  async upsertRawResource(input: ProviderRawResourceInput): Promise<ProviderRawResource> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);

    const key = providerResourceIdempotencyKey(input);
    const existingId = this.rawResourceKeys.get(key);
    const existing = existingId ? this.rawResources.get(existingId) : undefined;
    const observedAt = input.observedAt ?? this.timestamp();
    const record: ProviderRawResource = {
      ...input,
      id: existing?.id ?? this.idFactory(),
      contentHash: contentHash(input.rawJson),
      firstSeenAt: existing?.firstSeenAt ?? observedAt,
      lastSeenAt: observedAt
    };

    this.rawResourceKeys.set(key, record.id);
    this.rawResources.set(record.id, record);
    return record;
  }

  async upsertNormalizedResource(input: ProviderNormalizedResourceInput): Promise<ProviderNormalizedResource> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);

    const key = providerNormalizedResourceIdempotencyKey(input);
    const existingId = this.normalizedResourceKeys.get(key);
    const existing = existingId ? this.normalizedResources.get(existingId) : undefined;
    const observedAt = input.observedAt ?? this.timestamp();
    const record: ProviderNormalizedResource = {
      ...input,
      id: existing?.id ?? this.idFactory(),
      contentHash: contentHash(input.normalizedJson),
      firstSeenAt: existing?.firstSeenAt ?? observedAt,
      lastSeenAt: observedAt
    };

    this.normalizedResourceKeys.set(key, record.id);
    this.normalizedResources.set(record.id, record);
    return record;
  }

  async upsertFinding(input: ProviderFindingInput): Promise<ProviderFinding> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);

    const key = [input.organizationId, input.providerConnectionId, input.providerKey, input.findingKey].join(":");
    const existingId = this.findingKeys.get(key);
    const existing = existingId ? this.findings.get(existingId) : undefined;
    const observedAt = input.observedAt ?? this.timestamp();
    const record: ProviderFinding = {
      ...input,
      id: existing?.id ?? this.idFactory(),
      status: input.status ?? existing?.status ?? "open",
      firstSeenAt: existing?.firstSeenAt ?? observedAt,
      lastSeenAt: observedAt,
      resolvedAt: input.status === "resolved" ? observedAt : existing?.resolvedAt
    };

    this.findingKeys.set(key, record.id);
    this.findings.set(record.id, record);
    return record;
  }

  async upsertRecommendation(input: ProviderRecommendationInput): Promise<ProviderRecommendation> {
    if (input.providerConnectionId) {
      await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    }

    const key = recommendationKey(input);
    const existingId = this.recommendationKeys.get(key);
    const existing = existingId ? this.recommendations.get(existingId) : undefined;
    const timestamp = this.timestamp();
    const record: ProviderRecommendation = {
      ...input,
      id: existing?.id ?? this.idFactory(),
      status: input.status ?? existing?.status ?? "proposed",
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };

    this.recommendationKeys.set(key, record.id);
    this.recommendations.set(record.id, record);
    return record;
  }

  async getRawResourceForOrganization(organizationId: string, resourceId: string): Promise<ProviderRawResource> {
    const resource = this.rawResources.get(resourceId);
    if (!resource || resource.organizationId !== organizationId) {
      throw new ProviderStoreIsolationError("raw_resource", resourceId, organizationId);
    }

    return resource;
  }

  async listSyncModules(syncRunId: string): Promise<ProviderSyncModuleRecord[]> {
    return [...this.syncModules.values()].filter((module) => module.syncRunId === syncRunId);
  }

  async listSyncModulesForConnection(
    organizationId: string,
    providerConnectionId: string
  ): Promise<ProviderSyncModuleRecord[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    return [...this.syncModules.values()].filter(
      (module) => module.organizationId === organizationId && module.providerConnectionId === providerConnectionId
    );
  }

  async listRawResources(organizationId: string, providerConnectionId: string): Promise<ProviderRawResource[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    return [...this.rawResources.values()].filter(
      (resource) => resource.organizationId === organizationId && resource.providerConnectionId === providerConnectionId
    );
  }

  async listNormalizedResources(organizationId: string, providerConnectionId: string): Promise<ProviderNormalizedResource[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    return [...this.normalizedResources.values()].filter(
      (resource) => resource.organizationId === organizationId && resource.providerConnectionId === providerConnectionId
    );
  }

  async listFindings(organizationId: string, providerConnectionId: string): Promise<ProviderFinding[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    return [...this.findings.values()].filter(
      (finding) => finding.organizationId === organizationId && finding.providerConnectionId === providerConnectionId
    );
  }

  async listRecommendations(organizationId: string, providerConnectionId: string): Promise<ProviderRecommendation[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    return [...this.recommendations.values()].filter(
      (recommendation) =>
        recommendation.organizationId === organizationId && recommendation.providerConnectionId === providerConnectionId
    );
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}
