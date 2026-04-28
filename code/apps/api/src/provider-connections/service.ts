import type { LocalAuthAuditWriter } from "../../../../packages/auth/local/src/index";
import {
  InMemoryProviderResourceStore,
  runProviderConnectorPipeline,
  type CloudProviderConnector,
  type ProviderConnectionRecord,
  type ProviderPipelineResult,
  type ProviderResourceStore,
  type ProviderSyncModuleRecord
} from "../../../../packages/providers/core/src/index";
import {
  createMockConnector,
  type MockProviderScenarioKey
} from "../../../../packages/providers/mock/src/index";

export interface ProviderConnectionView {
  id: string;
  organizationId: string;
  providerKey: string;
  displayName: string;
  externalTenantId: string | null;
  externalTenantName: string | null;
  status: ProviderConnectionRecord["status"];
  readEnabled: boolean;
  writeEnabled: boolean;
  metadata: Record<string, unknown>;
  lastSuccessfulSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderConnectionsServiceOptions {
  store?: ProviderResourceStore;
  auditWriter: LocalAuthAuditWriter;
  now?: () => Date;
  connectorFactory?: (providerKey: string, scenarioKey?: MockProviderScenarioKey) => CloudProviderConnector;
}

export interface CreateMockProviderConnectionInput {
  organizationId: string;
  actorUserId: string;
  scenarioKey: MockProviderScenarioKey;
  displayName?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RunProviderSyncInput {
  organizationId: string;
  actorUserId: string;
  providerConnectionId: string;
  scenarioKey?: MockProviderScenarioKey;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const safeConnectionView = (connection: ProviderConnectionRecord): ProviderConnectionView => ({
  id: connection.id,
  organizationId: connection.organizationId,
  providerKey: connection.providerKey,
  displayName: connection.displayName,
  externalTenantId: connection.externalTenantId ?? null,
  externalTenantName: connection.externalTenantName ?? null,
  status: connection.status,
  readEnabled: connection.readEnabled,
  writeEnabled: connection.writeEnabled,
  metadata: connection.metadata,
  lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt ?? null,
  createdAt: connection.createdAt,
  updatedAt: connection.updatedAt
});

export class ProviderConnectionsService {
  readonly store: ProviderResourceStore;
  private readonly auditWriter: LocalAuthAuditWriter;
  private readonly connectorFactory: (providerKey: string, scenarioKey?: MockProviderScenarioKey) => CloudProviderConnector;

  constructor(options: ProviderConnectionsServiceOptions) {
    this.store = options.store ?? new InMemoryProviderResourceStore({ now: options.now });
    this.auditWriter = options.auditWriter;
    this.connectorFactory =
      options.connectorFactory ??
      ((providerKey, scenarioKey) => {
        if (providerKey === "mock") {
          return createMockConnector({ scenarioKey });
        }

        throw new Error(`Provider connector is not registered for API sync: ${providerKey}`);
      });
  }

  async createMockConnection(input: CreateMockProviderConnectionInput): Promise<{ connection: ProviderConnectionView }> {
    const connector = this.connectorFactory("mock", input.scenarioKey);
    const connection = await this.store.createConnection({
      organizationId: input.organizationId,
      providerKey: connector.providerKey,
      displayName: input.displayName ?? `Mock provider: ${input.scenarioKey}`,
      externalTenantId: `mock_${input.scenarioKey}`,
      externalTenantName: input.scenarioKey,
      status: input.scenarioKey === "consent_revoked" ? "revoked" : "connected",
      readEnabled: true,
      writeEnabled: false,
      metadata: {
        scenarioKey: input.scenarioKey
      }
    });

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "provider_connection",
      targetId: connection.id,
      action: "provider_connected",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        providerKey: connection.providerKey,
        scenarioKey: input.scenarioKey,
        writeEnabled: connection.writeEnabled
      }
    });

    return {
      connection: safeConnectionView(connection)
    };
  }

  async listConnections(organizationId: string): Promise<{ connections: ProviderConnectionView[] }> {
    const connections = await this.store.listConnections(organizationId);
    return {
      connections: connections.map(safeConnectionView)
    };
  }

  async listModules(
    organizationId: string,
    providerConnectionId: string,
    syncRunId: string
  ): Promise<{ modules: ProviderSyncModuleRecord[] }> {
    await this.store.getConnectionForOrganization(organizationId, providerConnectionId);
    return {
      modules: await this.store.listSyncModules(syncRunId)
    };
  }

  async runSync(input: RunProviderSyncInput): Promise<ProviderPipelineResult> {
    const connection = await this.store.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
    const scenarioKey =
      input.scenarioKey ??
      (typeof connection.metadata.scenarioKey === "string"
        ? (connection.metadata.scenarioKey as MockProviderScenarioKey)
        : undefined);
    const connector = this.connectorFactory(connection.providerKey, scenarioKey);

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "provider_connection",
      targetId: connection.id,
      action: "scan_started",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        providerKey: connection.providerKey,
        scenarioKey
      }
    });

    const result = await runProviderConnectorPipeline({
      connector,
      store: this.store,
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId
    });

    await this.auditWriter.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      targetType: "provider_sync_run",
      targetId: result.syncRun.id,
      action: "scan_completed",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      afterJson: {
        status: result.syncRun.status,
        summary: result.syncRun.summary
      }
    });

    return result;
  }
}
