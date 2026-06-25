import { randomUUID } from "node:crypto";

import {
  contentHash,
  ProviderStoreIsolationError,
  type CreateProviderConnectionInput,
  type ProviderCapabilityRecord,
  type ProviderConnectionRecord,
  type ProviderCredentialInput,
  type ProviderCredentialRecord,
  type ProviderFinding,
  type ProviderFindingInput,
  type ProviderNormalizedResource,
  type ProviderNormalizedResourceInput,
  type ProviderPermissionBundleInput,
  type ProviderPermissionBundleRecord,
  type ProviderRawResource,
  type ProviderRawResourceInput,
  type ProviderRecommendation,
  type ProviderRecommendationInput,
  type ProviderResourceStore,
  type ProviderSyncModuleRecord,
  type ProviderSyncModuleStatus,
  type ProviderSyncRunRecord
} from "@puresoc/providers-core";

type DelegateArgs = Record<string, unknown>;

interface ProviderDelegate {
  create(args: DelegateArgs): Promise<Record<string, unknown>>;
  deleteMany?(args: DelegateArgs): Promise<{ count: number }>;
  findFirst(args: DelegateArgs): Promise<Record<string, unknown> | null>;
  findMany(args?: DelegateArgs): Promise<Array<Record<string, unknown>>>;
  findUnique(args: DelegateArgs): Promise<Record<string, unknown> | null>;
  update(args: DelegateArgs): Promise<Record<string, unknown>>;
}

export interface PrismaProviderResourceClient {
  providerCapability: ProviderDelegate;
  providerConnection: ProviderDelegate;
  providerCredential: ProviderDelegate;
  providerFinding: ProviderDelegate;
  providerNormalizedResource: ProviderDelegate;
  providerPermissionBundle: ProviderDelegate;
  providerRawResource: ProviderDelegate;
  providerRecommendation: ProviderDelegate;
  providerSyncModule: ProviderDelegate;
  providerSyncRun: ProviderDelegate;
}

export class PrismaProviderResourceStore implements ProviderResourceStore {
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(
    private readonly client: PrismaProviderResourceClient,
    options: { now?: () => Date; idFactory?: () => string } = {}
  ) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async createConnection(input: CreateProviderConnectionInput): Promise<ProviderConnectionRecord> {
    const id = input.id ?? this.idFactory();
    const timestamp = this.timestamp();
    const existing = await this.client.providerConnection.findUnique({
      where: {
        id
      }
    });

    if (existing) {
      assertOrganization("connection", id, input.organizationId, existing.organizationId);
      const updated = await this.client.providerConnection.update({
        where: {
          id
        },
        data: {
          providerKey: input.providerKey,
          displayName: input.displayName,
          externalTenantId: input.externalTenantId ?? null,
          externalTenantName: input.externalTenantName ?? null,
          status: input.status ?? "connected",
          readEnabled: input.readEnabled ?? true,
          writeEnabled: input.writeEnabled ?? false,
          metadataJson: input.metadata ?? {},
          updatedAt: toDate(timestamp)
        }
      });
      return fromConnectionRow(updated);
    }

    const created = await this.client.providerConnection.create({
      data: {
        id,
        organizationId: input.organizationId,
        providerKey: input.providerKey,
        displayName: input.displayName,
        externalTenantId: input.externalTenantId ?? null,
        externalTenantName: input.externalTenantName ?? null,
        status: input.status ?? "connected",
        readEnabled: input.readEnabled ?? true,
        writeEnabled: input.writeEnabled ?? false,
        metadataJson: input.metadata ?? {},
        createdAt: toDate(timestamp),
        updatedAt: toDate(timestamp)
      }
    });

    return fromConnectionRow(created);
  }

  async getConnectionForOrganization(
    organizationId: string,
    providerConnectionId: string
  ): Promise<ProviderConnectionRecord> {
    const row = await this.client.providerConnection.findUnique({
      where: {
        id: providerConnectionId
      }
    });

    if (!row || row.organizationId !== organizationId) {
      throw new ProviderStoreIsolationError("connection", providerConnectionId, organizationId);
    }

    return fromConnectionRow(row);
  }

