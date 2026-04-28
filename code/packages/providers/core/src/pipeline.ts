import type {
  CloudProviderConnector,
  ProviderModuleSyncResult,
  ProviderSyncModuleRecord,
  ProviderSyncRunRecord
} from "./connector";
import { assertReadOnlyProviderOperation, ProviderConnectorError, redactProviderSecrets } from "./redaction";
import type {
  ProviderFinding,
  ProviderNormalizedResource,
  ProviderRawResource,
  ProviderRecommendation,
  ProviderSyncModuleStatus
} from "./resources";
import {
  providerNormalizedResourceIdempotencyKey,
  providerResourceIdempotencyKey,
  type ProviderResourceStore
} from "./storage";

export interface ProviderPipelineInput {
  connector: CloudProviderConnector;
  store: ProviderResourceStore;
  organizationId: string;
  providerConnectionId: string;
  requestedModules?: string[];
  maxRetries?: number;
  allowProviderWrites?: boolean;
}

export interface ProviderPipelineResult {
  syncRun: ProviderSyncRunRecord;
  modules: ProviderSyncModuleRecord[];
  rawResources: ProviderRawResource[];
  normalizedResources: ProviderNormalizedResource[];
  findings: ProviderFinding[];
  recommendations: ProviderRecommendation[];
}

const successfulModuleStatuses = new Set<ProviderSyncModuleStatus>(["succeeded", "skipped"]);

const combineModuleStatuses = (modules: ProviderModuleSyncResult[]): ProviderSyncModuleStatus => {
  if (modules.length === 0) {
    return "skipped";
  }

  const statuses = modules.map((module) => module.status);
  if (statuses.every((status) => status === "succeeded" || status === "skipped")) {
    return "succeeded";
  }

  if (statuses.some((status) => status === "partial")) {
    return "partial";
  }

  if (statuses.some((status) => successfulModuleStatuses.has(status))) {
    return "partial";
  }

  return "failed";
};

