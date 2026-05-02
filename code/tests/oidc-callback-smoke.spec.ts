import { describe, expect, it } from "vitest";

import {
  oidcCallbackSmokeConfigFromEnv,
  oidcCallbackSmokeReadinessPreflightFromReport,
  runOidcCallbackSmoke
} from "@puresoc/api";
import {
  collectStartupConfigIssues,
  createExternalSmokeReadinessReport,
  loadConfig,
  type PureSocConfig
} from "@puresoc/config";
import { buildOidcCallbackSmokeReportFromEnv } from "../scripts/oidc-callback-smoke";

const secret = "google-client-secret-do-not-print";

const readyGoogleEnv = {
  PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
  PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
  PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
  PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER: "google",
  PURESOC_EXTERNAL_SMOKE_OIDC_GOOGLE: "true",
  PURESOC_AUTH_GOOGLE_ENABLED: "true",
  PURESOC_AUTH_GOOGLE_CLIENT_ID: "google-client-id",
  PURESOC_AUTH_GOOGLE_CLIENT_SECRET: secret,
  PURESOC_AUTH_GOOGLE_REDIRECT_URI: "http://localhost:3001/auth/oidc/google/callback"
};

describe("OIDC/social callback smoke harness", () => {
  it("defaults to a deterministic secret-free dry run without provider calls", async () => {
    const report = await buildOidcCallbackSmokeReportFromEnv({
      PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER: "google",
      PURESOC_AUTH_GOOGLE_CLIENT_SECRET: "dry-run-secret-do-not-print"
    });

    expect(report.schemaVersion).toBe("puresoc.oidc_social.callback_smoke.v1");
    expect(report.command).toBe("pnpm oidc:smoke:callback");
    expect(report.status).toBe("dry_run_passed");
    expect(report.exitCode).toBe(0);
    expect(report.mode).toBe("dry_run");
    expect(report.localCallbackExercised).toBe(false);
    expect(report.externalProviderCallsMade).toBe(false);
    expect(report.authorizationCodesReturned).toBe(false);
    expect(report.rawStateReturned).toBe(false);
    expect(report.rawNonceReturned).toBe(false);
    expect(report.pkceVerifierReturned).toBe(false);
    expect(report.sessionCookiesReturned).toBe(false);
    expect(report.providerEndpointUrlsReturned).toBe(false);
    expect(report.plannedOperations.every((operation) => operation.status === "planned")).toBe(true);

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("dry-run-secret-do-not-print");
    expect(serialized).not.toContain("puresoc_session=");
    expect(serialized).not.toContain("https://accounts.google.com");
    expect(serialized).not.toContain("oauth2.googleapis.com");
  });

  it("requires provider enablement before readiness can become disposable-smoke ready", () => {
    const report = readinessReport({
      PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
      PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
      PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER: "google",
      PURESOC_EXTERNAL_SMOKE_OIDC_GOOGLE: "true",
      PURESOC_AUTH_GOOGLE_CLIENT_ID: "google-client-id",
      PURESOC_AUTH_GOOGLE_CLIENT_SECRET: secret,
      PURESOC_AUTH_GOOGLE_REDIRECT_URI: "http://localhost:3001/auth/oidc/google/callback"
    });

    const google = report.checks.find((check) => check.id === "oidc_google_callback");
    expect(google?.status).toBe("blocked_missing_secret");
    expect(google?.blockers).toContain("oidc_provider_not_enabled:google");
    expect(JSON.stringify(report)).not.toContain(secret);
  });

  it("refuses live-candidate execution when selected readiness is unsafe", async () => {
    const input = smokeInput({
      ...readyGoogleEnv,
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "staging"
    });

    const report = await runOidcCallbackSmoke({
      ...input,
      allowInjectedDisposableProviderHarness: true
    });

    expect(report.status).toBe("blocked");
    expect(report.exitCode).toBe(1);
    expect(report.localCallbackExercised).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "readiness_status_not_ready:unsafe_production_target",
        "external_smoke_target_kind_staging"
      ])
    );
    expect(report.plannedOperations.every((operation) => operation.status === "skipped")).toBe(true);
  });

  it("does not execute the local disposable callback harness unless explicitly injected for tests", async () => {
    const input = smokeInput(readyGoogleEnv);
    const report = await runOidcCallbackSmoke(input);

    expect(report.status).toBe("blocked");
    expect(report.localCallbackExercised).toBe(false);
    expect(report.blockers).toContain("oidc_disposable_callback_execution_requires_injected_test_harness");
    expect(JSON.stringify(report)).not.toContain(secret);
  });

  it("exercises callback, explicit account-link approval, session cookie metadata, and audit redaction with injected clients", async () => {
    const input = smokeInput(readyGoogleEnv);
    const report = await runOidcCallbackSmoke({
      ...input,
      allowInjectedDisposableProviderHarness: true,
      now: () => new Date("2026-05-02T12:00:00.000Z")
    });

    expect(report.status).toBe("passed");
    expect(report.exitCode).toBe(0);
    expect(report.localCallbackExercised).toBe(true);
    expect(report.externalProviderCallsMade).toBe(false);
    expect(report.managedProviderConnectionsCreated).toBe(false);
    expect(report.runtimeMetadata).toMatchObject({
      transientStateStoredAsHash: true,
      nonceStoredAsHash: true,
      accountLinkingRequiresExplicitSignedInApproval: true,
      callbackRouteOriginExempt: true,
      providerConnectionBoundary: "user_login_not_managed_provider_connection",
      realProviderAppExercised: false,
      injectedDisposableProviderHarnessAllowed: true
    });
    expect(report.plannedOperations.map((operation) => operation.status)).toEqual([
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed"
    ]);

    const accountLinkOperation = report.plannedOperations.find(
      (operation) => operation.id === "oidc.account_linking.enforce_explicit_approval"
    );
    expect(accountLinkOperation?.metadata).toMatchObject({
      rejectedCollisionStatus: 409,
      approvedLinkStatus: 200,
      explicitSignedInApprovalRequired: true,
      emailAloneTrustedForLinking: false
    });

    const sessionOperation = report.plannedOperations.find((operation) => operation.id === "oidc.session.create_cookie");
    expect(sessionOperation?.metadata.sessionCookie).toMatchObject({
      issued: true,
      httpOnly: true,
      sameSiteLax: true,
      pathRoot: true,
      secureConfigured: false
    });

    const auditOperation = report.plannedOperations.find((operation) => operation.id === "oidc.audit.write_redacted_events");
    expect(auditOperation?.metadata.auditEventCounts).toMatchObject({
      accountLinkRejected: 1,
      accountLinked: 1
    });

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("puresoc-oidc-smoke-authorization-code");
    expect(serialized).not.toContain("puresoc-oidc-smoke-id-token");
    expect(serialized).not.toContain("puresoc-oidc-smoke-access-token");
    expect(serialized).not.toContain("puresoc-oidc-smoke@example.test");
    expect(serialized).not.toContain("puresoc_session=");
    expect(serialized).not.toContain("https://accounts.google.com");
    expect(serialized).not.toContain("oauth2.googleapis.com");
  });
});

const smokeInput = (env: NodeJS.ProcessEnv) => {
  const appConfig = loadConfig({ env });
  const readiness = readinessReport(env);
  const smokeConfig = oidcCallbackSmokeConfigFromEnv(env, appConfig);

  return {
    appConfig,
    smokeConfig,
    readiness: oidcCallbackSmokeReadinessPreflightFromReport(readiness, smokeConfig.selectedProviderKey),
    env
  };
};

const readinessReport = (env: NodeJS.ProcessEnv) => {
  const config: PureSocConfig = loadConfig({ env });
  return createExternalSmokeReadinessReport({
    config,
    env,
    startupValidationIssues: collectStartupConfigIssues(config)
  });
};
