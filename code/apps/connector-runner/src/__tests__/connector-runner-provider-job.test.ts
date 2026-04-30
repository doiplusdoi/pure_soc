import { describe, expect, it } from "vitest";

import { InMemoryProviderResourceStore } from "@puresoc/providers-core";
import { createMockConnector } from "@puresoc/provider-mock";
import { createProviderSyncJob, runConnectorRunnerJob } from "../index";

describe("connector runner provider job contract", () => {
  it("runs a read-only provider sync job through the neutral pipeline", async () => {
    const store = new InMemoryProviderResourceStore({ now: () => new Date("2026-04-28T10:00:00.000Z") });
    const connector = createMockConnector({ scenarioKey: "defender_incidents" });
    const connection = await store.createConnection({
      organizationId: "org_runner_1",
      providerKey: "mock",
      displayName: "Mock runner connection",
      metadata: {
        scenarioKey: "defender_incidents"
      }
    });
    const job = createProviderSyncJob({
      organizationId: "org_runner_1",
      providerConnectionId: connection.id,
      providerKey: "mock"
    });

    const result = await runConnectorRunnerJob(job, {
      store,
      connectorRegistry: {
        mock: connector
      }
    });

    expect(job.readOnly).toBe(true);
    expect(result.syncRun.status).toBe("succeeded");
    expect(result.findings[0]?.findingKey).toBe("mock.defender.high_incident.incident_1");
    expect(result.recommendations[0]?.automationMode).toBe("manual");
  });
});
