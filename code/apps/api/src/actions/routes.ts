import { createHash } from "node:crypto";

import { AuthError } from "@puresoc/auth-core";
import {
  buildMicrosoft365ZeroBlastOutput,
  getMicrosoft365ZeroBlastAction,
  isMicrosoft365ZeroBlastActionKey
} from "@puresoc/provider-microsoft365";
import {
  RemediationActionError,
  normalizeActionRunIdempotencyKey,
  type ActionRun,
  type ActionPreflightResult,
  type ActionSnapshotMetadata,
  type ActionTemplate,
  type ActionVerificationResult,
  type RecommendationContract
} from "@puresoc/recommendations";
import {
  actionableSeverities,
  resolveLegalCaveatMessage,
  type RecommendationActionType,
  type RecommendationAutomationMode
} from "@puresoc/shared";

import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac/index";

const readSessionUserId = async (cookieHeader: string | undefined, services: ApiServices): Promise<string> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  return session.user.id;
};

export const createActionRunRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  idempotencyKeyHeader: string | string[] | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });
  const idempotencyKey = normalizeIdempotencyKeyHeader(idempotencyKeyHeader);
  if (idempotencyKey) {
    const existing = await services.actionsRepository.findActionRunByIdempotencyKeyForOrganization({
      organizationId,
      idempotencyKey
    });
    if (existing) {
      return {
        statusCode: 201,
        body: {
          actionRun: actionRunResponse(existing),
          followupTasks: services.actions.createManualGuidedTasks({
            run: existing,
            ownerUserId: actorUserId
          })
        }
      };
    }
  }

  const providerConnectionId = stringField(body, "providerConnectionId");
  await services.providerConnections.store.getConnectionForOrganization(organizationId, providerConnectionId);
  const template = await services.actions.createTemplate(parseActionTemplate(body.actionTemplate, organizationId));
  const run = await services.actions.createActionRun({
    organizationId,
    providerConnectionId,
    actorUserId,
    idempotencyKey,
    recommendation: parseRecommendation(body.recommendation, organizationId),
    template
  });

  return {
    statusCode: 201,
    body: {
      actionRun: actionRunResponse(run),
      followupTasks: services.actions.createManualGuidedTasks({
        run,
        ownerUserId: actorUserId
      })
    }
  };
};

export const createProviderActionPreflightRoute = async (
  organizationId: string,
  actionTemplateId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  idempotencyKeyHeader: string | string[] | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });

  const idempotencyKey = normalizeIdempotencyKeyHeader(idempotencyKeyHeader);
  let run: ActionRun | null = null;
  if (idempotencyKey) {
    run = await services.actionsRepository.findActionRunByIdempotencyKeyForOrganization({
      organizationId,
      idempotencyKey
    });
  }

  if (!run) {
    const providerConnectionId = stringField(body, "providerConnectionId");
    const connection = await services.providerConnections.store.getConnectionForOrganization(
      organizationId,
      providerConnectionId
    );
    const templateInput = parseActionTemplate(body.actionTemplate, organizationId, actionTemplateId);
    if (connection.providerKey !== templateInput.providerKey) {
      throw new AuthError("invalid_request", "Provider connection must match the action template provider.", 400);
    }
    const template = await services.actions.createTemplate(templateInput);
    run = await services.actions.createActionRun({
      organizationId,
      providerConnectionId,
      actorUserId,
      idempotencyKey,
      recommendation: parseRecommendation(body.recommendation, organizationId),
      template
    });
  }

  const connection = await services.providerConnections.store.getConnectionForOrganization(
    organizationId,
    run.providerConnectionId
  );
  const preflighted = run.preflightResult
    ? run
    : await services.actions.recordPreflight({
        organizationId,
        actionRunId: run.id,
        actorUserId,
        context,
        result: buildV1ProviderActionPreflight(run, connection)
      });
  const snapshotted =
    preflighted.preflightStatus === "passed" && preflighted.automationMode !== "executable_later"
      ? await ensureZeroBlastPreStateSnapshot({
          organizationId,
          run: preflighted,
          actorUserId,
          context,
          services
        })
      : preflighted;

  return {
    statusCode: 201,
    body: {
      actionRun: actionRunResponse(snapshotted),
      preflight: snapshotted.preflightResult,
      followupTasks: services.actions.createManualGuidedTasks({
        run: snapshotted,
        ownerUserId: actorUserId
      })
    }
  };
};

