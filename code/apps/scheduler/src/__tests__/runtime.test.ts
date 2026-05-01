import { describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import {
  InMemoryRegulatorySourceRepository,
  type RegulatorySourceMetadataCheckClient,
  type RegulatorySourceMetadataCheckResult,
  type RegulatorySourceRecord
} from "@puresoc/regulatory-sources";

import { createSchedulerRuntime } from "../runtime";

describe("scheduler job runtime", () => {
  it("dispatches the regulatory source monitor through the shared runtime", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    await seedActiveSource(repository, sourceRecord("source_runtime"));
    const metadataClient = fakeMetadataClient({
      source_runtime: {
        outcome: "unreachable",
        statusCode: 503,
        errorCode: "http_status"
      }
    });
    const scheduler = createSchedulerRuntime({
      config: loadConfig({
        env: {
          REGULATORY_SOURCE_MONITOR_ENABLED: "true"
        }
      }),
      repository,
      metadataClient,
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      idFactory: deterministicIds("scheduler_job")
    });

    const dispatch = await scheduler.enqueueRegulatorySourceMonitorJob({
      reason: "startup",
      scheduledAt: "2026-05-01T10:00:00.000Z"
    });
    const result = await scheduler.runtime.runUntilIdle();

    expect(dispatch.status).toBe("enqueued");
    expect(result).toMatchObject({
      status: "idle",
      processedCount: 1
    });
    expect(result.results[0]?.job.result).toMatchObject({
      jobName: "regulatory.monitorCountrySources",
      enabled: true,
      checkedSourceCount: 1,
      reviewTaskCount: 1,
      results: [
        {
          sourceId: "source_runtime",
          action: "review_task_created",
          monitorStatus: "unreachable"
        }
      ]
    });
    expect(metadataClient.checkedSourceIds).toEqual(["source_runtime"]);
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
