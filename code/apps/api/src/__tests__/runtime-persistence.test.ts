import { describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";

describe("API runtime persistence selection", () => {
  it("defaults to the deterministic in-memory harness", () => {
    const services = createApiServices({
      config: loadConfig({ env: {} })
    });

    expect(services.persistence).toMatchObject({
      mode: "memory",
      persistedContexts: []
    });
    expect(services.persistence.memoryBackedContexts).toContain("identity_sessions_organizations_rbac");
    expect(services.prismaClient).toBeUndefined();
  });

  it("selects Prisma-backed adapters where they already exist", () => {
    const prismaClient = createPrismaClientFixture();
    const services = createApiServices({
      config: loadConfig({
        env: {
          PURESOC_PERSISTENCE_MODE: "prisma"
        }
      }),
      prismaClient
    });

    expect(services.persistence.mode).toBe("prisma");
    expect(services.persistence.persistedContexts).toEqual([
      "compliance_results",
      "evidence_metadata_access_logs",
      "billing",
      "regulatory_sources",
      "remediation_actions"
    ]);
    expect(services.persistence.memoryBackedContexts).toEqual(
      expect.arrayContaining([
        "identity_sessions_organizations_rbac",
        "audit_logs",
        "provider_connections_and_telemetry",
        "stored_analysis_reports_dashboards",
        "oidc_transient_state"
      ])
    );
    expect(services.prismaClient).toBe(prismaClient);
  });
});

const createPrismaClientFixture = () =>
  ({
    $transaction: async <T>(callback: (client: unknown) => Promise<T>) => callback({}),
    complianceResultSnapshot: {},
    complianceControlResult: {},
    complianceGap: {},
    providerRecommendation: {},
    readinessPlan: {},
    readinessPlanItem: {},
    regulatorySource: {},
    regulatorySourceVersion: {},
    regulatorySourceMap: {},
    regulatoryReviewTask: {},
    regulatoryReviewDecision: {},
    providerActionTemplate: {},
    providerActionRun: {},
    evidenceArtifact: {},
    evidenceLink: {},
    evidenceAccessLog: {},
    billingCustomer: {},
    billingSubscription: {},
    billingEntitlement: {},
    billingEvent: {}
  }) as never;
