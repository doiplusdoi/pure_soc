import { describe, expect, it } from "vitest";

import {
  getMicrosoft365ExternalSmokeReadinessMetadata,
  microsoft365ReadOnlySmokeConfigFromEnv,
  permissionsForMicrosoft365Bundles,
  runMicrosoft365ReadOnlySmoke,
  type Microsoft365ReadOnlySmokeReadinessPreflight
} from "../index";
import type { MicrosoftGraphHttpClient } from "../graph-client";

const tenantId = "11111111-1111-1111-1111-111111111111";
const accessToken = "m45_access_token_do_not_print";
const clientSecret = "m45_client_secret_do_not_print";
const baselinePermissions = permissionsForMicrosoft365Bundles(["m365_read_baseline"]);
const securityPermissions = permissionsForMicrosoft365Bundles(["m365_security_read"]);

const readiness = (
  input: Partial<Microsoft365ReadOnlySmokeReadinessPreflight> = {}
): Microsoft365ReadOnlySmokeReadinessPreflight => ({
  checkId: "microsoft365_read_only_tenant",
  status: "configured_dry_run_only",
  mode: "dry_run",
  target: {
    kind: "unknown",
    disposableConfirmation: false
  },
  requiredEnvironment: [
    {
      label: "Microsoft 365 client ID",
      env: ["MICROSOFT365_CLIENT_ID", "M365_CLIENT_ID"],
      sensitive: false,
      requiredFor: "configuration",
      configured: true
    },
    {
      label: "Microsoft 365 client secret",
      env: ["MICROSOFT365_CLIENT_SECRET", "M365_CLIENT_SECRET"],
      sensitive: true,
      requiredFor: "secret",
      configured: true
    },
    {
      label: "Microsoft 365 test tenant ID",
      env: ["PURESOC_MICROSOFT365_SMOKE_TENANT_ID", "MICROSOFT365_TENANT_ID", "M365_TENANT_ID"],
      sensitive: false,
      requiredFor: "configuration",
      configured: true
    }
  ],
  configuredEnvironmentVariables: ["MICROSOFT365_CLIENT_ID", "MICROSOFT365_CLIENT_SECRET", "MICROSOFT365_TENANT_ID"],
  blockers: [],
  guardrails: [],
  metadata: {
    providerKey: "microsoft365",
    permissionMetadata: getMicrosoft365ExternalSmokeReadinessMetadata()
  },
  ...input
});

const smokeConfig = (overrides: Partial<ReturnType<typeof microsoft365ReadOnlySmokeConfigFromEnv>> = {}) => ({
  ...microsoft365ReadOnlySmokeConfigFromEnv({
    MICROSOFT365_CLIENT_ID: "client-id",
    MICROSOFT365_CLIENT_SECRET: clientSecret,
    MICROSOFT365_TENANT_ID: tenantId
  }),
  ...overrides
});

