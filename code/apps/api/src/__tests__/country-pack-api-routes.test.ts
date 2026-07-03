import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("NIS2 country-pack API routes", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;

  beforeEach(() => {
    server = startApiServer(0, createApiServices());
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("lists EU, Romania, Poland, and Germany versioned country-pack metadata", async () => {
    const response = await fetch(`${baseUrl}/compliance/nis2/country-packs`);
    const body = await readJson<{
      countryPacks: Array<{
        countryCode: string;
        displayName: string;
        operationalDifferences: Array<{ area: string; key: string; reviewStatus: string }>;
        officialSources: Array<{ url: string }>;
        status: string;
      }>;
      frameworkKey: string;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.frameworkKey).toBe("nis2");
    expect(body.countryPacks.map((pack) => pack.countryCode).sort()).toEqual(["DE", "EU", "PL", "RO"]);
    expect(body.countryPacks.find((pack) => pack.countryCode === "RO")).toMatchObject({
      displayName: "Romania DNSC NIS2 demo pack",
      status: "demo"
    });
    expect(body.countryPacks.find((pack) => pack.countryCode === "PL")?.officialSources.map((source) => source.url)).toContain(
      "https://www.gov.pl/web/baza-wiedzy/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa"
    );
    expect(body.countryPacks.find((pack) => pack.countryCode === "PL")?.operationalDifferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          area: "registration",
          key: "pl.ksc.wykaz_registration_window",
          reviewStatus: "review_required"
        })
      ])
    );
    expect(body.countryPacks.find((pack) => pack.countryCode === "DE")?.operationalDifferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          area: "registration",
          key: "de.bsi.portal_exclusive_registration",
          reviewStatus: "review_required"
        }),
        expect.objectContaining({
          area: "authority_routing",
          key: "de.mip2.kritis_federal_transition",
          reviewStatus: "review_required"
        })
      ])
    );
  });

  it("classifies against a selected demo pack with legal-review caveats", async () => {
    const response = await fetch(`${baseUrl}/compliance/nis2/country-packs/PL/classification`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        employeeCount: 50,
        sector: "food"
      })
    });
    const body = await readJson<{
      classification: {
        confidence: string;
        legalReviewRequired: boolean;
        matchedRules: string[];
        result: string;
      };
      countryPack: {
        countryCode: string;
        status: string;
      };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.countryPack).toMatchObject({
      countryCode: "PL",
      status: "demo"
    });
    expect(body.classification).toMatchObject({
      confidence: "low",
      legalReviewRequired: true,
      result: "possibly_in_scope"
    });
    expect(body.classification.matchedRules).toContain("pl-demo-food-or-manufacturing");
  });

  it("rejects unknown country packs closed", async () => {
    const response = await fetch(`${baseUrl}/compliance/nis2/country-packs/NO`);
    const body = await readJson<{ error: { code: string; message: string } }>(response);

    expect(response.status).toBe(404);
    expect(body.error).toMatchObject({
      code: "invalid_request",
      message: "NIS2 country pack was not found."
    });
  });
});
