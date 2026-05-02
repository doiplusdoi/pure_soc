import { describe, expect, it } from "vitest";

import {
  collectStartupConfigIssues,
  createExternalSmokeReadinessReport,
  loadConfig,
  type ExternalSmokeTargetSelectionPathId
} from "../index";

const microsoft365MetadataFixture = {
  schemaVersion: "puresoc.microsoft365.external_smoke_readiness_metadata.v1",
  providerKey: "microsoft365" as const,
  readPermissionBundles: [
    {
      bundleKey: "m365_read_baseline",
      purpose: "Read tenant baseline.",
      permissions: ["Organization.Read.All"],
      defaultEnabled: true,
      readOnly: true as const
    }
  ],
  writePermissionBundlesDisabled: ["m365_remediation_write", "m365_defender_write"],
  readModules: [
    {
      moduleKey: "tenant-profile",
      permissionsRequired: ["Organization.Read.All"],
      licenseRequired: []
    }
  ],
  deferredReadModules: ["exchange-posture"],
  providerTokenCustody: {
    schemaVersion: "puresoc.microsoft365.provider-token.custody-deployment-readiness.v1",
    targetKinds: ["local", "in_a_box", "saas"],
    implementedRealCustodyProviders: ["local-env-key-ring"],
    testOnlyCustodyProviders: ["fake-secret-manager-test"],
    deferredExternalCustodyProviders: ["azure-key-vault", "aws-kms", "hsm"],
    requiredEnvironmentVariables: [
      "PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND",
      "PURESOC_PROVIDER_TOKEN_KEY_PROVIDER",
      "PURESOC_PROVIDER_TOKEN_KEY_ID",
      "PURESOC_PROVIDER_TOKEN_KEY"
    ],
    previousKeyConfirmationVariables: [
      "PURESOC_PROVIDER_TOKEN_PREVIOUS_KEY_WINDOW_CONFIRMED",
      "PURESOC_PROVIDER_TOKEN_BACKFILL_PLAN_CONFIRMED",
      "PURESOC_PROVIDER_TOKEN_KEY_RETIREMENT_PLAN_CONFIRMED"
    ],
    guarantees: {
      liveMicrosoftGraphCalls: false,
      liveSecretManagerCalls: false,
      liveKmsCalls: false,
      providerWrites: false,
      plaintextSecretOutput: false,
      ciphertextBackfillExecuted: false
    }
  }
};

const buildReport = (env: NodeJS.ProcessEnv = {}) => {
  const config = loadConfig({ env });
  return createExternalSmokeReadinessReport({
    config,
    env,
    startupValidationIssues: collectStartupConfigIssues(config),
    metadata: {
      microsoft365: microsoft365MetadataFixture
    }
  });
};

