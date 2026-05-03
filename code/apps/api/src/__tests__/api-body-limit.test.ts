import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import type { BillingRuntimeConfig } from "@puresoc/billing-core";
import { loadConfig } from "@puresoc/config";
import type {
  ObjectStorageAdapter,
  ObjectStorageGetInput,
  ObjectStoragePutInput,
  ObjectStoragePutResult,
  ObjectStorageReadResult,
  UploadScanInput,
  UploadScanResult,
  UploadScanningHook
} from "@puresoc/evidence";
import { createApiServices } from "../auth/services";
import { parseJsonBody, parseRawBody } from "../http";
import { startApiServer } from "../server";

const password = "CorrectHorseBatteryStaple42!";

type CreateServicesOptions = NonNullable<Parameters<typeof createApiServices>[0]>;

const stripeBillingConfig: BillingRuntimeConfig = {
  provider: "stripe",
  defaultPlanKey: "base",
  noneProviderPlanKey: "base",
  stripe: {
    apiBaseUrl: "https://api.stripe.com/v1",
    secretKey: "sk_test_safe",
    webhookSecret: "whsec_test",
    checkoutSuccessUrl: "https://app.example.test/billing/success",
    checkoutCancelUrl: "https://app.example.test/billing/cancel",
    portalReturnUrl: "https://app.example.test/billing",
    priceIdsByPlan: {
      base: ["price_base"]
    }
  },
  plans: [
    {
      key: "base",
      displayName: "Base",
      entitlementKeys: ["nis2_eu_portal", "evidence_vault"]
    }
  ]
};

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("api request body and evidence upload limits", () => {
  let server: ReturnType<typeof startApiServer> | undefined;
  let baseUrl = "";
  let services: ReturnType<typeof createApiServices>;

  afterEach(async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("rejects oversized JSON requests with a stable 413 error", async () => {
    boot({
      PURESOC_API_MAX_JSON_BODY_BYTES: "64"
    });

    const response = await postJson("/auth/register", {
      email: "body-limit@example.test",
      password,
      displayName: "A".repeat(128)
    });

    expect(response.status).toBe(413);
    const body = await readJson<{ error: { code: string; message: string } }>(response);
    expect(body.error.code).toBe("payload_too_large");
    expect(JSON.stringify(body)).not.toContain(password);
  });

  it("enforces content-length early and still stops misleading chunked bodies", async () => {
    await expect(
      parseRawBody(makeRequest([], { "content-length": "128" }), {
        maxBytes: 16
      })
    ).rejects.toMatchObject({
      code: "payload_too_large",
      statusCode: 413
    });

    await expect(
      parseJsonBody(makeRequest([Buffer.from("{\"a\":\""), Buffer.from("123456789\"}")], { "content-length": "1" }), {
        maxBytes: 8
      })
    ).rejects.toMatchObject({
      code: "payload_too_large",
      statusCode: 413
    });
  });

  it("rejects oversized Stripe webhook raw bodies before billing side effects", async () => {
    boot(
      {
        PURESOC_STRIPE_WEBHOOK_MAX_RAW_BODY_BYTES: "32"
      },
      {
        billingConfig: stripeBillingConfig
      }
    );
    const payload = JSON.stringify(stripeEvent("evt_too_large", "org_body_limit", "x".repeat(128)));

    const response = await postRawWebhook(payload, sign(payload));

    expect(response.status).toBe(413);
    const body = await readJson<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("payload_too_large");
    expect(services.memoryRepositories.billingRepository.billingEvents.size).toBe(0);
    expect(services.auditSink.findByAction("billing_changed")).toHaveLength(0);
    expect(JSON.stringify(body)).not.toContain("whsec_test");
  });

  it("rejects oversized decoded evidence uploads before scan, storage, artifacts, or audit", async () => {
    const scanner = new TrackingScanner();
    const storage = new TrackingStorage();
    boot(
      {
        PURESOC_API_MAX_JSON_BODY_BYTES: "4096",
        PURESOC_EVIDENCE_MAX_UPLOAD_BYTES: "4"
      },
      {
        uploadScanner: scanner,
        evidenceStorage: storage
      }
    );
    const owner = await registerAndLogin("evidence-limit@example.test");
    const { organization } = await createOrganization(owner.cookie);

    const response = await postJson(
      `/organizations/${organization.id}/evidence/upload`,
      {
        title: "Oversized evidence",
        content: Buffer.from("12345", "utf8").toString("base64"),
        contentEncoding: "base64",
        mimeType: "text/plain",
        sourceType: "manual_upload"
      },
      owner.cookie
    );

    expect(response.status).toBe(413);
    const body = await readJson<{ error: { code: string; message: string } }>(response);
    expect(body.error.code).toBe("payload_too_large");
    expect(JSON.stringify(body)).not.toContain("MTIzNDU=");
    expect(scanner.scanCalls).toBe(0);
    expect(storage.putCalls).toBe(0);
    expect(services.memoryRepositories.evidenceRepository.artifacts.size).toBe(0);
    expect(services.memoryRepositories.evidenceRepository.accessLogs).toHaveLength(0);
    expect(services.auditSink.findByAction("evidence_uploaded")).toHaveLength(0);
  });

  const boot = (
    env: NodeJS.ProcessEnv = {},
    overrides: CreateServicesOptions = {}
  ) => {
    services = createApiServices({
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      config: loadConfig({ env }),
      ...overrides
    });
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  };

  const postJson = (path: string, body: unknown, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {})
      },
      body: JSON.stringify(body)
    });

  const registerAndLogin = async (email: string) => {
    const registerResponse = await postJson("/auth/register", {
      email,
      password,
      displayName: "Body Limit User"
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await postJson("/auth/login", {
      email,
      password
    });
    expect(loginResponse.status).toBe(200);

    return {
      cookie: loginResponse.headers.get("set-cookie") ?? ""
    };
  };

  const createOrganization = async (cookie: string) => {
    const response = await postJson(
      "/organizations",
      {
        name: "Body Limit Org",
        primaryCountryCode: "RO"
      },
      cookie
    );
    expect(response.status).toBe(201);
    return readJson<{ organization: { id: string } }>(response);
  };

  const postRawWebhook = (payload: string, signature: string) =>
    fetch(`${baseUrl}/billing/stripe/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature
      },
      body: payload
    });
});

const makeRequest = (chunks: Buffer[], headers: Record<string, string> = {}): IncomingMessage =>
  Object.assign(Readable.from(chunks), { headers }) as IncomingMessage;

const stripeEvent = (eventId: string, organizationId: string, filler: string): Record<string, unknown> => ({
  id: eventId,
  type: "customer.subscription.updated",
  created: 1_777_550_400,
  data: {
    object: {
      id: "sub_123",
      object: "subscription",
      customer: "cus_123",
      status: "active",
      metadata: {
        organization_id: organizationId,
        filler
      }
    }
  }
});

const sign = (payload: string): string => {
  const timestamp = 1_777_550_400;
  const signature = createHmac("sha256", "whsec_test").update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
};

class TrackingScanner implements UploadScanningHook {
  scanCalls = 0;

  async scan(_input: UploadScanInput): Promise<UploadScanResult> {
    this.scanCalls += 1;
    return {
      status: "clean",
      scannerName: "tracking-scanner",
      scannedAt: "2026-05-01T10:00:00.000Z",
      findings: []
    };
  }
}

class TrackingStorage implements ObjectStorageAdapter {
  putCalls = 0;

  async putObject(_input: ObjectStoragePutInput): Promise<ObjectStoragePutResult> {
    this.putCalls += 1;
    return {
      storageUri: "object://evidence/org/artifact",
      sizeBytes: 0
    };
  }

  async readObject(_input: ObjectStorageGetInput): Promise<ObjectStorageReadResult> {
    throw new Error("TrackingStorage readObject is not implemented for this test.");
  }
}
