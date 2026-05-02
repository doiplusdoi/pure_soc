import { describe, expect, it } from "vitest";

import {
  runEvidenceRuntimeSmoke,
  sha256Hex,
  type EvidenceRuntimeSmokeConfig,
  type EvidenceRuntimeSmokeReadinessPreflight
} from "../index";

const runtimeConfig = (overrides: Partial<EvidenceRuntimeSmokeConfig> = {}): EvidenceRuntimeSmokeConfig => ({
  app: {
    env: "development",
    legalCaveat: "PureSOC internal readiness smoke output is not a legal opinion."
  },
  api: {
    requestLimits: {
      evidenceUploadMaxBytes: 1_048_576
    }
  },
  storage: {
    objectStorage: {
      provider: "s3",
      endpoint: "http://localhost:9000",
      region: "us-east-1",
      bucket: "puresoc-smoke",
      accessKeyId: "storage-access-do-not-print",
      secretAccessKey: "storage-secret-do-not-print",
      forcePathStyle: true
    },
    uploadScanner: {
      mode: "http",
      endpoint: "http://localhost:3310/scan",
      mockStatus: "clean",
      allowNoopInProduction: false,
      timeoutMs: 10_000
    }
  },
  reports: {
    legalCaveatRequired: true,
    renderer: "http://localhost:3002",
    defaultExportFormat: "json",
    storeGeneratedReportsAsEvidence: true
  },
  ...overrides
});

const readiness = (
  checkId: EvidenceRuntimeSmokeReadinessPreflight["checkId"],
  input: Partial<EvidenceRuntimeSmokeReadinessPreflight> = {}
): EvidenceRuntimeSmokeReadinessPreflight => ({
  checkId,
  status: "configured_dry_run_only",
  mode: "dry_run",
  target: {
    kind: "unknown",
    disposableConfirmation: false
  },
  requiredEnvironment: [
    {
      label: "S3 endpoint",
      env: ["PURESOC_OBJECT_STORAGE_ENDPOINT"],
      sensitive: false,
      requiredFor: "configuration",
      configured: true
    },
    {
      label: "S3 secret key",
      env: ["PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY"],
      sensitive: true,
      requiredFor: "secret",
      configured: true
    },
    {
      label: "Report renderer",
      env: ["PURESOC_REPORT_RENDERER"],
      sensitive: false,
      requiredFor: "configuration",
      configured: true
    }
  ],
  configuredEnvironmentVariables: [
    "PURESOC_OBJECT_STORAGE_ENDPOINT",
    "PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY",
    "PURESOC_REPORT_RENDERER"
  ],
  blockers: [],
  guardrails: [],
  metadata: {},
  ...input
});

const readyReadiness = () => ({
  objectStorageScanner: readiness("object_storage_scanner_runtime", {
    status: "ready_for_disposable_smoke",
    mode: "live_candidate",
    target: {
      kind: "disposable",
      disposableConfirmation: true
    }
  }),
  evidenceReports: readiness("evidence_report_runtime", {
    status: "ready_for_disposable_smoke",
    mode: "live_candidate",
    target: {
      kind: "disposable",
      disposableConfirmation: true
    }
  })
});