export const getProviderActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator", "auditor"]
  });
  const run = await services.actionsRepository.findActionRunForOrganization({
    organizationId,
    actionRunId
  });
  if (!run) {
    throw new AuthError("invalid_request", "Action run was not found for this organization.", 404);
  }

  return {
    statusCode: 200,
    body: {
      actionRun: actionRunResponse(run)
    }
  };
};

export const approveProviderActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "remediation_approver"]
  });
  const run = await services.actionsRepository.findActionRunForOrganization({
    organizationId,
    actionRunId
  });
  if (!run) {
    throw new AuthError("invalid_request", "Action run was not found for this organization.", 404);
  }

  const requested =
    run.approval.status === "requested" || run.approval.status === "approved"
      ? run
      : await services.actions.requestApproval({
          organizationId,
          actionRunId,
          actorUserId,
          context
        });
  const approved =
    requested.approval.status === "approved"
      ? requested
      : await services.actions.approve({
          organizationId,
          actionRunId,
          actorUserId,
          context
        });

  return {
    statusCode: 200,
    body: {
      actionRun: actionRunResponse(approved)
    }
  };
};

export const executeProviderActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
  cookieHeader: string | undefined,
  idempotencyKeyHeader: string | string[] | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "security_operator"]
  });
  const run = await services.actionsRepository.findActionRunForOrganization({
    organizationId,
    actionRunId
  });
  if (!run) {
    throw new AuthError("invalid_request", "Action run was not found for this organization.", 404);
  }

  if (run.automationMode !== "executable_later") {
    return executeZeroBlastProviderAction({
      organizationId,
      run,
      actorUserId,
      idempotencyKeyHeader,
      context,
      services
    });
  }

  return providerActionExecutionBlockedResult(run);
};

const providerActionExecutionBlockedResult = (run: ActionRun): JsonResult => ({
  statusCode: 409,
  body: {
    error: {
      code: "provider_action_execution_blocked",
      message: "Provider action execution remains disabled until approval policy, recent auth, verification, evidence, audit, and disposable-tenant proof are complete.",
      details: {
        actionRunId: run.id,
        status: run.status,
        automationMode: run.automationMode,
        requiredGates: [
          "capability_state_available",
          "preflight_passed",
          "approval_policy",
          "recent_auth",
          "idempotency",
          "async_execution",
          "verification",
          "evidence",
          "audit",
          "disposable_tenant_proof"
        ]
      }
    }
  }
});