  async listConnections(organizationId: string): Promise<ProviderConnectionRecord[]> {
    const rows = await this.client.providerConnection.findMany({
      where: {
        organizationId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return rows.map(fromConnectionRow);
  }

  async updateConnectionState(input: {
    organizationId: string;
    providerConnectionId: string;
    status?: ProviderConnectionRecord["status"];
    readEnabled?: boolean;
    writeEnabled?: boolean;
    metadataPatch?: Record<string, unknown>;
  }): Promise<ProviderConnectionRecord> {
    const existing = await this.client.providerConnection.findUnique({
      where: {
        id: input.providerConnectionId
      }
    });
    if (!existing || existing.organizationId !== input.organizationId) {
      throw new ProviderStoreIsolationError("connection", input.providerConnectionId, input.organizationId);
    }

    const existingMetadata =
      existing.metadataJson && typeof existing.metadataJson === "object" && !Array.isArray(existing.metadataJson)
        ? (existing.metadataJson as Record<string, unknown>)
        : {};
    const updated = await this.client.providerConnection.update({
      where: {
        id: input.providerConnectionId
      },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(typeof input.readEnabled === "boolean" ? { readEnabled: input.readEnabled } : {}),
        ...(typeof input.writeEnabled === "boolean" ? { writeEnabled: input.writeEnabled } : {}),
        ...(input.metadataPatch
          ? {
              metadataJson: {
                ...existingMetadata,
                ...input.metadataPatch
              }
            }
          : {}),
        updatedAt: this.now()
      }
    });

    return fromConnectionRow(updated);
  }

  async upsertCredential(input: ProviderCredentialInput): Promise<ProviderCredentialRecord> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    const timestamp = this.timestamp();
    const existing = await this.client.providerCredential.findFirst({
      where: {
        organizationId: input.organizationId,
        providerConnectionId: input.providerConnectionId,
        credentialType: input.credentialType
      }
    });

    if (existing) {
      const updated = await this.client.providerCredential.update({
        where: {
          id: existing.id
        },
        data: {
          providerKey: input.providerKey,
          encryptedPayload: input.encryptedPayload,
          expiresAt: nullableDate(input.expiresAt),
          rotationRequired: input.rotationRequired,
          updatedAt: toDate(timestamp)
        }
      });
      return fromCredentialRow(updated);
    }

    const created = await this.client.providerCredential.create({
      data: {
        id: this.idFactory(),
        organizationId: input.organizationId,
        providerConnectionId: input.providerConnectionId,
        providerKey: input.providerKey,
        credentialType: input.credentialType,
        encryptedPayload: input.encryptedPayload,
        expiresAt: nullableDate(input.expiresAt),
        rotationRequired: input.rotationRequired,
        createdAt: toDate(timestamp),
        updatedAt: toDate(timestamp)
      }
    });

    return fromCredentialRow(created);
  }

  async listCredentials(organizationId: string, providerConnectionId: string): Promise<ProviderCredentialRecord[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    const rows = await this.client.providerCredential.findMany({
      where: {
        organizationId,
        providerConnectionId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return rows.map(fromCredentialRow);
  }

  async deleteCredentialsForConnection(organizationId: string, providerConnectionId: string): Promise<number> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    if (!this.client.providerCredential.deleteMany) {
      throw new Error("Provider credential delegate does not support deleteMany.");
    }

    const result = await this.client.providerCredential.deleteMany({
      where: {
        organizationId,
        providerConnectionId
      }
    });

    return result.count;
  }

  async upsertPermissionBundle(input: ProviderPermissionBundleInput): Promise<ProviderPermissionBundleRecord> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    const timestamp = this.timestamp();
    const existing = await this.client.providerPermissionBundle.findFirst({
      where: {
        providerConnectionId: input.providerConnectionId,
        bundleKey: input.bundleKey
      }
    });

    if (existing) {
      assertOrganization("permission_bundle", existing.id, input.organizationId, existing.organizationId);
      const updated = await this.client.providerPermissionBundle.update({
        where: {
          id: existing.id
        },
        data: {
          providerKey: input.providerKey,
          permissionsRequired: input.permissionsRequired,
          permissionsGranted: input.permissionsGranted,
          enabled: input.enabled,
          updatedAt: toDate(timestamp)
        }
      });
      return fromPermissionBundleRow(updated);
    }

    const created = await this.client.providerPermissionBundle.create({
      data: {
        id: this.idFactory(),
        organizationId: input.organizationId,
        providerConnectionId: input.providerConnectionId,
        providerKey: input.providerKey,
        bundleKey: input.bundleKey,
        permissionsRequired: input.permissionsRequired,
        permissionsGranted: input.permissionsGranted,
        enabled: input.enabled,
        createdAt: toDate(timestamp),
        updatedAt: toDate(timestamp)
      }
    });

    return fromPermissionBundleRow(created);
  }

  async listPermissionBundles(
    organizationId: string,
    providerConnectionId: string
  ): Promise<ProviderPermissionBundleRecord[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    const rows = await this.client.providerPermissionBundle.findMany({
      where: {
        organizationId,
        providerConnectionId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return rows.map(fromPermissionBundleRow);
  }

  async createSyncRun(input: {
    organizationId: string;
    providerConnectionId: string;
    providerKey: string;
  }): Promise<ProviderSyncRunRecord> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    const timestamp = this.timestamp();
    const row = await this.client.providerSyncRun.create({
      data: {
        id: this.idFactory(),
        organizationId: input.organizationId,
        providerConnectionId: input.providerConnectionId,
        providerKey: input.providerKey,
        status: "running",
        startedAt: toDate(timestamp),
        summaryJson: {}
      }
    });

    return fromSyncRunRow(row);
  }

  async completeSyncRun(
    syncRunId: string,
    status: ProviderSyncModuleStatus,
    summary: Record<string, unknown>,
    error?: Record<string, unknown>
  ): Promise<ProviderSyncRunRecord> {
    const existing = await this.client.providerSyncRun.findUnique({
      where: {
        id: syncRunId
      }
    });
    if (!existing) {
      throw new Error(`Unknown provider sync run: ${syncRunId}`);
    }

    const row = await this.client.providerSyncRun.update({
      where: {
        id: syncRunId
      },
      data: {
        status,
        completedAt: toDate(this.timestamp()),
        summaryJson: summary,
        errorJson: error ?? null
      }
    });

    return fromSyncRunRow(row);
  }

  async upsertSyncModule(
    input: Omit<ProviderSyncModuleRecord, "id" | "startedAt" | "completedAt">
  ): Promise<ProviderSyncModuleRecord> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    const timestamp = this.timestamp();
    const existing = await this.client.providerSyncModule.findFirst({
      where: {
        syncRunId: input.syncRunId,
        moduleKey: input.moduleKey
      }
    });

    if (existing) {
      assertOrganization("sync_module", existing.id, input.organizationId, existing.organizationId);
      const updated = await this.client.providerSyncModule.update({
        where: {
          id: existing.id
        },
        data: {
          providerKey: input.providerKey,
          status: input.status,
          missingPermissions: input.missingPermissions,
          missingLicenses: input.missingLicenses,
          statusReason: input.statusReason ?? null,
          pagesRead: input.pagesRead,
          retryCount: input.retryCount,
          completedAt: toDate(timestamp)
        }
      });
      return fromSyncModuleRow(updated);
    }

    const created = await this.client.providerSyncModule.create({
      data: {
        id: this.idFactory(),
        organizationId: input.organizationId,
        providerConnectionId: input.providerConnectionId,
        syncRunId: input.syncRunId,
        providerKey: input.providerKey,
        moduleKey: input.moduleKey,
        status: input.status,
        missingPermissions: input.missingPermissions,
        missingLicenses: input.missingLicenses,
        statusReason: input.statusReason ?? null,
        pagesRead: input.pagesRead,
        retryCount: input.retryCount,
        startedAt: toDate(timestamp),
        completedAt: toDate(timestamp)
      }
    });

    return fromSyncModuleRow(created);
  }

  async upsertCapability(input: Omit<ProviderCapabilityRecord, "id" | "updatedAt">): Promise<ProviderCapabilityRecord> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    const timestamp = this.timestamp();
    const existing = await this.client.providerCapability.findFirst({
      where: {
        providerConnectionId: input.providerConnectionId,
        capabilityKey: input.capabilityKey
      }
    });

    if (existing) {
      assertOrganization("capability", existing.id, input.organizationId, existing.organizationId);
      const updated = await this.client.providerCapability.update({
        where: {
          id: existing.id
        },
        data: {
          providerKey: input.providerKey,
          moduleKey: input.moduleKey,
          available: input.available,
          licenseRequired: input.licenseRequired,
          licenseDetected: input.licenseDetected,
          permissionsRequired: input.permissionsRequired,
          permissionsGranted: input.permissionsGranted,
          status: input.status,
          statusReason: input.statusReason ?? null,
          updatedAt: toDate(timestamp)
        }
      });
      return fromCapabilityRow(updated);
    }

    const created = await this.client.providerCapability.create({
      data: {
        id: this.idFactory(),
        organizationId: input.organizationId,
        providerConnectionId: input.providerConnectionId,
        providerKey: input.providerKey,
        moduleKey: input.moduleKey,
        capabilityKey: input.capabilityKey,
        available: input.available,
        licenseRequired: input.licenseRequired,
        licenseDetected: input.licenseDetected,
        permissionsRequired: input.permissionsRequired,
        permissionsGranted: input.permissionsGranted,
        status: input.status,
        statusReason: input.statusReason ?? null,
        updatedAt: toDate(timestamp)
      }
    });

    return fromCapabilityRow(created);
  }

  async listCapabilities(organizationId: string, providerConnectionId: string): Promise<ProviderCapabilityRecord[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    const rows = await this.client.providerCapability.findMany({
      where: {
        organizationId,
        providerConnectionId
      }
    });

    return rows.map(fromCapabilityRow);
  }

  async upsertRawResource(input: ProviderRawResourceInput): Promise<ProviderRawResource> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    const observedAt = input.observedAt ?? this.timestamp();
    const existing = await this.client.providerRawResource.findFirst({
      where: providerRawResourceWhere(input)
    });
    const data = {
      providerKey: input.providerKey,
      sourceModule: input.sourceModule,
      syncRunId: input.syncRunId,
      rawJson: input.rawJson,
      contentHash: contentHash(input.rawJson),
      lastSeenAt: toDate(observedAt),
      deletedAt: null,
      lifecycleStatus: "active"
    };

    if (existing) {
      const updated = await this.client.providerRawResource.update({
        where: {
          id: existing.id
        },
        data
      });
      return fromRawResourceRow(updated);
    }

    const created = await this.client.providerRawResource.create({
      data: {
        id: this.idFactory(),
        organizationId: input.organizationId,
        providerConnectionId: input.providerConnectionId,
        providerKey: input.providerKey,
        externalId: input.externalId,
        externalResourceType: input.externalResourceType,
        sourceModule: input.sourceModule,
        syncRunId: input.syncRunId,
        rawJson: input.rawJson,
        contentHash: contentHash(input.rawJson),
        firstSeenAt: toDate(observedAt),
        lastSeenAt: toDate(observedAt),
        lifecycleStatus: "active"
      }
    });

    return fromRawResourceRow(created);
  }

  async upsertNormalizedResource(input: ProviderNormalizedResourceInput): Promise<ProviderNormalizedResource> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    const observedAt = input.observedAt ?? this.timestamp();
    const existing = await this.client.providerNormalizedResource.findFirst({
      where: providerNormalizedResourceWhere(input)
    });
    const data = {
      providerKey: input.providerKey,
      rawResourceId: input.rawResourceId ?? null,
      externalResourceType: input.externalResourceType,
      sourceModule: input.sourceModule,
      normalizedJson: input.normalizedJson,
      contentHash: contentHash(input.normalizedJson),
      lastSeenAt: toDate(observedAt),
      deletedAt: null,
      lifecycleStatus: "active"
    };

    if (existing) {
      const updated = await this.client.providerNormalizedResource.update({
        where: {
          id: existing.id
        },
        data
      });
      return fromNormalizedResourceRow(updated);
    }

    const created = await this.client.providerNormalizedResource.create({
      data: {
        id: this.idFactory(),
        organizationId: input.organizationId,
        providerConnectionId: input.providerConnectionId,
        providerKey: input.providerKey,
        rawResourceId: input.rawResourceId ?? null,
        externalId: input.externalId,
        externalResourceType: input.externalResourceType,
        resourceType: input.resourceType,
        sourceModule: input.sourceModule,
        normalizedJson: input.normalizedJson,
        contentHash: contentHash(input.normalizedJson),
        firstSeenAt: toDate(observedAt),
        lastSeenAt: toDate(observedAt),
        lifecycleStatus: "active"
      }
    });

    return fromNormalizedResourceRow(created);
  }

