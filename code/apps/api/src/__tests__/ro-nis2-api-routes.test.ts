import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startApiServer } from "../server";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("ro nis2 API routes", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;

  beforeEach(() => {
    server = startApiServer(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("returns the Romania onboarding schema without embedding classifier logic in the route", async () => {
    const response = await fetch(`${baseUrl}/compliance/nis2/ro/onboarding/schema`);
    const body = await readJson<{
      frameworkKey: string;
      jurisdiction: string;
      schema: Array<{ key: string; sourceMapIds: string[] }>;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.jurisdiction).toBe("RO");
    expect(body.frameworkKey).toBe("nis2");
    expect(body.schema.find((step) => step.key === "services")?.sourceMapIds[0]).toBe(
      "ro-nis2-service_options-none_of_oug_155_2024_services"
    );
  });

  it("delegates Romania classification to the country-pack service", async () => {
    const response = await fetch(`${baseUrl}/compliance/nis2/ro/classification`, {
      body: JSON.stringify({
        relationship: {
          establishedInRomania: true
        },
        selectedServiceTypeCodes: ["101101"],
        sizeCategory: "medium"
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });
    const body = await readJson<{ classification: { result: string; sourceMapLinks: Array<{ sourceMapId: string }> } }>(
      response
    );

    expect(response.status).toBe(200);
    expect(body.classification.result).toBe("important_entity");
    expect(body.classification.sourceMapLinks.map((link) => link.sourceMapId)).toContain(
      "ro-nis2-classification_rules-classification_rule_9_energie_transport_bancar_financiar_sanatate_potabila_uzate_spatial_ixp"
    );
  });
});