export const ensureZeroBlastPreStateSnapshot = async (input: {
  organizationId: string;
  run: ActionRun;
  actorUserId: string;
  context: RequestContext;
  services: ApiServices;
}): Promise<ActionRun> => {
  const { organizationId, run, actorUserId, context, services } = input;
  if (run.preStateSnapshot) {
    return run;
  }

  const resources = await services.providerConnections.store.listNormalizedResources(
    organizationId,
    run.providerConnectionId
  );
  const resourceRefs = resources.filter((resource) => !resource.deletedAt).map((resource) => resource.id);
  const legalCaveat = resolveLegalCaveatMessage("en");
  const sourceReferences = [
    `action_run:${run.id}`,
    `provider:${run.providerKey}`,
    `control:${run.controlId}`,
    `action:${run.actionKey}`
  ];
  const { reportSnapshot, fileObject } = await services.productV1.createReportSnapshot({
    organizationId,
    templateKey: "remediation_progress",
    locale: "en",
    format: "json",
    legalCaveat: legalCaveat.text,
    legalCaveatLocale: legalCaveat.resolvedLocale,
    legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
    sourceReferences,
    content: {
      actionPreState: {
        actionRunId: run.id,
        actionKey: run.actionKey,
        providerConnectionId: run.providerConnectionId,
        providerMutation: false,
        preflightStatus: run.preflightStatus,
        storedResourceCount: resourceRefs.length,
        resourceRefs
      }
    },
    createdByUserId: actorUserId
  });
  const snapshotted = await services.actions.attachSnapshot({
    organizationId,
    actionRunId: run.id,
    snapshot: {
      evidenceArtifactId: fileObject.id,
      sourceType: "action_pre_state",
      contentHashSha256: fileObject.checksumSha256,
      capturedAt: reportSnapshot.createdAt,
      capturedBy: actorUserId,
      providerConnectionId: run.providerConnectionId,
      resourceRefs,
      description: "Stored provider read snapshot captured before generating zero-blast outputs."
    }
  });
  await services.auditWriter.write({
    actorUserId,
    organizationId,
    targetType: "provider_action_run",
    targetId: run.id,
    action: "action_pre_state_snapshot_attached",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      reportSnapshotId: reportSnapshot.id,
      evidenceArtifactId: fileObject.id,
      providerMutation: false,
      resourceCount: resourceRefs.length
    }
  });

  return snapshotted;
};

export const executeZeroBlastProviderAction = async (input: {
  organizationId: string;
  run: ActionRun;
  actorUserId: string;
  idempotencyKeyHeader: string | string[] | undefined;
  context: RequestContext;
  services: ApiServices;
}): Promise<JsonResult> => {
  const { organizationId, run, actorUserId, context, services } = input;
  if (
    run.preflightStatus !== "passed" ||
    run.preflightResult?.status !== "passed" ||
    run.approval.status !== "approved" ||
    !run.preStateSnapshot
  ) {
    return {
      statusCode: 409,
      body: {
        error: {
          code: "provider_action_zero_blast_gates_incomplete",
          message: "Zero-blast provider action output requires a passed preflight, pre-state snapshot, and approved action run.",
          details: {
            actionRunId: run.id,
            preflightStatus: run.preflightStatus,
            approvalStatus: run.approval.status,
            preStateSnapshotSaved: Boolean(run.preStateSnapshot)
          }
        }
      }
    };
  }

  const requestIdempotencyKey = normalizeIdempotencyKeyHeader(input.idempotencyKeyHeader);
  const operationIdempotencyKey = requestIdempotencyKey ?? `provider-action-zero-blast:${run.id}`;
  const existingOperation = await services.productV1.findOperationByIdempotencyKey({
    organizationId,
    kind: "action",
    idempotencyKey: operationIdempotencyKey
  });
  if (existingOperation) {
    return {
      statusCode: 202,
      body: zeroBlastOperationBody(existingOperation, run, existingOperation.result ?? null)
    };
  }

  const operation = await services.productV1.createOperation({
    organizationId,
    kind: "action",
    idempotencyKey: operationIdempotencyKey,
    targetType: "action_run",
    targetId: run.id,
    status: "running",
    progress: {
      actionRunId: run.id,
      providerKey: run.providerKey,
      providerMutation: false
    }
  });
  const zeroBlast = await createZeroBlastProductArtifacts({
    organizationId,
    run,
    operationId: operation.id,
    actorUserId,
    context,
    services
  });
  const completed = await services.productV1.updateOperation({
    ...operation,
    status: "succeeded",
    result: zeroBlast.result
  });

  return {
    statusCode: 202,
    body: zeroBlastOperationBody(completed, zeroBlast.actionRun, zeroBlast.result, zeroBlast.resources)
  };
};