  async upsertFinding(input: ProviderFindingInput): Promise<ProviderFinding> {
    await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    const observedAt = input.observedAt ?? this.timestamp();
    const existing = await this.client.providerFinding.findFirst({
      where: {
        organizationId: input.organizationId,
        providerConnectionId: input.providerConnectionId,
        providerKey: input.providerKey,
        findingKey: input.findingKey
      }
    });
    const status = input.status ?? (optionalString(existing?.status) ?? "open");
    const resolvedAt = status === "resolved" ? toDate(observedAt) : nullableDateString(existing?.resolvedAt);
    const data = {
      normalizedResourceId: input.normalizedResourceId ?? null,
      resourceExternalId: input.resourceExternalId ?? null,
      resourceType: input.resourceType ?? null,
      syncRunId: input.syncRunId ?? null,
      providerKey: input.providerKey,
      moduleKey: input.moduleKey,
      title: input.title,
      summary: input.summary,
      severity: input.severity,
      status,
      evidenceJson: input.evidence,
      lastSeenAt: toDate(observedAt),
      resolvedAt
    };

    if (existing) {
      const updated = await this.client.providerFinding.update({
        where: {
          id: existing.id
        },
        data
      });
      return fromFindingRow(updated);
    }

    const created = await this.client.providerFinding.create({
      data: {
        id: this.idFactory(),
        organizationId: input.organizationId,
        providerConnectionId: input.providerConnectionId,
        normalizedResourceId: input.normalizedResourceId ?? null,
        resourceExternalId: input.resourceExternalId ?? null,
        resourceType: input.resourceType ?? null,
        syncRunId: input.syncRunId ?? null,
        providerKey: input.providerKey,
        moduleKey: input.moduleKey,
        findingKey: input.findingKey,
        title: input.title,
        summary: input.summary,
        severity: input.severity,
        status,
        evidenceJson: input.evidence,
        firstSeenAt: toDate(observedAt),
        lastSeenAt: toDate(observedAt),
        resolvedAt
      }
    });

    return fromFindingRow(created);
  }

