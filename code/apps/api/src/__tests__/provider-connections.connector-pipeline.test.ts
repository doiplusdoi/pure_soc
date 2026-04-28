import { describe, expect, it } from "vitest";

import { createApiServices } from "../auth/services";

describe("provider-connections connector pipeline API service", () => {
  it("creates mock connections, runs read-only sync, and audits lifecycle events", async () => {
    const services = createApiServices({ now: () => new Date("2026-04-28T10:00:00.000Z") });

    const created = await services.providerConnections.createMockConnection({
      organizationId: "org_api_1",
      actorUserId: "user_1",
      scenarioKey: "missing_mfa",
      ipAddress: "127.0.0.1",
      userAgent: "vitest"
    });
    const result = await services.providerConnections.runSync({
      organizationId: "org_api_1",
      actorUserId: "user_1",
      providerConnectionId: created.connection.id,
      ipAddress: "127.0.0.1",
      userAgent: "vitest"
    });

    expect(created.connection.writeEnabled).toBe(false);
    expect(result.syncRun.status).toBe("succeeded");
    expect(result.findings[0]?.findingKey).toBe("mock.identity.admin_mfa_missing.admin_1");
    expect(services.auditSink.findByAction("provider_connected")).toHaveLength(1);
    expect(services.auditSink.findByAction("scan_started")).toHaveLength(1);
    expect(services.auditSink.findByAction("scan_completed")).toHaveLength(1);
  });

  it("rejects cross-organization provider connection access", async () => {
    const services = createApiServices();
    const created = await services.providerConnections.createMockConnection({
      organizationId: "org_api_1",
      actorUserId: "user_1",
      scenarioKey: "healthy_tenant"
    });

    await expect(
      services.providerConnections.runSync({
        organizationId: "org_api_2",
        actorUserId: "user_1",
        providerConnectionId: created.connection.id
      })
    ).rejects.toMatchObject({ code: "cross_organization_provider_resource" });
  });
});