const createZeroBlastProductArtifacts = async (input: {
  organizationId: string;
  run: ActionRun;
  operationId: string;
  actorUserId: string;
  context: RequestContext;
  services: ApiServices;
}): Promise<{
  actionRun: ActionRun;
  result: Record<string, unknown>;
  resources: Record<string, unknown>;
}> => {
  const { organizationId, run, operationId, actorUserId, context, services } = input;
  const providerResources = await services.providerConnections.store.listNormalizedResources(
    organizationId,
    run.providerConnectionId
  );
  const definition =
    run.providerKey === "microsoft365" && isMicrosoft365ZeroBlastActionKey(run.actionKey)
      ? getMicrosoft365ZeroBlastAction(run.actionKey)
      : undefined;
  const generatedOutput =
    definition && isMicrosoft365ZeroBlastActionKey(run.actionKey)
      ? buildMicrosoft365ZeroBlastOutput({
          actionKey: run.actionKey,
          generatedAt: run.updatedAt,
          resources: providerResources
        })
      : {
          actionKey: run.actionKey,
          generatedAt: run.updatedAt,
          outputType: "manual_review",
          providerMutation: false as const,
          resourceRefs: providerResources.map((resource) => resource.id),
          summary: {
            storedResourceCount: providerResources.length,
            manualFallback: run.manualFallback
          }
        };
  const task = await services.productV1.createTask({
    organizationId,
    title: definition?.outputType === "review_task" ? run.title : `Review zero-blast action: ${run.title}`,
    status: "TODO",
    priority: run.riskLevel,
    ownerUserId: null,
    dueDate: null
  });
  const sourceReferences = [
    `action_run:${run.id}`,
    `provider:${run.providerKey}`,
    `control:${run.controlId}`,
    `action:${run.actionKey}`
  ];
  const evidencePayload = {
    schemaVersion: "puresoc.provider_action.zero_blast_evidence.v1",
    organizationId,
    operationId,
    actionRunId: run.id,
    providerConnectionId: run.providerConnectionId,
    providerKey: run.providerKey,
    actionKey: run.actionKey,
    automationMode: run.automationMode,
    providerMutation: false,
    preflightStatus: run.preflightStatus,
    approvalStatus: run.approval.status,
    expectedChange: run.expectedChange,
    manualFallback: run.manualFallback,
    generatedOutput,
    generatedAt: generatedOutput.generatedAt
  };
  const evidenceBody = Buffer.from(JSON.stringify(evidencePayload, null, 2), "utf8");
  const evidenceFileObject = await services.productV1.createFileObject({
    organizationId,
    purpose: "uploaded_evidence",
    filename: `provider-action-${run.id}.zero-blast-evidence.json`,
    mimeType: "application/json",
    sizeBytes: evidenceBody.byteLength,
    checksumSha256: sha256Hex(evidenceBody),
    storage: {
      provider: "product_v1_state",
      bucket: "provider-action-zero-blast",
      key: `${organizationId}/${run.id}/zero-blast-evidence.json`
    },
    scanStatus: "skipped",
    scanFindings: [],
    retentionClass: "evidence",
    encryption: {
      mode: "local_development",
      algorithm: "metadata-only",
      keyRef: "product_v1_state_records"
    },
    sourceResourceType: "action_run",
    sourceResourceId: run.id,
    sourceReferences,
    createdByUserId: actorUserId
  });
  const legalCaveat = resolveLegalCaveatMessage("en");
  const { reportSnapshot, fileObject: reportFileObject } = await services.productV1.createReportSnapshot({
    organizationId,
    templateKey: "remediation_progress",
    locale: "en",
    format: "json",
    legalCaveat: legalCaveat.text,
    legalCaveatLocale: legalCaveat.resolvedLocale,
    legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
    sourceReferences,
    content: {
      zeroBlastAction: {
        actionRunId: run.id,
        actionKey: run.actionKey,
        providerKey: run.providerKey,
        providerMutation: false,
        taskId: task.id,
        evidenceFileObjectId: evidenceFileObject.id,
        output: generatedOutput
      }
    },
    createdByUserId: actorUserId
  });
  const withPostState = await services.actions.attachSnapshot({
    organizationId,
    actionRunId: run.id,
    snapshot: {
      evidenceArtifactId: reportFileObject.id,
      sourceType: "action_post_state",
      contentHashSha256: reportFileObject.checksumSha256,
      capturedAt: reportSnapshot.createdAt,
      capturedBy: actorUserId,
      providerConnectionId: run.providerConnectionId,
      resourceRefs: generatedOutput.resourceRefs,
      description: "Generated zero-blast output captured without a provider configuration mutation."
    }
  });
  const verified = await services.actions.recordVerification({
    organizationId,
    actionRunId: withPostState.id,
    actorUserId,
    context,
    result: {
      status: "passed",
      checks: [
        {
          code: "provider_mutation_absent",
          status: "passed",
          message: "The action produced local outputs only; no Microsoft 365 write operation was invoked.",
          evidenceArtifactIds: [evidenceFileObject.id, reportFileObject.id]
        },
        {
          code: "expected_output_created",
          status: "passed",
          message: `${generatedOutput.outputType} output, review task, and evidence metadata were created.`,
          evidenceArtifactIds: [reportFileObject.id]
        }
      ],
      evidenceArtifactIds: [evidenceFileObject.id, reportFileObject.id]
    }
  });
  const closed = await services.actions.close({
    organizationId,
    actionRunId: verified.id,
    actorUserId,
    context
  });
  const result = {
    mode: "zero_blast",
    providerMutation: false,
    actionRunId: run.id,
    actionKey: run.actionKey,
    outputType: generatedOutput.outputType,
    outputSummary: generatedOutput.summary,
    taskId: task.id,
    evidenceFileObjectId: evidenceFileObject.id,
    reportSnapshotId: reportSnapshot.id,
    reportFileObjectId: reportFileObject.id,
    lifecycleStatus: closed.status,
    verificationStatus: closed.verificationStatus
  };
  await services.auditWriter.write({
    actorUserId,
    organizationId,
    targetType: "action_run",
    targetId: run.id,
    action: "product_v1.provider_action.zero_blast_executed",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: result
  });
  await services.productV1.createInternalEvent({
    organizationId,
    eventType: "product_v1.provider_action.zero_blast_executed",
    aggregateType: "action_run",
    aggregateId: run.id,
    idempotencyKey: operationId,
    outboxStatus: "pending",
    payload: result
  });

  return {
    actionRun: closed,
    result,
    resources: {
      task,
      evidenceFileObject,
      reportSnapshot,
      reportFileObject
    }
  };
};