  async upsertRecommendation(input: ProviderRecommendationInput): Promise<ProviderRecommendation> {
    if (input.providerConnectionId) {
      await this.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    }

    const timestamp = this.timestamp();
    const existing = await this.client.providerRecommendation.findFirst({
      where: recommendationWhere(input)
    });
    const data = {
      providerConnectionId: input.providerConnectionId ?? null,
      sourceFindingId: input.sourceFindingId ?? null,
      sourceFindingKey: input.sourceFindingKey ?? null,
      providerKey: input.providerKey,
      moduleKey: input.moduleKey ?? null,
      controlId: input.controlId ?? null,
      jurisdiction: input.jurisdiction,
      title: input.title,
      summary: input.summary,
      severity: input.severity,
      confidence: input.confidence,
      recommendationType: input.recommendationType,
      automationMode: input.automationMode,
      requiredPermissions: input.requiredPermissions,
      requiredLicense: input.requiredLicense,
      expectedChange: input.expectedChange ?? null,
      blastRadius: input.blastRadius ?? null,
      manualFallback: input.manualFallback ?? null,
      evidenceRequired: input.evidenceRequired,
      status: input.status ?? (optionalString(existing?.status) ?? "proposed"),
      sourceReferencesJson: input.sourceReferences ?? [],
      updatedAt: toDate(timestamp)
    };

    if (existing) {
      const updated = await this.client.providerRecommendation.update({
        where: {
          id: existing.id
        },
        data
      });
      return fromRecommendationRow(updated);
    }

    const created = await this.client.providerRecommendation.create({
      data: {
        id: this.idFactory(),
        organizationId: input.organizationId,
        assessmentId: null,
        sourceFindingIds: [],
        manualTaskIds: [],
        ...data,
        createdAt: toDate(timestamp)
      }
    });

    return fromRecommendationRow(created);
  }

