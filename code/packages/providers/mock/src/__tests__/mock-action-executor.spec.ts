import { describe, expect, it } from "vitest";

import { createMockProviderActionExecutor } from "../index";

describe("mock provider action executor", () => {
  it("validates, applies, collects deterministic post-state evidence, and verifies without live writes", async () => {
    const executor = createMockProviderActionExecutor({
      now: () => new Date("2026-05-02T10:00:00.000Z")
    });

    const validation = await executor.validateAction({
      organizationId: "org_mock_actions",
      providerConnectionId: "provider_connection_mock",
      actionRunId: "action_run_mock",
      actionKey: "ca_report_only_legacy_auth_block"
    });
    const applied = await executor.applyAction({
      organizationId: "org_mock_actions",
      providerConnectionId: "provider_connection_mock",
      actionRunId: "action_run_mock",
      actionKey: "ca_report_only_legacy_auth_block",
      approvedBy: "approver_1",
      approvedAt: "2026-05-02T09:59:00.000Z",
      preStateEvidenceId: "evidence_pre"
    });
    const evidence = await executor.collectActionEvidence({
      organizationId: "org_mock_actions",
      providerConnectionId: "provider_connection_mock",
      actionRunId: "action_run_mock",
      actionKey: "ca_report_only_legacy_auth_block",
      snapshotPhase: "post_state"
    });
    const verification = await executor.verifyAction({
      organizationId: "org_mock_actions",
      providerConnectionId: "provider_connection_mock",
      actionRunId: "action_run_mock",
      actionKey: "ca_report_only_legacy_auth_block",
      postStateEvidenceId: "evidence_post"
    });

    expect(executor.executionMode).toBe("fake");
    expect(validation.status).toBe("passed");
    expect(applied.status).toBe("applied");
    expect(evidence).toEqual([
      expect.objectContaining({
        sourceType: "action_post_state",
        mimeType: "application/json",
        contentHashSha256: expect.stringMatching(/^[0-9a-f]{64}$/)
      })
    ]);
    expect(verification.status).toBe("passed");
    expect(JSON.stringify({ validation, applied, evidence, verification })).not.toContain("Bearer");
  });

  it("redacts configured fake apply failures", async () => {
    const executor = createMockProviderActionExecutor();

    const applied = await executor.applyAction({
      organizationId: "org_mock_actions",
      providerConnectionId: "provider_connection_mock",
      actionRunId: "action_run_mock",
      actionKey: "ca_report_only_legacy_auth_block",
      approvedBy: "approver_1",
      approvedAt: "2026-05-02T09:59:00.000Z",
      preStateEvidenceId: "evidence_pre",
      parameters: {
        mockExecution: {
          applyStatus: "failed",
          authorization: "Bearer mock-secret-token",
          accessToken: "mock-access-token",
          clientSecret: "mock-client-secret"
        }
      }
    });

    const serialized = JSON.stringify(applied);
    expect(applied.status).toBe("failed");
    expect(serialized).not.toContain("mock-secret-token");
    expect(serialized).not.toContain("mock-access-token");
    expect(serialized).not.toContain("mock-client-secret");
    expect(serialized).toContain("[REDACTED]");
  });
});
