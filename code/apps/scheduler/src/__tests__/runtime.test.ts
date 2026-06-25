import { describe, expect, it } from "vitest";

import { loadConfig } from "@puresoc/config";
import {
  InMemoryNotificationRepository,
  InMemoryOutputRecordRepository,
  type StoredAnalysisRecordContract
} from "@puresoc/database";
import type { NotificationTransport, NotificationTransportInput } from "@puresoc/notifications";
import { InMemoryProviderResourceStore } from "@puresoc/providers-core";
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

  it("creates at most one daily dashboard snapshot per organization", async () => {
    const outputRepository = new InMemoryOutputRecordRepository();
    await outputRepository.saveStoredAnalysis(storedAnalysisRecord());
    const providerStore = new InMemoryProviderResourceStore({
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      idFactory: deterministicIds("provider")
    });
    await providerStore.createConnection({
      organizationId: ORG_ID,
      providerKey: "mock",
      displayName: "Healthy provider",
      status: "connected",
      readEnabled: true
    });
    await providerStore.createConnection({
      organizationId: ORG_ID,
      providerKey: "mock",
      displayName: "Degraded provider",
      status: "degraded",
      readEnabled: true
    });
    const scheduler = createSchedulerRuntime({
      config: loadConfig(),
      outputRepository,
      providerStore,
      now: () => new Date("2026-05-01T10:00:00.000Z"),
      idFactory: deterministicIds("dashboard_snapshot")
    });

    await scheduler.enqueueDashboardSnapshotJob({
      reason: "manual",
      scheduledAt: "2026-05-01T10:00:00.000Z"
    });
    const firstRun = await scheduler.runtime.runUntilIdle();
    await scheduler.enqueueDashboardSnapshotJob({
      reason: "manual",
      scheduledAt: "2026-05-01T12:00:00.000Z"
    });
    const secondRun = await scheduler.runtime.runUntilIdle();
    const snapshots = await outputRepository.listDashboardSnapshots(ORG_ID);

    expect(firstRun.results[0]?.job.result).toMatchObject({
      jobName: "dashboards.createDailySnapshots",
      dailyDate: "2026-05-01",
      createdCount: 1,
      skippedExistingCount: 0
    });
    expect(secondRun.results[0]?.job.result).toMatchObject({
      createdCount: 0,
      skippedExistingCount: 1
    });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.snapshot.trendMetrics).toMatchObject({
      overallScore: 50,
      controlsCompliant: 1,
      controlsTotal: 2,
      providerConnectionHealth: 1,
      gapCountBySeverity: {
        critical: 1,
        high: 1
      }
    });
  });

  it("applies notification preferences when dispatching scheduled deadline scans", async () => {
    const now = () => new Date("2026-06-14T09:00:00.000Z");
    const notificationRepository = new InMemoryNotificationRepository({
      now,
      evidenceExpiryCandidates: [
        {
          organizationId: ORG_ID,
          artifactId: "evidence-1",
          title: "Policy evidence",
          validUntil: "2026-06-21T09:05:00.000Z"
        }
      ]
    });
    await notificationRepository.createChannel({
      id: "channel-email",
      organizationId: ORG_ID,
      type: "email",
      destination: "alerts@example.test"
    });
    await notificationRepository.createDeadline({
      id: "deadline-1",
      organizationId: ORG_ID,
      sourceType: "incident_reporting",
      deadlineType: "early warning",
      deadlineAt: "2026-06-14T15:10:00.000Z"
    });
    const emailTransport = new CapturingNotificationTransport();
    const scheduler = createSchedulerRuntime({
      config: loadConfig(),
      notificationRepository,
      notificationTransports: {
        email: emailTransport
      },
      notificationPreferenceProvider: {
        getPreferences: async () => ({
          digestFrequency: "daily",
          suppressedCategories: [],
          mutedUntil: null
        })
      },
      now,
      idFactory: deterministicIds("notification_scan")
    });

    await scheduler.enqueueNotificationDeadlineScanJob({
      reason: "manual",
      scheduledAt: "2026-06-14T09:00:00.000Z"
    });
    const result = await scheduler.runtime.runUntilIdle();

    expect(result.results[0]?.job.result).toMatchObject({
      incidentDeadlineNotifications: 1,
      evidenceExpiryNotifications: 0,
      checklistOverdueNotifications: 0
    });
    expect(emailTransport.sends.map((send) => send.eventType)).toEqual(["INCIDENT_DEADLINE_APPROACHING"]);
  });

  it("dispatches due notification digests through the shared runtime", async () => {
    const now = () => new Date("2026-06-26T09:00:00.000Z");
    const notificationRepository = new InMemoryNotificationRepository({ now });
    await notificationRepository.createChannel({
      id: "channel-email",
      organizationId: ORG_ID,
      type: "email",
      destination: "alerts@example.test"
    });
    await notificationRepository.recordDigestItem({
      id: "digest-1",
      organizationId: ORG_ID,
      eventType: "EVIDENCE_EXPIRING",
      category: "evidence",
      payloadHash: "hash-1",
      payload: { count: 1 },
      digestFrequency: "daily",
      createdAt: "2026-06-25T08:30:00.000Z"
    });
    const emailTransport = new CapturingNotificationTransport();
    const scheduler = createSchedulerRuntime({
      config: loadConfig(),
      notificationRepository,
      notificationTransports: {
        email: emailTransport
      },
      notificationPreferenceProvider: {
        getPreferences: async () => ({
          digestFrequency: "daily",
          suppressedCategories: [],
          mutedUntil: null
        })
      },
      now,
      idFactory: deterministicIds("notification_digest")
    });

    await scheduler.enqueueNotificationDigestDispatchJob({
      reason: "manual",
      scheduledAt: "2026-06-26T09:00:00.000Z"
    });
    const result = await scheduler.runtime.runUntilIdle();

    expect(result.results[0]?.job.result).toMatchObject({
      attemptedDigests: 1,
      sentDigests: 1,
      deliveredItems: 1,
      skipped: []
    });
    expect(emailTransport.sends).toHaveLength(1);
    expect(emailTransport.sends[0]?.eventType).toBe("NOTIFICATION_DIGEST");
    expect(notificationRepository.digestItems.get("digest-1")?.status).toBe("delivered");
  });

  it("retries due notification delivery failures through the shared runtime", async () => {
    const now = () => new Date("2026-06-26T09:00:00.000Z");
    const notificationRepository = new InMemoryNotificationRepository({ now });
    await notificationRepository.createChannel({
      id: "channel-email",
      organizationId: ORG_ID,
      type: "email",
      destination: "alerts@example.test"
    });
    await notificationRepository.recordDeliveryRetryItem({
      id: "retry-1",
      organizationId: ORG_ID,
      channelId: "channel-email",
      eventType: "CRITICAL_GAP_DETECTED",
      payloadHash: "hash-1",
      payload: { controlName: "MFA" },
      attemptCount: 1,
      maxAttempts: 3,
      nextAttemptAt: "2026-06-26T08:59:00.000Z",
      lastError: "temporary transport failure",
      createdAt: "2026-06-26T08:58:00.000Z"
    });
    const emailTransport = new CapturingNotificationTransport();
    const scheduler = createSchedulerRuntime({
      config: loadConfig(),
      notificationRepository,
      notificationTransports: {
        email: emailTransport
      },
      now,
      idFactory: deterministicIds("notification_retry")
    });

    await scheduler.enqueueNotificationRetryDispatchJob({
      reason: "manual",
      scheduledAt: "2026-06-26T09:00:00.000Z"
    });
    const result = await scheduler.runtime.runUntilIdle();

    expect(result.results[0]?.job.result).toMatchObject({
      attempted: 1,
      sent: 1,
      rescheduled: 0,
      exhausted: 0
    });
    expect(emailTransport.sends).toHaveLength(1);
    expect(notificationRepository.deliveryRetries.get("retry-1")?.status).toBe("succeeded");
  });

  it("creates operator alerts when notification retry delivery exhausts through the shared runtime", async () => {
    const now = () => new Date("2026-06-26T09:00:00.000Z");
    const notificationRepository = new InMemoryNotificationRepository({ now });
    await notificationRepository.createChannel({
      id: "channel-email",
      organizationId: ORG_ID,
      type: "email",
      destination: "alerts@example.test"
    });
    await notificationRepository.recordDeliveryRetryItem({
      id: "retry-exhausted",
      organizationId: ORG_ID,
      channelId: "channel-email",
      eventType: "CRITICAL_GAP_DETECTED",
      payloadHash: "hash-exhausted",
      payload: { controlName: "MFA" },
      attemptCount: 2,
      maxAttempts: 3,
      nextAttemptAt: "2026-06-26T08:59:00.000Z",
      lastError: "temporary transport failure",
      createdAt: "2026-06-26T08:58:00.000Z"
    });
    const scheduler = createSchedulerRuntime({
      config: loadConfig(),
      notificationRepository,
      notificationTransports: {
        email: new FailingNotificationTransport("smtp still unavailable")
      },
      now,
      idFactory: deterministicIds("notification_operator_alert")
    });

    await scheduler.enqueueNotificationRetryDispatchJob({
      reason: "manual",
      scheduledAt: "2026-06-26T09:00:00.000Z"
    });
    const result = await scheduler.runtime.runUntilIdle();

    expect(result.results[0]?.job.result).toMatchObject({
      attempted: 1,
      sent: 0,
      rescheduled: 0,
      exhausted: 1,
      operatorAlerts: 1
    });
    expect(notificationRepository.deliveryRetries.get("retry-exhausted")?.status).toBe("failed");
    expect(await notificationRepository.listOperatorAlerts(ORG_ID)).toMatchObject([
      {
        alertType: "delivery_exhausted",
        status: "open",
        sourceRetryItemId: "retry-exhausted",
        eventType: "CRITICAL_GAP_DETECTED"
      }
    ]);
  });
});

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const ASSESSMENT_ID = "22222222-2222-4222-8222-222222222222";

