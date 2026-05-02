import { describe, expect, it } from "vitest";

import { createMicrosoft365DisabledActionExecutor, microsoft365ProviderKey } from "../index";

describe("Microsoft 365 provider action executor", () => {
  it("keeps live Microsoft Graph write execution disabled by default", async () => {
    const executor = createMicrosoft365DisabledActionExecutor();

    await expect(
      executor.applyAction({
        organizationId: "org_m365_actions",
        providerConnectionId: "provider_connection_m365",
        actionRunId: "action_run_m365",
        actionKey: "ca_report_only_legacy_auth_block",
        approvedBy: "approver_1",
        approvedAt: "2026-05-02T10:00:00.000Z",
        preStateEvidenceId: "evidence_pre",
        parameters: {
          authorization: "Bearer live-secret-token",
          clientSecret: "live-client-secret"
        }
      })
    ).rejects.toMatchObject({
      code: "provider_action_executor_disabled",
      retryable: false,
      details: {
        providerKey: microsoft365ProviderKey,
        executionMode: "disabled"
      }
    });

    expect(executor.providerKey).toBe(microsoft365ProviderKey);
    expect(executor.executionMode).toBe("disabled");
  });
});