const zeroBlastOperationBody = (
  operation: { id: string; status: string },
  run: ActionRun,
  result: Record<string, unknown> | null,
  resources?: Record<string, unknown>
) => ({
  operationId: operation.id,
  status: operation.status,
  links: {
    self: `/api/v1/operations/${operation.id}`
  },
  actionRun: actionRunResponse(run),
  zeroBlast: {
    ...(result ?? {}),
    resources: resources ?? null
  }
});

export const recordActionPreflightRoute = async (
  organizationId: string,
  actionRunId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: actionRunResponse(await services.actions.recordPreflight({
        organizationId,
        actionRunId,
        actorUserId,
        result: parsePreflightResult(body),
        context
      }))
    }
  };
};

export const requestActionApprovalRoute = async (
  organizationId: string,
  actionRunId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: actionRunResponse(await services.actions.requestApproval({
        organizationId,
        actionRunId,
        actorUserId,
        context
      }))
    }
  };
};

export const approveActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "remediation_approver"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: actionRunResponse(await services.actions.approve({
        organizationId,
        actionRunId,
        actorUserId,
        context
      }))
    }
  };
};

export const attachActionSnapshotRoute = async (
  organizationId: string,
  actionRunId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: actionRunResponse(await services.actions.attachSnapshot({
        organizationId,
        actionRunId,
        snapshot: parseSnapshot(body, actorUserId)
      }))
    }
  };
};

export const queueActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "security_operator"]
  });
  const run = await services.actionsRepository.findActionRunForOrganization({
    organizationId,
    actionRunId
  });
  if (!run) {
    throw new AuthError("invalid_request", "Action run was not found for this organization.", 404);
  }
  const connection = await services.providerConnections.store.getConnectionForOrganization(
    organizationId,
    run.providerConnectionId
  );
  const result = await services.actions.queue({
    organizationId,
    actionRunId,
    actorUserId,
    providerConnectionWriteEnabled: connection.writeEnabled,
    context
  });

  return {
    statusCode: 202,
    body: {
      actionRun: actionRunResponse(result.run),
      workerJob: result.job
    }
  };
};