describe("evidence runtime smoke harness", () => {
  it("defaults to a secret-free dry run and does not call storage, scanners, or renderers", async () => {
    const calls: string[] = [];
    const report = await runEvidenceRuntimeSmoke({
      config: runtimeConfig(),
      readiness: {
        objectStorageScanner: readiness("object_storage_scanner_runtime", {
          status: "blocked_missing_secret",
          requiredEnvironment: [
            {
              label: "S3 secret key",
              env: ["PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY"],
              sensitive: true,
              requiredFor: "secret",
              configured: false
            }
          ],
          configuredEnvironmentVariables: [],
          blockers: ["missing_required_environment:PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY"]
        }),
        evidenceReports: readiness("evidence_report_runtime")
      },
      env: {},
      fetchImpl: async (url) => {
        calls.push(url.toString());
        throw new Error("fetch must not run in dry-run mode");
      }
    });

    expect(report.status).toBe("dry_run_passed");
    expect(report.exitCode).toBe(0);
    expect(report.liveNetworkCallsMade).toBe(false);
    expect(report.missingEnvironmentVariables).toEqual(["PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY"]);
    expect(report.plannedOperations.map((operation) => operation.status)).toEqual([
      "planned",
      "planned",
      "planned",
      "planned"
    ]);
    expect(calls).toEqual([]);

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("storage-access-do-not-print");
    expect(serialized).not.toContain("storage-secret-do-not-print");
    expect(serialized).not.toContain("http://localhost:9000");
    expect(serialized).not.toContain("http://localhost:3310");
    expect(serialized).not.toContain("http://localhost:3002");
    expect(serialized).not.toContain("s3://");
  });

  it("refuses live execution unless both readiness paths and explicit opt-ins are ready", async () => {
    const calls: string[] = [];
    const report = await runEvidenceRuntimeSmoke({
      config: runtimeConfig(),
      readiness: {
        objectStorageScanner: readiness("object_storage_scanner_runtime", {
          status: "ready_for_disposable_smoke",
          mode: "live_candidate",
          target: {
            kind: "disposable",
            disposableConfirmation: true
          }
        }),
        evidenceReports: readiness("evidence_report_runtime", {
          status: "configured_dry_run_only",
          mode: "live_candidate",
          target: {
            kind: "disposable",
            disposableConfirmation: true
          }
        })
      },
      env: {
        PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
        PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
        PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
        PURESOC_EXTERNAL_SMOKE_STORAGE: "true"
      },
      fetchImpl: async (url) => {
        calls.push(url.toString());
        throw new Error("fetch must not run while blocked");
      }
    });

    expect(report.status).toBe("blocked");
    expect(report.exitCode).toBe(1);
    expect(report.liveNetworkCallsMade).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "readiness_status_not_ready:evidence_report_runtime:configured_dry_run_only",
        "evidence_reports_external_smoke_opt_in_missing"
      ])
    );
    expect(report.plannedOperations.every((operation) => operation.status === "skipped")).toBe(true);
    expect(calls).toEqual([]);
  });

  it("runs live-candidate operations with injected disposable fakes and keeps output sanitized", async () => {
    const renderedBody = Buffer.from("%PDF-1.4\nrendered-report-body-do-not-print\n%%EOF\n", "utf8");
    const calls: Array<{ url: string; method?: string; authorization?: string | null; bodyText?: string }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      const urlText = url.toString();
      const headers = new Headers(init?.headers);
      const bodyText = typeof init?.body === "string" ? init.body : undefined;
      calls.push({
        url: urlText,
        method: init?.method,
        authorization: headers.get("authorization"),
        bodyText
      });

      if (urlText === "http://localhost:3002/render") {
        return new Response(renderedBody, {
          status: 200,
          headers: {
            "content-type": "application/pdf",
            "x-puresoc-renderer": "puresoc-report-renderer",
            "x-puresoc-content-sha256": sha256Hex(renderedBody)
          }
        });
      }

      if (urlText === "http://localhost:3310/scan") {
        return new Response(
          JSON.stringify({
            status: "clean",
            scannerName: "http-upload-scanner",
            scannedAt: "2026-05-02T10:00:00.000Z",
            findings: []
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        );
      }

      if (init?.method === "PUT") {
        return new Response("", { status: 200 });
      }

      if (init?.method === "GET") {
        return new Response(renderedBody, {
          status: 200,
          headers: {
            "content-type": "application/pdf"
          }
        });
      }

      return new Response("not found", { status: 404 });
    };

    const report = await runEvidenceRuntimeSmoke({
      config: runtimeConfig(),
      readiness: readyReadiness(),
      env: {
        PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
        PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
        PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
        PURESOC_EXTERNAL_SMOKE_STORAGE: "true",
        PURESOC_EXTERNAL_SMOKE_EVIDENCE_REPORTS: "true"
      },
      fetchImpl,
      now: () => new Date("2026-05-02T10:00:00.000Z"),
      idFactory: () => "m44-test-smoke"
    });

    expect(report.status).toBe("passed");
    expect(report.exitCode).toBe(0);
    expect(report.liveNetworkCallsMade).toBe(true);
    expect(calls.map((call) => call.method)).toEqual(["POST", "POST", "PUT", "GET"]);
    expect(calls[2]?.authorization).toContain("AWS4-HMAC-SHA256");
    expect(calls[2]?.authorization).not.toContain("storage-secret-do-not-print");
    expect(report.plannedOperations.map((operation) => operation.status)).toEqual([
      "passed",
      "passed",
      "passed",
      "passed"
    ]);
    expect(report.plannedOperations[1]?.metadata).toMatchObject({
      sourceType: "generated_report",
      scanStatus: "clean",
      storageUriReturnedToOutput: false
    });
    expect(report.plannedOperations[3]?.metadata).toMatchObject({
      csvExportMetadataRecorded: true,
      binaryEvidencePackageMetadataRecorded: true,
      storagePointerReturnedToClient: false
    });

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("storage-access-do-not-print");
    expect(serialized).not.toContain("storage-secret-do-not-print");
    expect(serialized).not.toContain("http://localhost:9000");
    expect(serialized).not.toContain("http://localhost:3310");
    expect(serialized).not.toContain("http://localhost:3002");
    expect(serialized).not.toContain("s3://");
    expect(serialized).not.toContain("evidence/org_puresoc_m44");
    expect(serialized).not.toContain("rendered-report-body-do-not-print");
  });

  it("fails closed when the live scanner cannot return a clean result", async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const renderedBody = Buffer.from("%PDF-1.4\nscanner-fail-closed\n%%EOF\n", "utf8");
    const fetchImpl: typeof fetch = async (url, init) => {
      const urlText = url.toString();
      calls.push({ url: urlText, method: init?.method });

      if (urlText === "http://localhost:3002/render") {
        return new Response(renderedBody, {
          status: 200,
          headers: {
            "content-type": "application/pdf",
            "x-puresoc-renderer": "puresoc-report-renderer",
            "x-puresoc-content-sha256": sha256Hex(renderedBody)
          }
        });
      }

      if (urlText === "http://localhost:3310/scan") {
        return new Response(
          JSON.stringify({
            status: "failed",
            scannerName: "http-upload-scanner",
            scannedAt: "2026-05-02T10:00:00.000Z",
            findings: ["scanner_unreachable"]
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        );
      }

      throw new Error("storage must not be called after scanner failure");
    };

    const report = await runEvidenceRuntimeSmoke({
      config: runtimeConfig(),
      readiness: readyReadiness(),
      env: {
        PURESOC_EXTERNAL_SMOKE_MODE: "live_candidate",
        PURESOC_EXTERNAL_SMOKE_TARGET_KIND: "disposable",
        PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE: "true",
        PURESOC_EXTERNAL_SMOKE_STORAGE: "true",
        PURESOC_EXTERNAL_SMOKE_EVIDENCE_REPORTS: "true"
      },
      fetchImpl,
      now: () => new Date("2026-05-02T10:00:00.000Z"),
      idFactory: () => "m44-fail-closed"
    });

    expect(report.status).toBe("failed");
    expect(report.exitCode).toBe(1);
    expect(report.blockers).toContain("evidence_runtime_smoke_failed");
    expect(report.plannedOperations[1]).toMatchObject({
      id: "evidence_vault.upload_generated_report",
      status: "failed",
      metadata: {
        errorCode: "upload_rejected_by_scanner",
        statusCode: 422
      }
    });
    expect(calls.map((call) => call.method)).toEqual(["POST", "POST"]);
  });
});