  async getRawResourceForOrganization(organizationId: string, resourceId: string): Promise<ProviderRawResource> {
    const row = await this.client.providerRawResource.findUnique({
      where: {
        id: resourceId
      }
    });

    if (!row || row.organizationId !== organizationId) {
      throw new ProviderStoreIsolationError("raw_resource", resourceId, organizationId);
    }

    return fromRawResourceRow(row);
  }

  async listSyncModules(syncRunId: string): Promise<ProviderSyncModuleRecord[]> {
    const rows = await this.client.providerSyncModule.findMany({
      where: {
        syncRunId
      },
      orderBy: {
        startedAt: "asc"
      }
    });

    return rows.map(fromSyncModuleRow);
  }

  async listSyncModulesForConnection(
    organizationId: string,
    providerConnectionId: string
  ): Promise<ProviderSyncModuleRecord[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    const rows = await this.client.providerSyncModule.findMany({
      where: {
        organizationId,
        providerConnectionId
      },
      orderBy: {
        startedAt: "asc"
      }
    });

    return rows.map(fromSyncModuleRow);
  }

  async listRawResources(organizationId: string, providerConnectionId: string): Promise<ProviderRawResource[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    const rows = await this.client.providerRawResource.findMany({
      where: {
        organizationId,
        providerConnectionId
      },
      orderBy: {
        firstSeenAt: "asc"
      }
    });

    return rows.map(fromRawResourceRow);
  }

