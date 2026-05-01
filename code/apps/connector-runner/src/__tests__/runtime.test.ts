import { describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import {
  InMemoryProviderResourceStore,
  emptyProviderModuleSyncResult,
  type CloudProviderConnector,
  type SyncInput
} from "@puresoc/providers-core";

import { createConnectorRunnerRuntime } from "../runtime";

describe("connector-runner job runtime", () => {
  it("runs provider sync jobs with provider writes disabled", async () => {
    let observedAllowProviderWrites: boolean | undefined;
    const store = new InMemoryProviderResourceStore({
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      idFactory: deterministicIds("provider")
    });
    const connection = await store.createConnection({
      organizationId: "org_connector_runtime",
      providerKey: "mock",
      displayName: "Mock connector runtime"
    });
    const connector = connectorFixture((input) => {
      observedAllowProviderWrites = input.allowProviderWrites;
    });
    const connectorRunner = createConnectorRunnerRuntime({
      config: loadConfig({ env: {} }),
      store,
      connectorRegistry: {
        mock: connector
      },
      idFactory: deterministicIds("connector_job")
    });

    const dispatch = await connectorRunner.dispatchProviderSyncJob({
      organizationId: "org_connector_runtime",
      providerConnectionId: connection.id,
      providerKey: "mock"
    });
    const result = await connectorRunner.runtime.runUntilIdle();

    expect(dispatch.status).toBe("enqueued");
    expect(observedAllowProviderWrites).toBe(false);
    expect(result).toMatchObject({
      status: "idle",
      processedCount: 1
    });
    expect(result.results[0]?.job.result).toMatchObject({
      syncRun: {
        status: "succeeded"
      },
      modules: [
        {
          moduleKey: "mock.runtime",
          status: "skipped"
        }
      ]
    });
  });

  it("rejects non-read-only provider sync payloads without retrying", async () => {
    const connectorRunner = createConnectorRunnerRuntime({
      config: loadConfig({ env: {} }),
      idFactory: deterministicIds("connector_job")
    });

    await connectorRunner.runtime.dispatch({
      name: "provider.sync",
      payload: {
        name: "provider.sync",
        organizationId: "org_connector_runtime",
        providerConnectionId: "provider_connection_1",
        providerKey: "mock",
        readOnly: false
      }
    });
    const result = await connectorRunner.runtime.runNext();

    expect(result).toMatchObject({
      status: "failed",
      failure: {
        code: "provider_sync_requires_read_only",
        retryable: false
      },
      job: {
        status: "failed"
      }
    });
  });
});

const connectorFixture = (onSync: (input: SyncInput) => void): CloudProviderConnector => ({
  providerKey: "mock",
  beginConnection: async () => {
    throw new Error("not used in runtime tests");
  },
  completeConnection: async () => {
    throw new Error("not used in runtime tests");
  },
  getTenantProfile: async () => {
    throw new Error("not used in runtime tests");
  },
  syncReadOnlyModules: async (input) => {
    onSync(input);
    return [emptyProviderModuleSyncResult("mock.runtime")];
  },
  evaluateControls: async () => [],
  getRecommendedActions: async () => []
});

const deterministicIds = (prefix: string) => {
  let next = 0;
  return () => `${prefix}_${(next += 1).toString().padStart(3, "0")}`;
};
