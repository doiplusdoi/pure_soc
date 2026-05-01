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
      "audit_logs",
      "identity_sessions_organizations_rbac",
      "compliance_results",
      "evidence_metadata_access_logs",
      "billing",
      "regulatory_sources",
      "remediation_actions",
      "notification_drafts",
      "stored_analysis_reports_dashboards"
    ]);
    expect(services.persistence.memoryBackedContexts).toEqual(
      expect.arrayContaining(["provider_connections_and_telemetry", "oidc_transient_state"])
    );
    expect(services.persistence.memoryBackedContexts).not.toContain("audit_logs");
    expect(services.persistence.memoryBackedContexts).not.toContain("stored_analysis_reports_dashboards");
    expect(services.persistence.memoryBackedContexts).not.toContain("identity_sessions_organizations_rbac");
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
    notificationDraft: {},
    roNis2NotificationDraft: {},
    generatedReport: {},
    dashboardSnapshot: {},
    emailVerificationToken: {},
    identityAccount: {},
    localCredential: {},
    organization: {},
    organizationMember: {},
    passwordResetToken: {},
    role: {},
    roleBinding: {},
    session: {},
    user: {},
    auditLog: {},
    evidenceArtifact: {},
    evidenceLink: {},
    evidenceAccessLog: {},
    billingCustomer: {},
    billingSubscription: {},
    billingEntitlement: {},
    billingEvent: {}
  }) as never;
