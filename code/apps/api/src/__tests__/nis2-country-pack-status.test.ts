import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EU_MEMBER_STATE_COUNT } from "../../../../packages/database/src/index";
import { startApiServer } from "../server";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

describe("nis2 country-pack status API", () => {
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

  it("returns all EU Member State country-pack statuses", async () => {
    const response = await fetch(`${baseUrl}/compliance/nis2/country-packs/status`);

    expect(response.status).toBe(200);
    const body = await readJson<{
      frameworkKey: string;
      memberStateCount: number;
      countryPacks: Array<{
        countryCode: string;
        countryPackStatus: string;
        sourceActivationDefault: string;
      }>;
    }>(response);
    const plannedFullPack = body.countryPacks.find((status) => status.countryCode === "RO");

    expect(body.frameworkKey).toBe("nis2");
    expect(body.memberStateCount).toBe(EU_MEMBER_STATE_COUNT);
    expect(body.countryPacks).toHaveLength(EU_MEMBER_STATE_COUNT);
    expect(plannedFullPack?.countryPackStatus).toBe("planned_full_pack");
    expect(body.countryPacks.filter((status) => status.countryCode !== "RO").every((status) => status.countryPackStatus === "baseline_only")).toBe(true);
    expect(body.countryPacks.every((status) => status.sourceActivationDefault === "review_required")).toBe(true);
  });
});