export const failActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: actionRunResponse(await services.actions.fail({
        organizationId,
        actionRunId,
        actorUserId,
        reason: stringField(body, "reason"),
        context
      }))
    }
  };
};

export const verifyActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: actionRunResponse(await services.actions.recordVerification({
        organizationId,
        actionRunId,
        actorUserId,
        result: parseVerificationResult(body),
        context
      }))
    }
  };
};

export const closeActionRunRoute = async (
  organizationId: string,
  actionRunId: string,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const actorUserId = await readSessionUserId(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: actorUserId,
    organizationId,
    allowedRoles: ["owner", "org_admin", "compliance_manager", "security_operator"]
  });

  return {
    statusCode: 200,
    body: {
      actionRun: actionRunResponse(await services.actions.close({
        organizationId,
        actionRunId,
        actorUserId,
        context
      }))
    }
  };
};

const normalizeIdempotencyKeyHeader = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    throw new RemediationActionError(
      "invalid_idempotency_key",
      "Idempotency-Key must be provided only once.",
      400
    );
  }

  return normalizeActionRunIdempotencyKey(value);
};

const actionRunResponse = (run: ActionRun): Omit<ActionRun, "idempotencyKey"> & { idempotencyKeyPresent?: true } => {
  const { idempotencyKey, ...response } = run;
  return idempotencyKey ? { ...response, idempotencyKeyPresent: true } : response;
};

const parseActionTemplate = (
  value: unknown,
  organizationId: string,
  expectedActionTemplateId?: string
): Omit<ActionTemplate, "createdAt" | "updatedAt"> => {
  const input = objectField(value, "actionTemplate");
  const automationMode = automationModeField(input, "automationMode");
  const riskLevel = severityField(input, "riskLevel");
  const id = optionalStringField(input, "id") ?? expectedActionTemplateId ?? `template_${stringField(input, "actionKey")}`;
  if (expectedActionTemplateId && id !== expectedActionTemplateId) {
    throw new AuthError("invalid_request", "actionTemplate.id must match the provider action template route.", 400);
  }

  return {
    id,
    organizationId,
    providerKey: stringField(input, "providerKey"),
    moduleKey: optionalStringField(input, "moduleKey"),
    actionKey: stringField(input, "actionKey"),
    actionType: actionTypeField(input, "actionType"),
    automationMode,
    title: stringField(input, "title"),
    description: optionalStringField(input, "description"),
    riskLevel,
    licenseRequired: stringArrayField(input, "licenseRequired"),
    permissionsRequired: stringArrayField(input, "permissionsRequired"),
    preconditions: recordField(input, "preconditions"),
    expectedChange: stringField(input, "expectedChange"),
    blastRadius: stringField(input, "blastRadius"),
    rollbackStrategy: stringField(input, "rollbackStrategy"),
    manualFallback: stringField(input, "manualFallback"),
    evidenceRequired: booleanField(input, "evidenceRequired", true),
    enabledByDefault: booleanField(input, "enabledByDefault", false),
    highRiskForbiddenInV1: booleanField(input, "highRiskForbiddenInV1", false),
    sourceReferences: []
  };
};