describe("external smoke target selection", () => {
  it("lists every smoke path and selects nothing in the default dry-run posture", () => {
    const report = buildReport({
      MICROSOFT365_CLIENT_SECRET: "m49-microsoft-secret",
      STRIPE_SECRET_KEY: "sk_test_m49_secret",
      PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY: "m49-storage-secret"
    });

    expect(report.targetSelection.schemaVersion).toBe("puresoc.external_smoke_target_selection.v1");
    expect(report.targetSelection.outcome).toBe("no_ready_path");
    expect(report.targetSelection.selectedPathId).toBeNull();
    expect(report.targetSelection.guarantees).toMatchObject({
      metadataOnly: true,
      noLiveNetworkCallsByDefault: true,
      providerWritesEnabled: false,
      secretValuesReturned: false,
      endpointValuesReturned: false,
      exactlyOneReadyPathSelected: false
    });

    const pathIds = report.targetSelection.rankedCandidates.map((candidate) => candidate.pathId);
    expect(pathIds).toEqual(
      expect.arrayContaining<ExternalSmokeTargetSelectionPathId>([
        "auth_deployment_browser",
        "microsoft365_read_only_tenant",
        "stripe_test_mode_billing",
        "oidc_microsoft_entra_callback",
        "oidc_google_callback",
        "oidc_github_callback",
        "evidence_runtime",
        "provider_token_custody_deployment"
      ])
    );

    const evidenceRuntime = report.targetSelection.rankedCandidates.find(
      (candidate) => candidate.pathId === "evidence_runtime"
    );
    expect(evidenceRuntime?.checkIds).toEqual(["object_storage_scanner_runtime", "evidence_report_runtime"]);
    expect(evidenceRuntime?.command).toBe("pnpm evidence:smoke:runtime");

    const serialized = JSON.stringify(report.targetSelection);
    expect(serialized).not.toContain("m49-microsoft-secret");
    expect(serialized).not.toContain("sk_test_m49_secret");
    expect(serialized).not.toContain("m49-storage-secret");
  });

  it("selects exactly one ready disposable path by deterministic rank", () => {
    const report = buildReport({
      PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
      PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
      PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT: "true",
      PURESOC_AUTH_DEPLOYMENT_SMOKE_BASE_URL: "https://auth-smoke.example.test",
      PURESOC_AUTH_DEPLOYMENT_SMOKE_TRUSTED_ORIGIN: "https://web-smoke.example.test",
      PURESOC_AUTH_COOKIE_SECURE: "true",
      PURESOC_EXTERNAL_SMOKE_STRIPE: "true",
      PURESOC_BILLING_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_m49_do_not_print",
      STRIPE_WEBHOOK_SECRET: "whsec_m49_do_not_print",
      STRIPE_PRICE_ID_BASE: "price_m49_base",
      STRIPE_PRICE_ID_PRO: "price_m49_pro",
      STRIPE_PRICE_ID_MSP: "price_m49_msp"
    });

    const selected = report.targetSelection.rankedCandidates.filter((candidate) => candidate.selected);
    expect(report.targetSelection.outcome).toBe("ready_path_selected");
    expect(report.targetSelection.readyCandidateCount).toBe(2);
    expect(report.targetSelection.selectedPathId).toBe("auth_deployment_browser");
    expect(report.targetSelection.selectedCommand).toBe("pnpm auth:smoke:deployment");
    expect(report.targetSelection.selectedCheckIds).toEqual(["auth_deployment_browser"]);
    expect(selected).toHaveLength(1);
    expect(report.targetSelection.guarantees.exactlyOneReadyPathSelected).toBe(true);
    expect(report.nextOperatorActions).toContain("Selected single next smoke path: auth_deployment_browser.");

    const stripe = report.targetSelection.rankedCandidates.find(
      (candidate) => candidate.pathId === "stripe_test_mode_billing"
    );
    expect(stripe?.status).toBe("ready_for_disposable_smoke");
    expect(stripe?.selected).toBe(false);

    const serialized = JSON.stringify(report.targetSelection);
    expect(serialized).not.toContain("https://auth-smoke.example.test");
    expect(serialized).not.toContain("https://web-smoke.example.test");
    expect(serialized).not.toContain("sk_test_m49_do_not_print");
    expect(serialized).not.toContain("whsec_m49_do_not_print");
  });

  it("blocks selection for unsafe production-like targets even when path variables are configured", () => {
    const report = buildReport({
      PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "production",
      PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
      PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT: "true",
      PURESOC_AUTH_DEPLOYMENT_SMOKE_BASE_URL: "https://auth.prod.example.com",
      PURESOC_AUTH_DEPLOYMENT_SMOKE_TRUSTED_ORIGIN: "https://web.prod.example.com",
      PURESOC_AUTH_COOKIE_SECURE: "true"
    });

    const authDeployment = report.targetSelection.rankedCandidates.find(
      (candidate) => candidate.pathId === "auth_deployment_browser"
    );
    expect(report.targetSelection.outcome).toBe("unsafe_target_blocked");
    expect(report.targetSelection.selectedPathId).toBeNull();
    expect(authDeployment?.status).toBe("unsafe_production_target");
    expect(authDeployment?.blockerCodes).toEqual(
      expect.arrayContaining([
        "external_smoke_target_kind_production",
        "auth_deployment_base_url_production_like",
        "auth_deployment_trusted_origin_production_like"
      ])
    );
    expect(JSON.stringify(report.targetSelection)).not.toContain("https://auth.prod.example.com");
  });

  it("selects the combined evidence runtime path only when storage/scanner and evidence/report checks are both ready", () => {
    const report = buildReport({
      PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "local",
      PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
      PURESOC_EXTERNAL_SMOKE_STORAGE: "true",
      PURESOC_EXTERNAL_SMOKE_EVIDENCE_REPORTS: "true",
      PURESOC_OBJECT_STORAGE_PROVIDER: "s3",
      PURESOC_OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
      PURESOC_OBJECT_STORAGE_REGION: "us-east-1",
      PURESOC_OBJECT_STORAGE_BUCKET: "puresoc-smoke",
      PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID: "m49-storage-access",
      PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY: "m49-storage-secret",
      PURESOC_UPLOAD_SCANNER_MODE: "http",
      PURESOC_UPLOAD_SCANNER_ENDPOINT: "http://localhost:3310/scan",
      PURESOC_REPORT_RENDERER: "http://localhost:3002",
      PURESOC_REPORT_STORE_GENERATED_AS_EVIDENCE: "true"
    });

    const selected = report.targetSelection.rankedCandidates.find((candidate) => candidate.selected);
    expect(report.targetSelection.selectedPathId).toBe("evidence_runtime");
    expect(selected?.checkIds).toEqual(["object_storage_scanner_runtime", "evidence_report_runtime"]);
    expect(selected?.status).toBe("ready_for_disposable_smoke");
    expect(selected?.configuredEnvironmentVariables).toEqual(
      expect.arrayContaining([
        "PURESOC_OBJECT_STORAGE_ENDPOINT",
        "PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY",
        "PURESOC_REPORT_RENDERER"
      ])
    );

    const serialized = JSON.stringify(report.targetSelection);
    expect(serialized).not.toContain("http://localhost:9000");
    expect(serialized).not.toContain("http://localhost:3310/scan");
    expect(serialized).not.toContain("http://localhost:3002");
    expect(serialized).not.toContain("m49-storage-access");
    expect(serialized).not.toContain("m49-storage-secret");
  });
});
