import { describe, expect, it } from "vitest";

import {
  InMemoryRegulatorySourceRepository,
  RegulatorySourceMonitorService,
  type RegulatorySourceMetadataCheckClient,
  type RegulatorySourceMetadataCheckInput,
  type RegulatorySourceMetadataCheckResult,
  type RegulatorySourceRecord
} from "../index";

describe("regulatory source monitor", () => {
  it("does nothing when the monitor is disabled", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    await seedActiveSource(repository, sourceRecord("source_eu"));
    const client = fakeMetadataClient({
      source_eu: reachableMetadata()
    });
    const monitor = createMonitor(repository, client, {
      enabled: false
    });

    const result = await monitor.runOnce();

    expect(result).toMatchObject({
      jobName: "regulatory.monitorCountrySources",
      enabled: false,
      checkedSourceCount: 0,
      reviewTaskCount: 0,
      results: []
    });
    expect(client.checkedSourceIds).toEqual([]);
    expect(await repository.listReviewTasks({ status: "open" })).toEqual([]);
  });

  it("updates reachable unchanged sources without creating activation work", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    await seedActiveSource(repository, sourceRecord("source_eu"), {
      metadataJson: {
        sourceMonitor: {
          etag: "\"v1\"",
          lastModified: "Wed, 29 Apr 2026 09:00:00 GMT"
        }
      }
    });
    const client = fakeMetadataClient({
      source_eu: reachableMetadata({
        etag: "\"v1\"",
        lastModified: "Wed, 29 Apr 2026 09:00:00 GMT"
      })
    });
    const monitor = createMonitor(repository, client);

    const result = await monitor.runOnce();
    const source = await repository.findSourceById("source_eu");
    const activeVersion = await repository.findActiveSourceVersion("source_eu");

    expect(result.reviewTaskCount).toBe(0);
    expect(result.results[0]).toMatchObject({
      action: "reachable_checked",
      metadataChanged: false,
      stale: false,
      reachable: true
    });
    expect(source).toMatchObject({
      status: "active",
      lastCheckedAt: "2026-05-01T09:00:00.000Z"
    });
    expect(activeVersion?.activationStatus).toBe("active");
    expect(await repository.listReviewTasks({ status: "open" })).toEqual([]);
  });

  it("creates an unreachable review task without activating legal logic", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    await seedActiveSource(repository, sourceRecord("source_eu"));
    const client = fakeMetadataClient({
      source_eu: {
        outcome: "unreachable",
        statusCode: 503,
        errorCode: "http_status"
      }
    });
    const monitor = createMonitor(repository, client);

    const result = await monitor.runOnce();
    const tasks = await repository.listReviewTasks({ status: "open" });
    const source = await repository.findSourceById("source_eu");
    const activeVersion = await repository.findActiveSourceVersion("source_eu");

    expect(result.results[0]).toMatchObject({
      action: "review_task_created",
      monitorStatus: "unreachable",
      reachable: false
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      assignedRoleKey: "regulatory_admin",
      createdForStatus: "unreachable",
      organizationId: "org_regulatory_ops",
      sourceId: "source_eu",
      status: "open"
    });
    expect(source?.status).toBe("unreachable");
    expect(activeVersion?.activationStatus).toBe("active");
  });

  it("creates a stale review task for sources outside the freshness threshold", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    await seedActiveSource(repository, sourceRecord("source_eu", "2026-01-01T00:00:00.000Z"));
    const client = fakeMetadataClient({
      source_eu: reachableMetadata()
    });
    const monitor = createMonitor(repository, client, {
      staleAfterDays: 30
    });

    const result = await monitor.runOnce();
    const tasks = await repository.listReviewTasks({ status: "open" });
    const source = await repository.findSourceById("source_eu");

    expect(result.results[0]).toMatchObject({
      action: "review_task_created",
      monitorStatus: "stale",
      stale: true,
      reachable: true
    });
    expect(tasks[0]).toMatchObject({
      createdForStatus: "stale",
      sourceVersionId: "version_source_eu"
    });
    expect(source).toMatchObject({
      status: "stale",
      lastCheckedAt: "2026-01-01T00:00:00.000Z"
    });
  });

  it("creates a needs_review task when metadata indicators change", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    await seedActiveSource(repository, sourceRecord("source_eu"), {
      contentHashSha256: "sha256-old",
      metadataJson: {
        sourceMonitor: {
          etag: "\"old\""
        }
      }
    });
    const client = fakeMetadataClient({
      source_eu: reachableMetadata({
        etag: "\"new\"",
        contentHashSha256: "sha256-new"
      })
    });
    const monitor = createMonitor(repository, client);

    const result = await monitor.runOnce();
    const tasks = await repository.listReviewTasks({ status: "open" });
    const activeVersion = await repository.findActiveSourceVersion("source_eu");

    expect(result.results[0]).toMatchObject({
      action: "review_task_created",
      monitorStatus: "needs_review",
      metadataChanged: true
    });
    expect(tasks[0]).toMatchObject({
      createdForStatus: "needs_review",
      metadataJson: {
        monitorStatus: "needs_review",
        monitorCreatedLegalLogic: false
      }
    });
    expect(tasks[0]?.metadataJson).toMatchObject({
      metadata: {
        changedSignals: ["etag", "content_hash_sha256"]
      }
    });
    expect(activeVersion?.activationStatus).toBe("active");
  });

  it("treats request timeout as unreachable review work", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    await seedActiveSource(repository, sourceRecord("source_eu"));
    const client = fakeMetadataClient({
      source_eu: {
        outcome: "unreachable",
        errorCode: "timeout"
      }
    });
    const monitor = createMonitor(repository, client);

    const result = await monitor.runOnce();
    const tasks = await repository.listReviewTasks({ status: "open" });

    expect(result.results[0]).toMatchObject({
      action: "review_task_created",
      monitorStatus: "unreachable"
    });
    expect(tasks[0]?.metadataJson).toMatchObject({
      metadata: {
        errorCode: "timeout"
      }
    });
  });

  it("does not create duplicate open tasks for the same source and monitor status", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    await seedActiveSource(repository, sourceRecord("source_eu"));
    const client = fakeMetadataClient({
      source_eu: {
        outcome: "unreachable",
        statusCode: 500,
        errorCode: "http_status"
      }
    });
    const monitor = createMonitor(repository, client);

    const firstRun = await monitor.runOnce();
    const secondRun = await monitor.runOnce();
    const tasks = await repository.listReviewTasks({ status: "open" });

    expect(firstRun.results[0]?.action).toBe("review_task_created");
    expect(secondRun.results[0]?.action).toBe("review_task_existing");
    expect(tasks).toHaveLength(1);
  });
});