describe("Microsoft 365 read-only smoke harness", () => {
  it("defaults to a secret-free dry run and does not call Microsoft Graph", async () => {
    const tokenCalls: string[] = [];
    const graphCalls: string[] = [];
    const graphHttpClient: MicrosoftGraphHttpClient = async (request) => {
      graphCalls.push(request.url);
      throw new Error("Graph client must not be called in dry-run mode");
    };

    const report = await runMicrosoft365ReadOnlySmoke({
      config: smokeConfig(),
      readiness: readiness({
        status: "blocked_missing_secret",
        requiredEnvironment: [
          {
            label: "Microsoft 365 client secret",
            env: ["MICROSOFT365_CLIENT_SECRET", "M365_CLIENT_SECRET"],
            sensitive: true,
            requiredFor: "secret",
            configured: false
          }
        ],
        configuredEnvironmentVariables: [],
        blockers: ["missing_required_environment:MICROSOFT365_CLIENT_SECRET|M365_CLIENT_SECRET"]
      }),
      env: {},
      tokenClient: async (input) => {
        tokenCalls.push(input.clientId);
        throw new Error("Token client must not be called in dry-run mode");
      },
      graphHttpClient
    });

    expect(report.status).toBe("dry_run_passed");
    expect(report.exitCode).toBe(0);
    expect(report.liveNetworkCallsMade).toBe(false);
    expect(report.missingEnvironmentVariables).toEqual(["M365_CLIENT_SECRET", "MICROSOFT365_CLIENT_SECRET"]);
    expect(report.plannedOperations.every((operation) => operation.status === "planned")).toBe(true);
    expect(tokenCalls).toEqual([]);
    expect(graphCalls).toEqual([]);

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(clientSecret);
    expect(serialized).not.toContain(accessToken);
    expect(serialized).not.toContain(tenantId);
  });

  it("refuses live execution when readiness or disposable guards are not satisfied", async () => {
    const tokenCalls: string[] = [];
    const report = await runMicrosoft365ReadOnlySmoke({
      config: smokeConfig(),
      readiness: readiness({
        status: "unsafe_production_target",
        mode: "live_candidate",
        target: {
          kind: "staging",
          disposableConfirmation: true
        },
        blockers: ["external_smoke_target_kind_staging"]
      }),
      env: {
        PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
        PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "staging",
        PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
        PURESOC_EXTERNAL_SMOKE_MICROSOFT365: "true"
      },
      tokenClient: async (input) => {
        tokenCalls.push(input.clientId);
        throw new Error("Token client must not be called when blocked");
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.exitCode).toBe(1);
    expect(report.liveNetworkCallsMade).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "readiness_status_not_ready:unsafe_production_target",
        "external_smoke_target_kind_staging"
      ])
    );
    expect(report.plannedOperations.every((operation) => operation.status === "skipped")).toBe(true);
    expect(tokenCalls).toEqual([]);
    expect(JSON.stringify(report)).not.toContain(clientSecret);
  });

  it("refuses live execution if write bundle metadata is not reported disabled", async () => {
    const report = await runMicrosoft365ReadOnlySmoke({
      config: smokeConfig(),
      readiness: readiness({
        status: "ready_for_disposable_smoke",
        mode: "live_candidate",
        target: {
          kind: "disposable",
          disposableConfirmation: true
        },
        metadata: {
          permissionMetadata: {
            ...getMicrosoft365ExternalSmokeReadinessMetadata(),
            readPermissionBundles: [
              {
                bundleKey: "m365_read_baseline",
                purpose: "Read baseline.",
                permissions: ["Organization.Read.All"],
                defaultEnabled: true,
                readOnly: false
              }
            ],
            writePermissionBundlesDisabled: ["m365_remediation_write"]
          }
        }
      }),
      env: {
        PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
        PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
        PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
        PURESOC_EXTERNAL_SMOKE_MICROSOFT365: "true"
      },
      tokenClient: async () => {
        throw new Error("Token client must not be called with unsafe permission metadata");
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "microsoft365_read_bundle_metadata_not_read_only",
        "microsoft365_write_bundle_not_reported_disabled:m365_defender_write"
      ])
    );
  });

  it("runs live-candidate read-only modules with injected fake clients and redacts tokens and tenant payloads", async () => {
    const tokenCalls: Array<{ clientId: string; clientSecret: string; tenantId: string }> = [];
    const graphCalls: Array<{ path: string; authorization: string | undefined }> = [];
    const graphHttpClient: MicrosoftGraphHttpClient = async (request) => {
      const url = new URL(request.url);
      graphCalls.push({ path: `${url.pathname}${url.search}`, authorization: request.headers.authorization });

      if (url.pathname === "/v1.0/organization") {
        return {
          status: 200,
          body: {
            value: [
              {
                id: tenantId,
                displayName: "Sensitive Contoso Tenant",
                verifiedDomains: ["sensitive-contoso.example"]
              }
            ]
          }
        };
      }

      if (url.pathname === "/v1.0/domains") {
        return {
          status: 200,
          body: {
            value: [{ id: "sensitive-contoso.example", name: "sensitive-contoso.example", isVerified: true }]
          }
        };
      }

      if (url.pathname === "/v1.0/subscribedSkus") {
        return {
          status: 200,
          body: {
            value: [
              {
                skuId: "sku_e5",
                skuPartNumber: "ENTERPRISEPREMIUM",
                servicePlans: [{ servicePlanName: "DEFENDER_XDR" }]
              }
            ]
          }
        };
      }

      if (url.pathname === "/v1.0/security/incidents") {
        return {
          status: 200,
          body: {
            value: [
              {
                id: "incident-sensitive-id",
                displayName: "Sensitive incident title",
                severity: "high",
                status: "active",
                assignedTo: "analyst@sensitive-contoso.example",
                incidentWebUrl: "https://security.microsoft.com/incidents/incident-sensitive-id"
              }
            ]
          }
        };
      }

      if (url.pathname === "/v1.0/security/alerts_v2") {
        return {
          status: 200,
          body: {
            value: [
              {
                id: "alert-sensitive-id",
                incidentId: "incident-sensitive-id",
                title: "Sensitive alert title",
                severity: "high",
                status: "new",
                serviceSource: "microsoftDefenderForEndpoint",
                alertWebUrl: "https://security.microsoft.com/alerts/alert-sensitive-id"
              }
            ]
          }
        };
      }

      throw new Error(`Unexpected Graph path: ${url.pathname}`);
    };

    const report = await runMicrosoft365ReadOnlySmoke({
      config: smokeConfig({
        requestedModules: ["tenant-profile", "licensing", "defender-xdr"],
        requestedPermissionBundles: ["m365_read_baseline", "m365_security_read"]
      }),
      readiness: readiness({
        status: "ready_for_disposable_smoke",
        mode: "live_candidate",
        target: {
          kind: "disposable",
          disposableConfirmation: true
        }
      }),
      env: {
        PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
        PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
        PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
        PURESOC_EXTERNAL_SMOKE_MICROSOFT365: "true"
      },
      tokenClient: async (input) => {
        tokenCalls.push({
          clientId: input.clientId,
          clientSecret: input.clientSecret,
          tenantId: input.tenantId
        });
        return {
          accessToken,
          tokenType: "Bearer",
          expiresIn: 3600,
          tenantId,
          grantedPermissions: [...baselinePermissions, ...securityPermissions]
        };
      },
      graphHttpClient,
      now: () => new Date("2026-05-02T10:00:00.000Z"),
      idFactory: () => "m45-test-smoke"
    });

    expect(report.status).toBe("passed");
    expect(report.exitCode).toBe(0);
    expect(report.liveNetworkCallsMade).toBe(true);
    expect(tokenCalls).toEqual([{ clientId: "client-id", clientSecret, tenantId }]);
    expect(graphCalls.map((call) => call.path)).toEqual([
      "/v1.0/organization",
      "/v1.0/domains",
      "/v1.0/subscribedSkus",
      "/v1.0/security/incidents?$top=50",
      "/v1.0/security/alerts_v2?$top=50"
    ]);
    expect(graphCalls.every((call) => call.authorization === `Bearer ${accessToken}`)).toBe(true);
    expect(report.plannedOperations.map((operation) => operation.status)).toEqual([
      "passed",
      "passed",
      "passed",
      "passed",
      "passed"
    ]);
    expect(report.plannedOperations.find((operation) => operation.id === "microsoft365.graph.read_only_modules")?.metadata).toMatchObject({
      moduleStatuses: {
        "tenant-profile": "succeeded",
        licensing: "succeeded",
        "defender-xdr": "succeeded"
      },
      rawTenantPayloadsReturnedToOutput: false,
      userEmailsReturnedToOutput: false,
      providerWritesEnabled: false
    });

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(clientSecret);
    expect(serialized).not.toContain(accessToken);
    expect(serialized).not.toContain(tenantId);
    expect(serialized).not.toContain("Sensitive Contoso Tenant");
    expect(serialized).not.toContain("sensitive-contoso.example");
    expect(serialized).not.toContain("analyst@sensitive-contoso.example");
    expect(serialized).not.toContain("https://security.microsoft.com");
  });
});