const storedAnalysisRecord = (): StoredAnalysisRecordContract => ({
  organizationId: ORG_ID,
  assessmentId: ASSESSMENT_ID,
  jurisdiction: "EU",
  catalogVersion: "2026.04",
  recordedAt: "2026-05-01T09:00:00.000Z",
  results: [
    controlResult("nis2.risk.policy", "passing"),
    controlResult("nis2.access-control.mfa", "failing")
  ],
  gaps: [
    {
      id: `${ASSESSMENT_ID}:nis2.access-control.mfa:gap`,
      organizationId: ORG_ID,
      assessmentId: ASSESSMENT_ID,
      controlId: "nis2.access-control.mfa",
      controlCode: "NIS2.ACCESS-CONTROL.MFA",
      jurisdiction: "EU",
      status: "failing",
      severity: "critical",
      confidence: "high",
      summary: "MFA is not enforced for administrators.",
      findingIds: [],
      findings: [],
      missingEvidence: [],
      recommendedActions: [],
      providerSignals: [],
      manualTaskIds: [],
      manualTasks: [],
      countryPackWarnings: [],
      sourceReferences: []
    },
    {
      id: `${ASSESSMENT_ID}:nis2.incident.response:gap`,
      organizationId: ORG_ID,
      assessmentId: ASSESSMENT_ID,
      controlId: "nis2.incident.response",
      controlCode: "NIS2.INCIDENT.RESPONSE",
      jurisdiction: "EU",
      status: "needs_evidence",
      severity: "high",
      confidence: "medium",
      summary: "Incident response evidence is missing.",
      findingIds: [],
      findings: [],
      missingEvidence: [],
      recommendedActions: [],
      providerSignals: [],
      manualTaskIds: [],
      manualTasks: [],
      countryPackWarnings: [],
      sourceReferences: []
    }
  ],
  recommendations: [],
  readinessPlan: {
    id: `${ASSESSMENT_ID}:readiness-plan`,
    organizationId: ORG_ID,
    assessmentId: ASSESSMENT_ID,
    title: "PureSOC internal readiness plan",
    targetReadinessPercent: 100,
    status: "draft",
    generatedAt: "2026-05-01T09:00:00.000Z",
    items: []
  },
  evidenceArtifacts: []
});