export const runProviderConnectorPipeline = async (input: ProviderPipelineInput): Promise<ProviderPipelineResult> => {
  assertReadOnlyProviderOperation({
    operation: "provider_sync",
    allowProviderWrites: input.allowProviderWrites,
    providerKey: input.connector.providerKey
  });

  const connection = await input.store.getConnectionForOrganization(input.organizationId, input.providerConnectionId);
  if (connection.providerKey !== input.connector.providerKey) {
    throw new ProviderConnectorError("provider_connection_mismatch", "Connector provider key does not match connection.", {
      connectionProviderKey: connection.providerKey,
      connectorProviderKey: input.connector.providerKey
    });
  }

  const syncRun = await input.store.createSyncRun({
    organizationId: input.organizationId,
    providerConnectionId: input.providerConnectionId,
    providerKey: input.connector.providerKey
  });

  try {
    const moduleResults = await input.connector.syncReadOnlyModules({
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      syncRunId: syncRun.id,
      startedAt: syncRun.startedAt,
      requestedModules: input.requestedModules,
      maxRetries: input.maxRetries,
      allowProviderWrites: input.allowProviderWrites
    });

    const modules: ProviderSyncModuleRecord[] = [];
    const rawResources: ProviderRawResource[] = [];
    const normalizedResources: ProviderNormalizedResource[] = [];
    const findings: ProviderFinding[] = [];
    const recommendations: ProviderRecommendation[] = [];
    const rawIdByKey = new Map<string, string>();
    const normalizedIdByKey = new Map<string, string>();
    const findingIdByKey = new Map<string, string>();

    for (const module of moduleResults) {
      modules.push(
        await input.store.upsertSyncModule({
          organizationId: input.organizationId,
          providerConnectionId: input.providerConnectionId,
          syncRunId: syncRun.id,
          providerKey: input.connector.providerKey,
          moduleKey: module.moduleKey,
          status: module.status,
          missingPermissions: module.missingPermissions,
          missingLicenses: module.missingLicenses,
          statusReason: module.statusReason,
          pagesRead: module.pagesRead,
          retryCount: module.retryCount
        })
      );

      for (const rawInput of module.rawResources) {
        const raw = await input.store.upsertRawResource({
          ...rawInput,
          organizationId: input.organizationId,
          providerConnectionId: input.providerConnectionId,
          providerKey: input.connector.providerKey,
          syncRunId: syncRun.id,
          sourceModule: module.moduleKey
        });
        rawResources.push(raw);
        rawIdByKey.set(providerResourceIdempotencyKey(raw), raw.id);
      }

      for (const normalizedInput of module.normalizedResources) {
        const rawResourceId =
          normalizedInput.rawResourceId ??
          rawIdByKey.get(
            providerResourceIdempotencyKey({
              organizationId: input.organizationId,
              providerConnectionId: input.providerConnectionId,
              providerKey: input.connector.providerKey,
              externalResourceType: normalizedInput.externalResourceType,
              externalId: normalizedInput.externalId
            })
          );
        const normalized = await input.store.upsertNormalizedResource({
          ...normalizedInput,
          organizationId: input.organizationId,
          providerConnectionId: input.providerConnectionId,
          providerKey: input.connector.providerKey,
          rawResourceId,
          sourceModule: module.moduleKey,
          syncRunId: syncRun.id
        });
        normalizedResources.push(normalized);
        normalizedIdByKey.set(providerNormalizedResourceIdempotencyKey(normalized), normalized.id);
      }

      for (const findingInput of module.findings) {
        const normalizedResourceId =
          findingInput.normalizedResourceId ??
          (findingInput.resourceExternalId && findingInput.resourceType
            ? normalizedIdByKey.get(
                providerNormalizedResourceIdempotencyKey({
                  organizationId: input.organizationId,
                  providerConnectionId: input.providerConnectionId,
                  providerKey: input.connector.providerKey,
                  resourceType: findingInput.resourceType,
                  externalId: findingInput.resourceExternalId
                })
              )
            : undefined);
        const finding = await input.store.upsertFinding({
          ...findingInput,
          organizationId: input.organizationId,
          providerConnectionId: input.providerConnectionId,
          providerKey: input.connector.providerKey,
          moduleKey: module.moduleKey,
          normalizedResourceId,
          syncRunId: syncRun.id
        });
        findings.push(finding);
        findingIdByKey.set(finding.findingKey, finding.id);
      }

      for (const recommendationInput of module.recommendations) {
        const sourceFindingId =
          recommendationInput.sourceFindingId ??
          (recommendationInput.sourceFindingKey ? findingIdByKey.get(recommendationInput.sourceFindingKey) : undefined);
        recommendations.push(
          await input.store.upsertRecommendation({
            ...recommendationInput,
            organizationId: input.organizationId,
            providerConnectionId: input.providerConnectionId,
            providerKey: input.connector.providerKey,
            moduleKey: module.moduleKey,
            sourceFindingId
          })
        );
      }
    }

    const completedRun = await input.store.completeSyncRun(syncRun.id, combineModuleStatuses(moduleResults), {
      modules: moduleResults.length,
      rawResources: rawResources.length,
      normalizedResources: normalizedResources.length,
      findings: findings.length,
      recommendations: recommendations.length
    });

    return {
      syncRun: completedRun,
      modules,
      rawResources,
      normalizedResources,
      findings,
      recommendations
    };
  } catch (error) {
    const completedRun = await input.store.completeSyncRun(syncRun.id, "failed", {}, {
      error: redactProviderSecrets(error instanceof Error ? { name: error.name, message: error.message } : error) as Record<
        string,
        unknown
      >
    });
    return {
      syncRun: completedRun,
      modules: [],
      rawResources: [],
      normalizedResources: [],
      findings: [],
      recommendations: []
    };
  }
};