const buildV1ProviderActionPreflight = (
  run: ActionRun,
  connection: { status?: string | null; writeEnabled?: boolean | null }
): Omit<ActionPreflightResult, "checkedAt" | "checkedBy"> => {
  const providerConnectionAvailable = connection.status === "connected" || connection.status === "degraded";
  const highRiskBlocked = run.highRiskForbiddenInV1 && run.automationMode === "executable_later";
  const executableWriteDisabled = run.automationMode === "executable_later" && !connection.writeEnabled;

  return {
    status: highRiskBlocked ? "failed" : "passed",
    checks: [
      {
        code: "provider_connection_available",
        status: providerConnectionAvailable ? "passed" : "warning",
        message: providerConnectionAvailable
          ? "Provider connection state is available for preflight."
          : "Provider connection is not fully connected; execution remains blocked."
      },
      {
        code: "provider_action_write_policy",
        status: executableWriteDisabled ? "warning" : "passed",
        message: executableWriteDisabled
          ? "Executable provider writes remain blocked because provider write access is disabled."
          : "Provider write access check completed for this action mode."
      },
      {
        code: "high_risk_v1_policy",
        status: highRiskBlocked ? "failed" : "passed",
        message: highRiskBlocked
          ? "High-risk provider writes are forbidden in V1."
          : "The action is not blocked by the V1 high-risk policy."
      }
    ],
    diff: {
      summary: run.expectedChange,
      changes: [
        {
          field: "expectedChange",
          after: run.expectedChange
        },
        {
          field: "rollbackOrManualFallback",
          after: run.rollbackStrategy || run.manualFallback
        }
      ]
    },
    requiredPermissions: run.permissionsRequired,
    requiredLicense: run.licenseRequired,
    canRequestApproval: !highRiskBlocked
  };
};

const parseRecommendation = (value: unknown, organizationId: string): RecommendationContract => {
  const input = objectField(value, "recommendation");
  return {
    id: stringField(input, "id"),
    organizationId,
    sourceFindingId: optionalStringField(input, "sourceFindingId"),
    sourceFindingIds: stringArrayField(input, "sourceFindingIds"),
    manualTaskIds: stringArrayField(input, "manualTaskIds"),
    controlId: stringField(input, "controlId"),
    jurisdiction: stringField(input, "jurisdiction"),
    title: stringField(input, "title"),
    summary: stringField(input, "summary"),
    severity: severityField(input, "severity"),
    confidence: "medium",
    recommendationType: actionTypeField(input, "recommendationType"),
    automationMode: automationModeField(input, "automationMode"),
    requiredPermissions: stringArrayField(input, "requiredPermissions"),
    requiredLicense: stringArrayField(input, "requiredLicense"),
    expectedChange: optionalStringField(input, "expectedChange"),
    blastRadius: optionalStringField(input, "blastRadius"),
    manualFallback: optionalStringField(input, "manualFallback"),
    evidenceRequired: booleanField(input, "evidenceRequired", true),
    status: "proposed",
    sourceReferences: []
  };
};

const parsePreflightResult = (body: Record<string, unknown>): Omit<ActionPreflightResult, "checkedAt" | "checkedBy"> => {
  const status = body.status === "passed" || body.status === "failed" ? body.status : undefined;
  if (!status) {
    throw new AuthError("invalid_request", "Preflight status must be passed or failed.", 400);
  }

  return {
    status,
    checks: Array.isArray(body.checks)
      ? body.checks.map((entry, index) => {
          const check = objectField(entry, `checks[${index}]`);
          const checkStatus =
            check.status === "passed" || check.status === "failed" || check.status === "warning"
              ? check.status
              : undefined;
          if (!checkStatus) {
            throw new AuthError("invalid_request", "Preflight check status is invalid.", 400);
          }
          return {
            code: stringField(check, "code"),
            status: checkStatus,
            message: stringField(check, "message")
          };
        })
      : [],
    diff:
      typeof body.diff === "object" && body.diff !== null
        ? {
            summary: stringField(body.diff as Record<string, unknown>, "summary"),
            changes: []
          }
        : undefined,
    requiredPermissions: stringArrayField(body, "requiredPermissions"),
    requiredLicense: stringArrayField(body, "requiredLicense"),
    canRequestApproval: booleanField(body, "canRequestApproval", status === "passed")
  };
};

