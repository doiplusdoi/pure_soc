import { describe, expect, it } from "vitest";

import {
  InMemoryRegulatorySourceRepository,
  type RegulatorySourceMetadataCheckClient,
  type RegulatorySourceMetadataCheckResult,
  type RegulatorySourceRecord
} from "@puresoc/regulatory-sources";
import { regulatorySourceMonitorJobName, runRegulatorySourceMonitorJob } from "../index";

describe("scheduler regulatory source monitor job", () => {
  it("runs the source monitor once through the scheduler-facing contract", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    await seedActiveSource(repository, sourceRecord("source_eu"));
    const metadataClient = fakeMetadataClient({
      source_eu: {
        outcome: "unreachable",
        statusCode: 503,
        errorCode: "http_status"
      }
    });

    const result = await runRegulatorySourceMonitorJob({
      repository,
      metadataClient,
      config: {
        enabled: true,
        requestTimeoutMs: 250,
        staleAfterDays: 90,
        reviewTaskOrganizationId: null
      },
      now: () => new Date("2026-05-01T09:00:00.000Z"),
      idFactory: deterministicIds("scheduler_monitor")
    });

    expect(regulatorySourceMonitorJobName).toBe("regulatory.monitorCountrySources");
    expect(result).toMatchObject({
      jobName: "regulatory.monitorCountrySources",
      enabled: true,
      checkedSourceCount: 1,
      reviewTaskCount: 1
    });
    expect(result.results[0]).toMatchObject({
      sourceId: "source_eu",
      action: "review_task_created",
      monitorStatus: "unreachable"
    });
    expect(metadataClient.checkedSourceIds).toEqual(["source_eu"]);
  });

  it("honors disabled config without checking sources", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    await seedActiveSource(repository, sourceRecord("source_eu"));
    const metadataClient = fakeMetadataClient({
      source_eu: {
        outcome: "reachable",
        statusCode: 200
      }
    });

    const result = await runRegulatorySourceMonitorJob({
      repository,
      metadataClient,
      config: {
        enabled: false,
        requestTimeoutMs: 250,
        staleAfterDays: 90,
        reviewTaskOrganizationId: null
      },
      now: () => new Date("2026-05-01T09:00:00.000Z")
    });

    expect(result).toMatchObject({
      enabled: false,
      checkedSourceCount: 0,
      reviewTaskCount: 0,
      results: []
    });
    expect(metadataClient.checkedSourceIds).toEqual([]);
  });
});

type FakeMetadataClient = RegulatorySourceMetadataCheckClient & {
  checkedSourceIds: string[];
};

const fakeMetadataClient = (results: Record<string, RegulatorySourceMetadataCheckResult>): FakeMetadataClient => {
  const checkedSourceIds: string[] = [];
  return {
    checkedSourceIds,
    async check(input) {
      checkedSourceIds.push(input.source.id);
      const result = results[input.source.id];
      if (!result) {
        throw new Error(`Missing fake metadata result for ${input.source.id}`);
      }

      return result;
    }
  };
};

const sourceRecord = (id: string): RegulatorySourceRecord => ({
  id,
  frameworkKey: "nis2",
  jurisdiction: "EU",
  sourceType: "directive",
  title: `Source ${id}`,
  url: `https://example.test/${id}`,
  localFilePath: null,
  publicationDate: null,
  lastCheckedAt: "2026-04-29T09:00:00.000Z",
  versionLabel: "2026-04",
  authorityName: "European Commission",
  trustLevel: "primary",
  status: "active",
  activationStatus: "active",
  activeVersionId: `version_${id}`,
  notes: null
});

const seedActiveSource = async (
  repository: InMemoryRegulatorySourceRepository,
  source: RegulatorySourceRecord
) => {
  await repository.upsertSource(source);
  await repository.saveSourceVersion({
    id: source.activeVersionId ?? `version_${source.id}`,
    sourceId: source.id,
    versionLabel: source.versionLabel ?? "2026-04",
    contentHashSha256: "sha256-current",
    activationStatus: "active",
    validationStatus: "validated",
    metadataJson: {},
    importValidationReportJson: {},
    activatedAt: "2026-04-29T09:00:00.000Z",
    activatedBy: "reviewer_1",
    supersededAt: null,
    supersededByVersionId: null,
    createdAt: "2026-04-29T08:00:00.000Z"
  });
};

const deterministicIds = (prefix: string) => {
  let next = 0;
  return () => `${prefix}_${(next += 1).toString().padStart(3, "0")}`;
};
