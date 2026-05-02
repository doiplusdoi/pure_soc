import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import {
  authDeploymentSmokeConfigFromEnv,
  authDeploymentSmokeReadinessPreflightFromReport,
  runAuthDeploymentSmoke
} from "@puresoc/api";
import {
  collectStartupConfigIssues,
  createExternalSmokeReadinessReport,
  loadConfig,
  type PureSocConfig
} from "@puresoc/config";
import { createApiServices } from "@puresoc/api";
import { startApiServer } from "@puresoc/api";
import { buildAuthDeploymentSmokeReportFromEnv } from "../scripts/auth-deployment-smoke";

const trustedOrigin = "http://127.0.0.1:3001";
const syntheticPassword = "PureSocM47SmokePassword42!";

describe("auth deployment smoke harness", () => {
  let server: ReturnType<typeof startApiServer> | undefined;
  let services: ReturnType<typeof createApiServices> | undefined;

  afterEach(async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
    services = undefined;
  });

  it("defaults to a deterministic secret-free dry run without contacting a deployment", async () => {
    const report = await buildAuthDeploymentSmokeReportFromEnv({
      PURESOC_AUTH_DEPLOYMENT_SMOKE_BASE_URL: "https://auth-smoke.example.test",
      PURESOC_AUTH_DEPLOYMENT_SMOKE_TRUSTED_ORIGIN: "https://web-smoke.example.test"
    });

    expect(report.schemaVersion).toBe("puresoc.auth.deployment_smoke.v1");
    expect(report.command).toBe("pnpm auth:smoke:deployment");
    expect(report.status).toBe("dry_run_passed");
    expect(report.exitCode).toBe(0);
    expect(report.mode).toBe("dry_run");
    expect(report.liveNetworkCallsMade).toBe(false);
    expect(report.endpointMetadata).toMatchObject({
      baseUrlConfigured: true,
      baseUrlClass: "test_hint",
      trustedOriginConfigured: true,
      trustedOriginClass: "test_hint"
    });
    expect(report.plannedOperations.every((operation) => operation.status === "planned")).toBe(true);

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("https://auth-smoke.example.test");
    expect(serialized).not.toContain("https://web-smoke.example.test");
    expect(serialized).not.toContain("puresoc_session=");
    expect(serialized).not.toContain(syntheticPassword);
  });

  it("adds auth deployment readiness without endpoint values and marks safe local targets ready", () => {
    const report = readinessReport({
      PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "local",
      PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
      PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT: "true",
      PURESOC_AUTH_DEPLOYMENT_SMOKE_BASE_URL: "http://127.0.0.1:3001",
      PURESOC_AUTH_DEPLOYMENT_SMOKE_TRUSTED_ORIGIN: trustedOrigin
    });

    const authDeployment = report.checks.find((check) => check.id === "auth_deployment_browser");
    expect(authDeployment?.status).toBe("ready_for_disposable_smoke");
    expect(authDeployment?.metadata).toMatchObject({
      baseUrlClass: "local_loopback",
      trustedOriginClass: "local_loopback",
      localAuthEnabled: true,
      originProtectionEnabled: true,
      rateLimitEnabled: true
    });

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("http://127.0.0.1:3001");
  });

  it("refuses live-candidate execution for public unknown or production-like deployment targets", async () => {
    const env = {
      PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
      PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
      PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT: "true",
      PURESOC_AUTH_DEPLOYMENT_SMOKE_BASE_URL: "https://auth.example.com",
      PURESOC_AUTH_DEPLOYMENT_SMOKE_TRUSTED_ORIGIN: "https://web.example.com",
      PURESOC_AUTH_COOKIE_SECURE: "true"
    };
    const input = smokeInput(env);
    const calls: string[] = [];
    const report = await runAuthDeploymentSmoke({
      ...input,
      fetchImpl: async (url) => {
        calls.push(String(url));
        throw new Error("fetch must not be called when guardrails block");
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.exitCode).toBe(1);
    expect(report.liveNetworkCallsMade).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "readiness_status_not_ready:unsafe_production_target",
        "auth_deployment_base_url_public_unknown",
        "auth_deployment_trusted_origin_public_unknown"
      ])
    );
    expect(report.plannedOperations.every((operation) => operation.status === "skipped")).toBe(true);
    expect(calls).toEqual([]);
    expect(JSON.stringify(report)).not.toContain("https://auth.example.com");
  });

  it("runs against an explicitly confirmed local disposable API target without leaking cookies, passwords, URLs, or emails", async () => {
    const serverConfig = loadConfig({
      env: {
        PURESOC_API_TRUSTED_ORIGINS: trustedOrigin
      }
    });
    services = createApiServices({
      config: serverConfig,
      now: () => new Date("2026-05-02T12:00:00.000Z")
    });
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const env = {
      PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
      PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "local",
      PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
      PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT: "true",
      PURESOC_AUTH_DEPLOYMENT_SMOKE_BASE_URL: baseUrl,
      PURESOC_AUTH_DEPLOYMENT_SMOKE_TRUSTED_ORIGIN: trustedOrigin,
      PURESOC_API_TRUSTED_ORIGINS: trustedOrigin
    };

    const report = await runAuthDeploymentSmoke({
      ...smokeInput(env),
      now: () => new Date("2026-05-02T12:00:00.000Z"),
      idFactory: () => "m47-local-test"
    });

    expect(report.status).toBe("passed");
    expect(report.exitCode).toBe(0);
    expect(report.liveNetworkCallsMade).toBe(true);
    expect(report.externalProviderCallsMade).toBe(false);
    expect(report.browserServicesCalled).toBe(false);
    expect(report.providerWritesEnabled).toBe(false);
    expect(report.plannedOperations.map((operation) => operation.status)).toEqual([
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed"
    ]);

    const cookieOperation = report.plannedOperations.find(
      (operation) => operation.id === "auth.login.issue_session_cookie"
    );
    expect(cookieOperation?.metadata.sessionCookie).toMatchObject({
      issued: true,
      httpOnly: true,
      sameSiteLax: true,
      pathRoot: true,
      secureConfigured: false,
      secure: false
    });

    const forwardedOperation = report.plannedOperations.find(
      (operation) => operation.id === "auth.forwarded_headers.rate_limit_ip"
    );
    expect(forwardedOperation?.metadata).toMatchObject({
      finalStatus: 429,
      forwardedForHonoredByRateLimit: true,
      cookieSecureDrivenByConfig: true
    });

    const rbacOperation = report.plannedOperations.find(
      (operation) => operation.id === "auth.rbac.organization_scoping"
    );
    expect(rbacOperation?.metadata).toMatchObject({
      crossOrganizationMembersStatus: 403,
      crossOrganizationRejected: true,
      organizationIdReturnedToOutput: false
    });

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(baseUrl);
    expect(serialized).not.toContain(trustedOrigin);
    expect(serialized).not.toContain(syntheticPassword);
    expect(serialized).not.toContain("PureSocM47WrongPassword42!");
    expect(serialized).not.toContain("puresoc_session=");
    expect(serialized).not.toContain("m47-primary-m47-local-test@example.test");
    const apiServices = services;
    if (!apiServices) {
      throw new Error("test services were not initialized");
    }
    expect(JSON.stringify(apiServices.auditSink.records)).not.toContain(syntheticPassword);
    expect(JSON.stringify(apiServices.auditSink.records)).not.toContain("puresoc_session=");
  });
});

const smokeInput = (env: NodeJS.ProcessEnv) => {
  const appConfig = loadConfig({ env });
  const readiness = readinessReport(env);

  return {
    appConfig,
    smokeConfig: authDeploymentSmokeConfigFromEnv(env, appConfig),
    readiness: authDeploymentSmokeReadinessPreflightFromReport(readiness),
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