  async listNormalizedResources(organizationId: string, providerConnectionId: string): Promise<ProviderNormalizedResource[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    const rows = await this.client.providerNormalizedResource.findMany({
      where: {
        organizationId,
        providerConnectionId
      },
      orderBy: {
        firstSeenAt: "asc"
      }
    });

    return rows.map(fromNormalizedResourceRow);
  }

  async listFindings(organizationId: string, providerConnectionId: string): Promise<ProviderFinding[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    const rows = await this.client.providerFinding.findMany({
      where: {
        organizationId,
        providerConnectionId
      },
      orderBy: {
        firstSeenAt: "asc"
      }
    });

    return rows.map(fromFindingRow);
  }

  async listRecommendations(organizationId: string, providerConnectionId: string): Promise<ProviderRecommendation[]> {
    await this.getConnectionForOrganization(organizationId, providerConnectionId);
    const rows = await this.client.providerRecommendation.findMany({
      where: {
        organizationId,
        providerConnectionId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return rows.map(fromRecommendationRow);
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

const providerRawResourceWhere = (input: ProviderRawResourceInput): Record<string, unknown> => ({
  organizationId: input.organizationId,
  providerConnectionId: input.providerConnectionId,
  providerKey: input.providerKey,
  externalResourceType: input.externalResourceType,
  externalId: input.externalId
});

const providerNormalizedResourceWhere = (input: ProviderNormalizedResourceInput): Record<string, unknown> => ({
  organizationId: input.organizationId,
  providerConnectionId: input.providerConnectionId,
  providerKey: input.providerKey,
  resourceType: input.resourceType,
  externalId: input.externalId
});

const recommendationWhere = (input: ProviderRecommendationInput): Record<string, unknown> => ({
  organizationId: input.organizationId,
  providerConnectionId: input.providerConnectionId ?? null,
  providerKey: input.providerKey,
  sourceFindingId: input.sourceFindingId ?? null,
  sourceFindingKey: input.sourceFindingKey ?? null,
  title: input.title
});

const fromConnectionRow = (row: Record<string, unknown>): ProviderConnectionRecord => ({
  id: stringValue(row.id),
  organizationId: stringValue(row.organizationId),
  providerKey: stringValue(row.providerKey),
  displayName: stringValue(row.displayName),
  externalTenantId: optionalString(row.externalTenantId),
  externalTenantName: optionalString(row.externalTenantName),
  status: moduleStatus(row.status) as ProviderConnectionRecord["status"],
  readEnabled: Boolean(row.readEnabled),
  writeEnabled: Boolean(row.writeEnabled),
  metadata: recordValue(row.metadataJson),
  lastSuccessfulSyncAt: optionalIso(row.lastSuccessfulSyncAt),
  createdAt: isoValue(row.createdAt),
  updatedAt: isoValue(row.updatedAt)
});

const fromCredentialRow = (row: Record<string, unknown>): ProviderCredentialRecord => ({
  id: stringValue(row.id),
  organizationId: stringValue(row.organizationId),
  providerConnectionId: stringValue(row.providerConnectionId),
  providerKey: stringValue(row.providerKey),
  credentialType: stringValue(row.credentialType) as ProviderCredentialRecord["credentialType"],
  encryptedPayload: stringValue(row.encryptedPayload),
  expiresAt: optionalIso(row.expiresAt),
  rotationRequired: Boolean(row.rotationRequired),
  createdAt: isoValue(row.createdAt),
  updatedAt: isoValue(row.updatedAt)
});

const fromPermissionBundleRow = (row: Record<string, unknown>): ProviderPermissionBundleRecord => ({
  id: stringValue(row.id),
  organizationId: stringValue(row.organizationId),
  providerConnectionId: stringValue(row.providerConnectionId),
  providerKey: stringValue(row.providerKey),
  bundleKey: stringValue(row.bundleKey),
  permissionsRequired: stringArray(row.permissionsRequired),
  permissionsGranted: stringArray(row.permissionsGranted),
  enabled: Boolean(row.enabled),
  createdAt: isoValue(row.createdAt),
  updatedAt: isoValue(row.updatedAt)
});

const fromCapabilityRow = (row: Record<string, unknown>): ProviderCapabilityRecord => ({
  id: stringValue(row.id),
  organizationId: stringValue(row.organizationId),
  providerConnectionId: stringValue(row.providerConnectionId),
  providerKey: stringValue(row.providerKey),
  moduleKey: stringValue(row.moduleKey),
  capabilityKey: stringValue(row.capabilityKey),
  available: Boolean(row.available),
  licenseRequired: stringArray(row.licenseRequired),
  licenseDetected: stringArray(row.licenseDetected),
  permissionsRequired: stringArray(row.permissionsRequired),
  permissionsGranted: stringArray(row.permissionsGranted),
  status: moduleStatus(row.status),
  statusReason: optionalString(row.statusReason),
  updatedAt: isoValue(row.updatedAt)
});

const fromSyncRunRow = (row: Record<string, unknown>): ProviderSyncRunRecord => ({
  id: stringValue(row.id),
  organizationId: stringValue(row.organizationId),
  providerConnectionId: stringValue(row.providerConnectionId),
  providerKey: stringValue(row.providerKey),
  status: moduleStatus(row.status),
  startedAt: isoValue(row.startedAt),
  completedAt: optionalIso(row.completedAt),
  error: optionalRecord(row.errorJson),
  summary: recordValue(row.summaryJson)
});

const fromSyncModuleRow = (row: Record<string, unknown>): ProviderSyncModuleRecord => ({
  id: stringValue(row.id),
  organizationId: stringValue(row.organizationId),
  providerConnectionId: stringValue(row.providerConnectionId),
  syncRunId: stringValue(row.syncRunId),
  providerKey: stringValue(row.providerKey),
  moduleKey: stringValue(row.moduleKey),
  status: moduleStatus(row.status),
  missingPermissions: stringArray(row.missingPermissions),
  missingLicenses: stringArray(row.missingLicenses),
  statusReason: optionalString(row.statusReason),
  startedAt: isoValue(row.startedAt),
  completedAt: optionalIso(row.completedAt),
  pagesRead: numberValue(row.pagesRead),
  retryCount: numberValue(row.retryCount)
});

const fromRawResourceRow = (row: Record<string, unknown>): ProviderRawResource => ({
  id: stringValue(row.id),
  organizationId: stringValue(row.organizationId),
  providerConnectionId: stringValue(row.providerConnectionId),
  providerKey: stringValue(row.providerKey),
  externalId: stringValue(row.externalId),
  externalResourceType: stringValue(row.externalResourceType),
  sourceModule: stringValue(row.sourceModule),
  syncRunId: stringValue(row.syncRunId),
  rawJson: recordValue(row.rawJson),
  contentHash: stringValue(row.contentHash),
  firstSeenAt: isoValue(row.firstSeenAt),
  lastSeenAt: isoValue(row.lastSeenAt),
  deletedAt: optionalIso(row.deletedAt)
});

const fromNormalizedResourceRow = (row: Record<string, unknown>): ProviderNormalizedResource => ({
  id: stringValue(row.id),
  organizationId: stringValue(row.organizationId),
  providerConnectionId: stringValue(row.providerConnectionId),
  providerKey: stringValue(row.providerKey),
  rawResourceId: optionalString(row.rawResourceId),
  externalId: stringValue(row.externalId),
  externalResourceType: stringValue(row.externalResourceType),
  resourceType: stringValue(row.resourceType) as ProviderNormalizedResource["resourceType"],
  sourceModule: stringValue(row.sourceModule),
  normalizedJson: recordValue(row.normalizedJson),
  contentHash: stringValue(row.contentHash),
  firstSeenAt: isoValue(row.firstSeenAt),
  lastSeenAt: isoValue(row.lastSeenAt),
  deletedAt: optionalIso(row.deletedAt)
});

const fromFindingRow = (row: Record<string, unknown>): ProviderFinding => ({
  id: stringValue(row.id),
  organizationId: stringValue(row.organizationId),
  providerConnectionId: stringValue(row.providerConnectionId),
  normalizedResourceId: optionalString(row.normalizedResourceId),
  resourceExternalId: optionalString(row.resourceExternalId),
  resourceType: optionalString(row.resourceType) as ProviderFinding["resourceType"],
  syncRunId: optionalString(row.syncRunId),
  providerKey: stringValue(row.providerKey),
  moduleKey: stringValue(row.moduleKey),
  findingKey: stringValue(row.findingKey),
  title: stringValue(row.title),
  summary: stringValue(row.summary),
  severity: stringValue(row.severity) as ProviderFinding["severity"],
  status: stringValue(row.status) as ProviderFinding["status"],
  evidence: recordValue(row.evidenceJson),
  firstSeenAt: isoValue(row.firstSeenAt),
  lastSeenAt: isoValue(row.lastSeenAt),
  resolvedAt: optionalIso(row.resolvedAt)
});

const fromRecommendationRow = (row: Record<string, unknown>): ProviderRecommendation => ({
  id: stringValue(row.id),
  organizationId: stringValue(row.organizationId),
  providerConnectionId: optionalString(row.providerConnectionId),
  sourceFindingId: optionalString(row.sourceFindingId),
  sourceFindingKey: optionalString(row.sourceFindingKey),
  providerKey: stringValue(row.providerKey),
  moduleKey: optionalString(row.moduleKey),
  controlId: optionalString(row.controlId),
  jurisdiction: stringValue(row.jurisdiction),
  title: stringValue(row.title),
  summary: stringValue(row.summary),
  severity: stringValue(row.severity) as ProviderRecommendation["severity"],
  confidence: stringValue(row.confidence) as ProviderRecommendation["confidence"],
  recommendationType: stringValue(row.recommendationType) as ProviderRecommendation["recommendationType"],
  automationMode: stringValue(row.automationMode) as ProviderRecommendation["automationMode"],
  requiredPermissions: stringArray(row.requiredPermissions),
  requiredLicense: stringArray(row.requiredLicense),
  expectedChange: optionalString(row.expectedChange),
  blastRadius: optionalString(row.blastRadius),
  manualFallback: optionalString(row.manualFallback),
  evidenceRequired: Boolean(row.evidenceRequired),
  sourceReferences: sourceReferences(row.sourceReferencesJson),
  status: stringValue(row.status) as ProviderRecommendation["status"],
  createdAt: isoValue(row.createdAt),
  updatedAt: isoValue(row.updatedAt)
});

const assertOrganization = (
  resourceType: string,
  resourceId: unknown,
  organizationId: string,
  rowOrganizationId: unknown
): void => {
  if (rowOrganizationId !== organizationId) {
    throw new ProviderStoreIsolationError(resourceType, stringValue(resourceId), organizationId);
  }
};

const moduleStatus = (value: unknown): ProviderSyncModuleStatus =>
  (typeof value === "string" ? value : "failed") as ProviderSyncModuleStatus;

const optionalString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

const stringValue = (value: unknown): string => (typeof value === "string" ? value : String(value ?? ""));

const numberValue = (value: unknown): number => (typeof value === "number" ? value : Number(value ?? 0));

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const recordValue = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const optionalRecord = (value: unknown): Record<string, unknown> | undefined =>
  value === null || value === undefined ? undefined : recordValue(value);

const sourceReferences = (value: unknown): ProviderRecommendation["sourceReferences"] =>
  Array.isArray(value) ? (value as ProviderRecommendation["sourceReferences"]) : undefined;

const toDate = (value: string): Date => new Date(value);

const nullableDate = (value: string | undefined): Date | null => (value ? toDate(value) : null);

const nullableDateString = (value: unknown): Date | null => {
  const iso = optionalIso(value);
  return iso ? toDate(iso) : null;
};

const isoValue = (value: unknown): string => optionalIso(value) ?? new Date(0).toISOString();

const optionalIso = (value: unknown): string | undefined => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.length > 0) {
    return new Date(value).toISOString();
  }

  return undefined;
};
