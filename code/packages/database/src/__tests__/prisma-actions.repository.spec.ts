import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { ActionRun, ActionTemplate } from "@puresoc/recommendations";
import { PrismaActionRepository, type PrismaActionClient } from "../index";

describe("PrismaActionRepository", () => {
  it("persists action templates and runs with safety-state metadata and organization scoping", async () => {
    const client = createFakeActionClient();
    const repository = new PrismaActionRepository(client);
    const organizationId = randomUUID();
    const otherOrganizationId = randomUUID();
    const template: ActionTemplate = {
      id: randomUUID(),
      organizationId,
      providerKey: "mock",
      moduleKey: "identity",
      actionKey: "ca_report_only_legacy_auth_block",
      actionType: "technical",
      automationMode: "preflightable",
      title: "Prepare report-only legacy authentication block",
      riskLevel: "medium",
      licenseRequired: ["entra_id_p1"],
      permissionsRequired: ["Policy.ReadWrite.ConditionalAccess"],
      preconditions: {
        reportOnly: true
      },
      expectedChange: "A report-only policy draft is prepared for review.",
      blastRadius: "No tenant enforcement occurs in M9.",
      rollbackStrategy: "Discard the draft policy.",
      manualFallback: "Document the manual Conditional Access review and attach approval evidence.",
      evidenceRequired: true,
      enabledByDefault: false,
      highRiskForbiddenInV1: false,
      sourceReferences: [],
      createdAt: "2026-04-30T12:00:00.000Z",
      updatedAt: "2026-04-30T12:00:00.000Z"
    };
    const run: ActionRun = {
      id: randomUUID(),
      organizationId,
      providerConnectionId: randomUUID(),
      recommendationId: randomUUID(),
      actionTemplateId: template.id,
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      providerKey: "mock",
      moduleKey: "identity",
      actionKey: template.actionKey,
      actionType: "technical",
      automationMode: "preflightable",
      title: template.title,
      riskLevel: "medium",
      licenseRequired: template.licenseRequired,
      permissionsRequired: template.permissionsRequired,
      preconditions: template.preconditions,
      expectedChange: template.expectedChange,
      blastRadius: template.blastRadius,
      rollbackStrategy: template.rollbackStrategy,
      manualFallback: template.manualFallback,
      evidenceRequired: true,
      highRiskForbiddenInV1: false,
      status: "queued",
      approval: {
        status: "approved",
        requestedBy: randomUUID(),
        requestedAt: "2026-04-30T12:01:00.000Z",
        approvedBy: randomUUID(),
        approvedAt: "2026-04-30T12:02:00.000Z"
      },
      preflightStatus: "passed",
      preflightResult: {
        status: "passed",
        checkedAt: "2026-04-30T12:01:00.000Z",
        checks: [
          {
            code: "approval_model_present",
            status: "passed",
            message: "Approval model is available."
          }
        ],
        requiredPermissions: template.permissionsRequired,
        requiredLicense: template.licenseRequired,
        canRequestApproval: true
      },
      preStateSnapshot: {
        evidenceArtifactId: randomUUID(),
        sourceType: "action_pre_state",
        capturedAt: "2026-04-30T12:03:00.000Z",
        providerConnectionId: randomUUID(),
        resourceRefs: ["conditional_access_policies"]
      },
      verificationStatus: "not_run",
      evidenceArtifactIds: [randomUUID()],
      checklistTaskIds: [],
      workerJob: {
        jobName: "actions.execute",
        actionRunId: "",
        organizationId,
        providerConnectionId: "",
        providerKey: "mock",
        actionKey: template.actionKey,
        queuedByUserId: randomUUID(),
        queuedAt: "2026-04-30T12:04:00.000Z",
        safetyGates: {
          preflightPassed: true,
          approvalGranted: true,
          preStateSnapshotSaved: true,
          providerWriteEnabledChecked: false
        }
      },
      sourceReferences: [],
      createdAt: "2026-04-30T12:00:00.000Z",
      updatedAt: "2026-04-30T12:04:00.000Z"
    };
    run.workerJob = {
      ...run.workerJob!,
      actionRunId: run.id,
      providerConnectionId: run.providerConnectionId
    };

    await repository.saveTemplate(template);
    await repository.saveActionRun(run);

    const foundTemplate = await repository.findTemplateForOrganization({
      organizationId,
      actionTemplateId: template.id
    });
    const foundRun = await repository.findActionRunForOrganization({
      organizationId,
      actionRunId: run.id
    });
    const otherRun = await repository.findActionRunForOrganization({
      organizationId: otherOrganizationId,
      actionRunId: run.id
    });
    const listed = await repository.listActionRuns(organizationId);

    expect(foundTemplate).toMatchObject({
      id: template.id,
      actionKey: template.actionKey,
      enabledByDefault: false,
      highRiskForbiddenInV1: false
    });
    expect(foundRun).toMatchObject({
      id: run.id,
      organizationId,
      status: "queued",
      approval: {
        status: "approved"
      },
      preflightStatus: "passed",
      verificationStatus: "not_run",
      controlId: "nis2.access-control.mfa"
    });
    expect(foundRun?.workerJob).toMatchObject({
      jobName: "actions.execute",
      safetyGates: {
        preflightPassed: true
      }
    });
    expect(otherRun).toBeNull();
    expect(listed).toHaveLength(1);
  });
});

const createFakeActionClient = (): PrismaActionClient => ({
  providerActionTemplate: createDelegate(),
  providerActionRun: createDelegate()
});

const createDelegate = <TRow extends Record<string, unknown>>() => {
  const rows = new Map<string, TRow>();

  return {
    async upsert(args: Record<string, unknown>) {
      const where = args.where as { id: string };
      const data = (rows.has(where.id) ? args.update : args.create) as TRow;
      rows.set(where.id, data);
      return data;
    },
    async findMany(args?: Record<string, unknown>) {
      const where = args?.where as Record<string, unknown> | undefined;
      const orderBy = args?.orderBy as Record<string, "asc" | "desc"> | undefined;
      return [...rows.values()]
        .filter((row) => matchesWhere(row, where))
        .sort((left, right) => sortRows(left, right, orderBy));
    },
    async findFirst(args: Record<string, unknown>) {
      return [...rows.values()].find((row) => matchesWhere(row, args.where as Record<string, unknown> | undefined)) ?? null;
    }
  };
};

const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean =>
  Object.entries(where ?? {}).every(([key, value]) => row[key] === value);

const sortRows = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  orderBy: Record<string, "asc" | "desc"> | undefined
): number => {
  const [key, direction] = Object.entries(orderBy ?? {})[0] ?? [];
  if (!key || !direction) {
    return 0;
  }

  const leftValue = String(left[key] ?? "");
  const rightValue = String(right[key] ?? "");
  return direction === "asc" ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue);
};