const parseSnapshot = (body: Record<string, unknown>, actorUserId: string): ActionSnapshotMetadata => {
  const sourceType =
    body.sourceType === "action_pre_state" || body.sourceType === "action_post_state" ? body.sourceType : undefined;
  if (!sourceType) {
    throw new AuthError("invalid_request", "Snapshot sourceType must be action_pre_state or action_post_state.", 400);
  }

  return {
    evidenceArtifactId: stringField(body, "evidenceArtifactId"),
    sourceType,
    contentHashSha256: optionalStringField(body, "contentHashSha256"),
    capturedAt: optionalStringField(body, "capturedAt") ?? new Date().toISOString(),
    capturedBy: actorUserId,
    providerConnectionId: stringField(body, "providerConnectionId"),
    resourceRefs: stringArrayField(body, "resourceRefs"),
    description: optionalStringField(body, "description")
  };
};

const parseVerificationResult = (
  body: Record<string, unknown>
): Omit<ActionVerificationResult, "verifiedAt" | "verifiedBy"> => {
  const status =
    body.status === "passed" || body.status === "failed" || body.status === "manual_required"
      ? body.status
      : undefined;
  if (!status) {
    throw new AuthError("invalid_request", "Verification status must be passed, failed, or manual_required.", 400);
  }

  return {
    status,
    checks: [],
    evidenceArtifactIds: stringArrayField(body, "evidenceArtifactIds")
  };
};

const objectField = (value: unknown, fieldName: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AuthError("invalid_request", `${fieldName} must be an object.`, 400);
  }

  return value as Record<string, unknown>;
};

const recordField = (value: Record<string, unknown>, fieldName: string): Record<string, unknown> => {
  const field = value[fieldName];
  return field && typeof field === "object" && !Array.isArray(field) ? (field as Record<string, unknown>) : {};
};

const stringField = (value: Record<string, unknown>, fieldName: string): string => {
  const field = value[fieldName];
  if (typeof field !== "string" || field.trim().length === 0) {
    throw new AuthError("invalid_request", `${fieldName} must be a non-empty string.`, 400);
  }

  return field;
};

const optionalStringField = (value: Record<string, unknown>, fieldName: string): string | undefined => {
  const field = value[fieldName];
  return typeof field === "string" && field.trim().length > 0 ? field : undefined;
};

const stringArrayField = (value: Record<string, unknown>, fieldName: string): string[] => {
  const field = value[fieldName];
  return Array.isArray(field) ? field.filter((entry): entry is string => typeof entry === "string") : [];
};

const booleanField = (value: Record<string, unknown>, fieldName: string, fallback: boolean): boolean =>
  typeof value[fieldName] === "boolean" ? value[fieldName] : fallback;

const sha256Hex = (body: Uint8Array): string => createHash("sha256").update(body).digest("hex");

const severityField = (value: Record<string, unknown>, fieldName: string) => {
  const field = value[fieldName];
  if (typeof field === "string" && (actionableSeverities as readonly string[]).includes(field)) {
    return field as (typeof actionableSeverities)[number];
  }

  throw new AuthError("invalid_request", `${fieldName} must be an actionable severity.`, 400);
};

const recommendationActionTypes = [
  "manual",
  "guided",
  "technical",
  "process",
  "evidence_upload",
  "country_registration",
  "incident_reporting"
] as const satisfies readonly RecommendationActionType[];

const actionTypeField = (value: Record<string, unknown>, fieldName: string): RecommendationActionType => {
  const field = value[fieldName];
  if (typeof field === "string" && (recommendationActionTypes as readonly string[]).includes(field)) {
    return field as RecommendationActionType;
  }

  throw new AuthError("invalid_request", `${fieldName} must be a supported action type.`, 400);
};

const automationModes = ["manual", "guided", "preflightable", "executable_later"] as const satisfies readonly RecommendationAutomationMode[];

const automationModeField = (value: Record<string, unknown>, fieldName: string): RecommendationAutomationMode => {
  const field = value[fieldName];
  if (typeof field === "string" && (automationModes as readonly string[]).includes(field)) {
    return field as RecommendationAutomationMode;
  }

  throw new AuthError("invalid_request", `${fieldName} must be a supported automation mode.`, 400);
};