const createMonitor = (
  repository: InMemoryRegulatorySourceRepository,
  metadataClient: FakeMetadataClient,
  overrides: Partial<{
    enabled: boolean;
    requestTimeoutMs: number;
    staleAfterDays: number;
    reviewTaskOrganizationId: string | null;
  }> = {}
) =>
  new RegulatorySourceMonitorService({
    repository,
    metadataClient,
    config: {
      enabled: true,
      requestTimeoutMs: 1000,
      staleAfterDays: 90,
      reviewTaskOrganizationId: "org_regulatory_ops",
      ...overrides
    },
    now: () => new Date("2026-05-01T09:00:00.000Z"),
    idFactory: deterministicIds("monitor")
  });

type FakeMetadataClient = RegulatorySourceMetadataCheckClient & {
  checkedSourceIds: string[];
};

const fakeMetadataClient = (results: Record<string, RegulatorySourceMetadataCheckResult>): FakeMetadataClient => {
  const checkedSourceIds: string[] = [];
  return {
    checkedSourceIds,
    async check(input: RegulatorySourceMetadataCheckInput): Promise<RegulatorySourceMetadataCheckResult> {
      checkedSourceIds.push(input.source.id);
      const result = results[input.source.id];
      if (!result) {
        throw new Error(`Missing fake metadata result for ${input.source.id}`);
      }

      return result;
    }
  };
};

const reachableMetadata = (
  overrides: Partial<Extract<RegulatorySourceMetadataCheckResult, { outcome: "reachable" }>> = {}
): RegulatorySourceMetadataCheckResult => ({
  outcome: "reachable",
  statusCode: 200,
  ...overrides
});

const sourceRecord = (
  id: string,
  lastCheckedAt = "2026-04-29T09:00:00.000Z"
): RegulatorySourceRecord => ({
  id,
  frameworkKey: "nis2",
  jurisdiction: "EU",
  sourceType: "directive",
  title: `Source ${id}`,
  url: `https://example.test/${id}`,
  localFilePath: null,
  publicationDate: null,
  lastCheckedAt,
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
  source: RegulatorySourceRecord,
  versionOverrides: Partial<{
    contentHashSha256: string | null;
    metadataJson: Record<string, unknown>;
  }> = {}
) => {
  await repository.upsertSource(source);
  await repository.saveSourceVersion({
    id: source.activeVersionId ?? `version_${source.id}`,
    sourceId: source.id,
    versionLabel: source.versionLabel ?? "2026-04",
    contentHashSha256: versionOverrides.contentHashSha256 ?? "sha256-current",
    activationStatus: "active",
    validationStatus: "validated",
    metadataJson: versionOverrides.metadataJson ?? {},
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
