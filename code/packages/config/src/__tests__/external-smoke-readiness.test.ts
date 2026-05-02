import { describe, expect, it } from "vitest";

import {
  collectStartupConfigIssues,
  createExternalSmokeReadinessReport,
  loadConfig
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
  deferredReadModules: ["exchange-posture"]
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

describe("external smoke readiness", () => {
  it("reports default dry-run readiness without live calls or secret values", () => {
    const report = buildReport({
      MICROSOFT365_CLIENT_SECRET: "m365-client-secret-value",
      STRIPE_SECRET_KEY: "sk_test_secret-value",
      STRIPE_WEBHOOK_SECRET: "whsec_secret-value",
      PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY: "object-storage-secret-value"
    });

    expect(report.schemaVersion).toBe("puresoc.external_smoke_readiness.v1");
    expect(report.mode).toBe("dry_run");
    expect(report.liveNetworkCalls).toBe(false);
    expect(report.guarantees).toMatchObject({
      noLiveNetworkCallsByDefault: true,
      providerWritesEnabled: false,
      secretValuesReturned: false,
      storagePointersReturned: false
    });
    expect(report.checks.find((check) => check.id === "microsoft365_read_only_tenant")?.status).toBe(
      "blocked_missing_secret"
    );
    expect(report.checks.find((check) => check.id === "stripe_test_mode_billing")?.status).toBe(
      "blocked_missing_secret"
    );
    expect(report.checks.find((check) => check.id === "oidc_google_callback")?.status).toBe("not_configured");

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("m365-client-secret-value");
    expect(serialized).not.toContain("sk_test_secret-value");
    expect(serialized).not.toContain("whsec_secret-value");
    expect(serialized).not.toContain("object-storage-secret-value");
  });

  it("marks Microsoft 365 read-only prerequisites ready only after live-candidate and disposable opt-in guards", () => {
    const report = buildReport({
      PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
      PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
      PURESOC_EXTERNAL_SMOKE_MICROSOFT365: "true",
      MICROSOFT365_CLIENT_ID: "client-id",
      MICROSOFT365_CLIENT_SECRET: "client-secret",
      MICROSOFT365_TENANT_ID: "tenant-id"
    });

    const microsoft365 = report.checks.find((check) => check.id === "microsoft365_read_only_tenant");
    expect(microsoft365?.status).toBe("ready_for_disposable_smoke");
    expect(microsoft365?.metadata.permissionMetadata).toMatchObject({
      providerKey: "microsoft365",
      writePermissionBundlesDisabled: ["m365_remediation_write", "m365_defender_write"]
    });
    expect(JSON.stringify(report)).not.toContain("client-secret");
  });

  it("flags Stripe live-mode secrets as unsafe even when disposable guards are set", () => {
    const report = buildReport({
      PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "test",
      PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
      PURESOC_EXTERNAL_SMOKE_STRIPE: "true",
      PURESOC_BILLING_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_live_do-not-print",
      STRIPE_WEBHOOK_SECRET: "whsec_do-not-print",
      STRIPE_PRICE_ID_BASE: "price_test_base",
      STRIPE_PRICE_ID_PRO: "price_test_pro",
      STRIPE_PRICE_ID_MSP: "price_test_msp"
    });

    const stripe = report.checks.find((check) => check.id === "stripe_test_mode_billing");
    expect(stripe?.status).toBe("unsafe_production_target");
    expect(stripe?.blockers).toContain("stripe_live_mode_secret_key_detected");
    expect(JSON.stringify(report)).not.toContain("sk_live_do-not-print");
    expect(JSON.stringify(report)).not.toContain("whsec_do-not-print");
  });

  it("marks Stripe test-mode prerequisites ready only when billing is Stripe and all disposable guards are set", () => {
    const report = buildReport({
      PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
      PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
      PURESOC_EXTERNAL_SMOKE_STRIPE: "true",
      PURESOC_BILLING_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_do-not-print",
      STRIPE_WEBHOOK_SECRET: "whsec_do-not-print",
      STRIPE_PRICE_ID_BASE: "price_test_base",
      STRIPE_PRICE_ID_PRO: "price_test_pro",
      STRIPE_PRICE_ID_MSP: "price_test_msp"
    });

    const stripe = report.checks.find((check) => check.id === "stripe_test_mode_billing");
    expect(stripe?.status).toBe("ready_for_disposable_smoke");
    expect(stripe?.blockers).toEqual([]);
    expect(stripe?.configuredEnvironmentVariables).toEqual([
      "PURESOC_BILLING_PROVIDER",
      "STRIPE_PRICE_ID_BASE",
      "STRIPE_PRICE_ID_MSP",
      "STRIPE_PRICE_ID_PRO",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET"
    ]);
    expect(JSON.stringify(report)).not.toContain("sk_test_do-not-print");
    expect(JSON.stringify(report)).not.toContain("whsec_do-not-print");
  });

  it("blocks enabled OIDC providers when callback app secrets are absent", () => {
    const report = buildReport({
      PURESOC_AUTH_GOOGLE_ENABLED: "true"
    });

    const google = report.checks.find((check) => check.id === "oidc_google_callback");
    expect(google?.status).toBe("blocked_missing_secret");
    expect(google?.blockers).toEqual(
      expect.arrayContaining([
        "missing_required_environment:PURESOC_AUTH_GOOGLE_CLIENT_ID",
        "missing_required_environment:PURESOC_AUTH_GOOGLE_CLIENT_SECRET"
      ])
    );
  });

  it("marks S3 and HTTP scanner metadata ready without returning endpoints or credentials", () => {
    const report = buildReport({
      PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "local",
      PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
      PURESOC_EXTERNAL_SMOKE_STORAGE: "true",
      PURESOC_OBJECT_STORAGE_PROVIDER: "s3",
      PURESOC_OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
      PURESOC_OBJECT_STORAGE_REGION: "us-east-1",
      PURESOC_OBJECT_STORAGE_BUCKET: "puresoc-smoke",
      PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID: "storage-access",
      PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY: "storage-secret",
      PURESOC_UPLOAD_SCANNER_MODE: "http",
      PURESOC_UPLOAD_SCANNER_ENDPOINT: "http://localhost:3310/scan"
    });

    const storage = report.checks.find((check) => check.id === "object_storage_scanner_runtime");
    expect(storage?.status).toBe("ready_for_disposable_smoke");
    expect(storage?.metadata).toMatchObject({
      objectStorageProvider: "s3",
      objectStorageEndpointClass: "local",
      uploadScannerMode: "http",
      uploadScannerEndpointConfigured: true
    });

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("http://localhost:9000");
    expect(serialized).not.toContain("http://localhost:3310/scan");
    expect(serialized).not.toContain("storage-access");
    expect(serialized).not.toContain("storage-secret");
  });
});