const controlResult = (controlId: string, status: "failing" | "passing") => ({
  id: `${ASSESSMENT_ID}:${controlId}:EU`,
  organizationId: ORG_ID,
  assessmentId: ASSESSMENT_ID,
  controlId,
  controlCode: controlId.toUpperCase(),
  jurisdiction: "EU",
  status,
  confidence: "high" as const,
  providerSignalIds: [],
  evidenceArtifactIds: [],
  checklistRunItemIds: [],
  summary: `${controlId} ${status}`,
  matchedFindings: [],
  missingEvidence: [],
  manualTasks: [],
  countryPackWarnings: [],
  sourceReferences: [],
  evidenceCompleteness: {
    required: 1,
    present: status === "passing" ? 1 : 0,
    missing: status === "passing" ? 0 : 1,
    ratio: status === "passing" ? 1 : 0
  },
  evaluatedAt: "2026-05-01T09:00:00.000Z"
});

type FakeMetadataClient = RegulatorySourceMetadataCheckClient & {
  checkedSourceIds: string[];
};

class CapturingNotificationTransport implements NotificationTransport {
  readonly sends: NotificationTransportInput[] = [];

  async send(input: NotificationTransportInput): Promise<void> {
    this.sends.push(input);
  }
}

class FailingNotificationTransport implements NotificationTransport {
  constructor(private readonly message: string) {}

  async send(): Promise<void> {
    throw new Error(this.message);
  }
}

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
