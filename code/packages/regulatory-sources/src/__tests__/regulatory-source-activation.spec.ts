import { describe, expect, it } from "vitest";

import {
  canAutoActivateRegulatoryChange,
  changedLegalLogicDefaultStatus,
  createRegulatoryReviewTaskSkeleton,
  determineSourceActivationStatus,
  InMemoryRegulatorySourceRepository,
  RegulatorySourceReviewService,
  regulatorySourceActivationLifecycle
} from "../index";

describe("regulatory source activation lifecycle", () => {
  it("declares the Phase D activation lifecycle states", () => {
    expect(regulatorySourceActivationLifecycle).toEqual([
      "draft",
      "validated",
      "review_required",
      "active",
      "superseded",
      "deprecated"
    ]);
  });

  it("defaults changed legal logic to review_required and never auto-activates it", () => {
    const changedLegalLogic = {
      validationPassed: true,
      containsLegalLogicChange: true
    };

    expect(changedLegalLogicDefaultStatus).toBe("review_required");
    expect(determineSourceActivationStatus(changedLegalLogic)).toBe("review_required");
    expect(canAutoActivateRegulatoryChange(changedLegalLogic)).toBe(false);
    expect(createRegulatoryReviewTaskSkeleton("source_1")).toMatchObject({
      assignedRoleKey: "regulatory_admin",
      status: "open",
      sourceRecordId: "source_1",
      createdForStatus: "review_required"
    });
  });

  it("persists changed imports as review_required with a review task", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    const service = new RegulatorySourceReviewService({
      repository,
      now: () => new Date("2026-04-30T09:00:00.000Z"),
      idFactory: deterministicIds("tasked")
    });

    const imported = await service.importSourceVersion({
      organizationId: "org_1",
      source: roWorkbookSource("source_ro"),
      sourceVersion: {
        id: "source_version_ro_v2_1",
        versionLabel: "V2.1 ENG_45915",
        contentHashSha256: "sha256-ro-workbook"
      },
      importValidationReport: {
        status: "validated",
        sourceMapCoverage: {
          passed: true
        }
      },
      sourceMapEntries: [
        {
          targetCollection: "classification_rules",
          targetKey: "rule_dns_tld",
          sourceLocation: "Algoritm clasificare!A4:H4",
          mappingJson: {
            sourceMapId: "ro-nis2-classification_rules-rule_dns_tld"
          }
        }
      ],
      evaluation: {
        validationPassed: true,
        containsLegalLogicChange: true
      }
    });

    expect(imported.source.activationStatus).toBe("review_required");
    expect(imported.sourceVersion.activationStatus).toBe("review_required");
    expect(imported.reviewTask).toMatchObject({
      organizationId: "org_1",
      assignedRoleKey: "regulatory_admin",
      status: "open",
      sourceVersionId: "source_version_ro_v2_1",
      createdForStatus: "review_required"
    });
  });

  it("activates reviewed source versions, preserves source maps, and keeps superseded versions readable", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    const service = new RegulatorySourceReviewService({
      repository,
      now: sequenceDates([
        "2026-04-30T09:00:00.000Z",
        "2026-04-30T10:00:00.000Z",
        "2026-04-30T11:00:00.000Z",
        "2026-04-30T12:00:00.000Z"
      ]),
      idFactory: deterministicIds("review")
    });

    await service.importSourceVersion({
      source: roWorkbookSource("source_ro"),
      sourceVersion: {
        id: "source_version_ro_v2_0",
        versionLabel: "V2.0_45898"
      },
      evaluation: {
        validationPassed: true,
        containsLegalLogicChange: false,
        reviewerApproved: true
      }
    });

    const importedChange = await service.importSourceVersion({
      organizationId: "org_1",
      source: roWorkbookSource("source_ro"),
      sourceVersion: {
        id: "source_version_ro_v2_1",
        versionLabel: "V2.1 ENG_45915"
      },
      importValidationReport: {
        status: "validated"
      },
      sourceMapEntries: [
        {
          targetCollection: "notification_fields",
          targetKey: "entity_legal_name",
          sourceLocation: "Notification form!D10",
          mappingJson: {
            sheet: "Notification form",
            cell: "D10"
          }
        }
      ],
      evaluation: {
        validationPassed: true,
        containsLegalLogicChange: true
      }
    });

    await service.markReviewed({
      taskId: importedChange.reviewTask?.id ?? "",
      actorUserId: "reviewer_1",
      notes: "Validated source-map coverage and workbook version metadata."
    });
    const activated = await service.activateReviewedSourceVersion({
      taskId: importedChange.reviewTask?.id ?? "",
      actorUserId: "reviewer_1"
    });
    const superseded = await repository.findSourceVersionById("source_version_ro_v2_0");
    const traceability = await service.getSourceMapTraceability("source_version_ro_v2_1");

    expect(activated.source.activeVersionId).toBe("source_version_ro_v2_1");
    expect(activated.sourceVersion.activationStatus).toBe("active");
    expect(superseded).toMatchObject({
      id: "source_version_ro_v2_0",
      activationStatus: "superseded",
      supersededByVersionId: "source_version_ro_v2_1"
    });
    expect(traceability.sourceMapEntries).toHaveLength(1);
    expect(traceability.sourceMapEntries[0]).toMatchObject({
      targetCollection: "notification_fields",
      sourceLocation: "Notification form!D10"
    });
    expect(traceability.reviewDecisions.map((decision) => decision.decision)).toEqual(["reviewed", "activated"]);
  });

  it("creates source-monitor review tasks without activating legal logic", async () => {
    const repository = new InMemoryRegulatorySourceRepository();
    const service = new RegulatorySourceReviewService({
      repository,
      now: () => new Date("2026-04-30T09:00:00.000Z"),
      idFactory: deterministicIds("monitor")
    });

    await repository.upsertSource({
      ...roWorkbookSource("source_ro"),
      status: "active",
      activationStatus: "active",
      activeVersionId: "source_version_ro_v2_0"
    });
    await repository.saveSourceVersion({
      id: "source_version_ro_v2_0",
      sourceId: "source_ro",
      versionLabel: "V2.0_45898",
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

    const task = await service.createSourceMonitorReviewTask({
      organizationId: "org_1",
      sourceId: "source_ro",
      sourceVersionId: "source_version_ro_v2_0",
      monitorStatus: "needs_review",
      reason: "Source monitor detected a changed workbook hash."
    });
    const activeVersion = await repository.findActiveSourceVersion("source_ro");
    const source = await repository.findSourceById("source_ro");

    expect(task).toMatchObject({
      status: "open",
      createdForStatus: "needs_review",
      assignedRoleKey: "regulatory_admin"
    });
    expect(activeVersion?.activationStatus).toBe("active");
    expect(source?.status).toBe("needs_review");
  });

  it("rejects secondary trackers stored as primary legal truth", async () => {
    const service = new RegulatorySourceReviewService({
      repository: new InMemoryRegulatorySourceRepository()
    });

    await expect(
      service.importSourceVersion({
        source: {
          ...roWorkbookSource("source_secondary"),
          sourceType: "secondary_tracker",
          trustLevel: "primary",
          title: "Secondary transposition tracker"
        },
        sourceVersion: {
          id: "source_version_secondary",
          versionLabel: "tracker-2026-04"
        },
        evaluation: {
          validationPassed: true,
          containsLegalLogicChange: true
        }
      })
    ).rejects.toMatchObject({
      code: "invalid_source"
    });
  });
});

const roWorkbookSource = (id: string) => ({
  id,
  frameworkKey: "nis2" as const,
  jurisdiction: "RO",
  sourceType: "internal_excel_seed" as const,
  title: "nis2ro-tool-v-2-1.xlsx",
  localFilePath: "data/regulatory/countries/ro/nis2ro-tool-v-2-1.xlsx",
  publicationDate: null,
  lastCheckedAt: "2026-04-30T00:00:00.000Z",
  versionLabel: "V2.1 ENG_45915",
  authorityName: "DNSC",
  trustLevel: "internal_seed" as const,
  activeVersionId: null,
  notes: "Generated workbook seed; legal activation requires review."
});

const deterministicIds = (prefix: string) => {
  let next = 0;
  return () => `${prefix}_${(next += 1).toString().padStart(3, "0")}`;
};

const sequenceDates = (dates: string[]) => {
  let next = 0;
  return () => new Date(dates[Math.min(next++, dates.length - 1)] ?? dates.at(-1) ?? "2026-04-30T00:00:00.000Z");
};
