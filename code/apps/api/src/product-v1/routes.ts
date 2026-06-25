import { AuthError, type PureSocRoleKey } from "@puresoc/auth-core";
import { demoCountryPackDefinitions, classifyWithNis2CountryPack } from "@puresoc/country-packs-core";
import { romaniaNis2CountryPackDefinition } from "@puresoc/country-pack-ro";
import type { ProviderCapabilityRecord } from "@puresoc/providers-core";
import { PURESOC_LEGAL_CAVEAT, resolveLegalCaveatMessage, supportedLocales } from "@puresoc/shared";
import type { ApiServices } from "../auth/services";
import { parseCookies, sessionCookieName, type BinaryResult, type JsonResult, type RequestContext } from "../http";
import { requireOrganizationRole } from "../rbac";
import type { ApiRequestContext } from "../middleware";
import { productV1OpenApiDocument } from "./openapi";
import {
  type OrganizationRelationshipState,
  type ProductV1FilePurpose,
  type ProductV1FileScanStatus,
  type ProductV1CapabilityState,
  type ProductV1ClassificationOutcome,
  type ProductV1InternalEventStatus,
  type ProductV1NotificationCategory,
  type ProductV1NotificationDigestFrequency,
  type ProductV1NotificationSeverity,
  type ProductV1NotificationStatus,
  type ProductV1RecordType,
  type ProductV1RetentionClass,
  productV1SetupSteps,
  type ProductV1SetupStep,
  renderProductV1ReportSnapshotArtifact,
  type ReportSnapshotFormat,
  type ReportTemplateKey
} from "./service";

type V1Context = ApiRequestContext | (RequestContext & { requestId?: string | null; correlationId?: string | null });

const relationshipActions: Record<string, OrganizationRelationshipState> = {
  accept: "ACTIVE",
  suspend: "SUSPENDED",
  "request-termination": "TERMINATION_PENDING",
  terminate: "TERMINATED"
};
const productV1CountryPackDefinitions = [romaniaNis2CountryPackDefinition, ...demoCountryPackDefinitions] as const;
const reportTemplateKeys: readonly ReportTemplateKey[] = [
  "security_baseline",
  "executive_summary",
  "nis2",
  "controls_evidence",
  "risk_register",
  "incident_package",
  "remediation_progress",
  "partner_portfolio",
  "customer_service",
  "audit"
];

export const productV1OpenApiRoute = (): JsonResult => ({
  statusCode: 200,
  body: productV1OpenApiDocument
});

export const productV1MeRoute = async (
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  return {
    statusCode: 200,
    body: {
      user: session.user,
      session: {
        id: session.session.id,
        activeOrganizationId: session.session.activeOrganizationId
      }
    }
  };
};

export const productV1ListOrganizationsRoute = async (
  query: URLSearchParams,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  const rows = await services.identityRepository.listOrganizationsForUser(session.user.id);
  return paginated(
    rows.map((row) => ({
      id: row.organization.id,
      name: row.organization.name,
      legalName: row.organization.legalName ?? null,
      primaryCountryCode: row.organization.primaryCountryCode ?? null,
      membershipStatus: row.membership.status,
      roles: row.roleKeys,
      active: row.organization.id === session.session.activeOrganizationId
    })),
    query
  );
};

export const productV1CreateOrganizationRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  const organization = await services.organizations.createOrganization({
    actorUserId: session.user.id,
    name: requiredString(body, "name", "Organization name"),
    legalName: optionalString(body, "legalName") ?? null,
    primaryCountryCode: optionalString(body, "countryCode") ?? optionalString(body, "primaryCountryCode") ?? "RO",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  await services.productV1.getSetupState(organization.organization.id);
  return {
    statusCode: 201,
    body: organization
  };
};

export const productV1GetSetupRoute = async (
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  await requireOrganizationAccess(cookieHeader, services, organizationId);
  return {
    statusCode: 200,
    body: {
      setup: await services.productV1.getSetupState(organizationId)
    }
  };
};

export const productV1SaveSetupStepRoute = async (
  organizationId: string,
  step: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, [
    "owner",
    "org_admin",
    "compliance_manager"
  ]);
  const setupStep = assertSetupStep(step);
  const state = await services.productV1.saveSetupStep({
    organizationId,
    step: setupStep,
    data: recordValue(body.data) ?? body,
    complete: booleanValue(body.complete) ?? true
  });
  await services.auditWriter.write({
    actorUserId: session.user.id,
    organizationId,
    targetType: "setup_step",
    targetId: setupStep,
    action: "product_v1.setup_step.saved",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      step: setupStep,
      status: state.status,
      completedSteps: state.completedSteps
    }
  });
  return { statusCode: 200, body: { setup: state } };
};

export const productV1LaunchSetupRoute = async (
  organizationId: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, ["owner", "org_admin"]);
  const result = await services.productV1.launchSetup(organizationId);
  await services.auditWriter.write({
    actorUserId: session.user.id,
    organizationId,
    targetType: "setup",
    targetId: organizationId,
    action: "product_v1.setup.launch_evaluated",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      status: result.state.status,
      missingSteps: result.missingSteps
    }
  });
  return {
    statusCode: result.missingSteps.length === 0 ? 202 : 409,
    body:
      result.missingSteps.length === 0
        ? operationBody(
            await services.productV1.createOperation({
              organizationId,
              kind: "setup",
              targetType: "setup",
              targetId: organizationId,
              status: "succeeded",
              result: { setupStatus: result.state.status }
            })
          )
        : {
            error: {
              code: "setup_incomplete",
              message: "Setup is missing required steps.",
              details: {
                setup: result.state,
                missingSteps: result.missingSteps
              }
            }
          }
  };
};

export const productV1BusinessServicesRoute = async (
  organizationId: string,
  query: URLSearchParams,
  body: Record<string, unknown>,
  method: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, method === "GET" ? undefined : [
    "owner",
    "org_admin",
    "compliance_manager"
  ]);
  if (method === "GET") {
    return paginated(await services.productV1.listBusinessServices(organizationId), query);
  }
  const record = await services.productV1.createBusinessService({
    organizationId,
    name: requiredString(body, "name", "Business service name"),
    criticality: criticality(body.criticality),
    ownerPersonId: optionalString(body, "ownerPersonId") ?? null
  });
  await auditV1(services, session.user.id, organizationId, "business_service", record.id, "product_v1.business_service.created", context);
  return { statusCode: 201, body: { businessService: record } };
};

export const productV1ResponsibilitiesRoute = async (
  organizationId: string,
  query: URLSearchParams,
  body: Record<string, unknown>,
  method: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, method === "GET" ? undefined : [
    "owner",
    "org_admin",
    "compliance_manager"
  ]);
  if (method === "GET") {
    return paginated(await services.productV1.listPeople(organizationId), query);
  }
  const record = await services.productV1.createPerson({
    organizationId,
    displayName: requiredString(body, "displayName", "Display name"),
    email: optionalString(body, "email") ?? null,
    responsibilities: stringArray(body.responsibilities, ["security_lead"])
  });
  await auditV1(services, session.user.id, organizationId, "responsibility_assignment", record.id, "product_v1.responsibility.created", context);
  return { statusCode: 201, body: { responsibility: record } };
};

export const productV1SuppliersRoute = async (
  organizationId: string,
  query: URLSearchParams,
  body: Record<string, unknown>,
  method: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, method === "GET" ? undefined : [
    "owner",
    "org_admin",
    "compliance_manager"
  ]);
  if (method === "GET") {
    return paginated(await services.productV1.listSuppliers(organizationId), query);
  }
  const record = await services.productV1.createSupplier({
    organizationId,
    name: requiredString(body, "name", "Supplier name"),
    criticality: criticality(body.criticality),
    services: stringArray(body.services, []),
    reviewCadenceMonths: integerValue(body.reviewCadenceMonths) ?? 12
  });
  await auditV1(services, session.user.id, organizationId, "supplier", record.id, "product_v1.supplier.created", context);
  return { statusCode: 201, body: { supplier: record } };
};

export const productV1CreateRelationshipInvitationRoute = async (
  partnerId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  await requirePartnerRole(services, partnerId, session.user.id, ["owner", "admin"]);
  const customerOrganizationId = requiredString(body, "organizationId", "Customer organization ID");
  const relationship = await services.productV1.createRelationship({
    partnerId,
    customerOrganizationId,
    invitedByUserId: session.user.id,
    scopes: stringArray(body.scopes, ["security.read", "compliance.read"]),
    expiresAt: optionalString(body, "expiresAt") ?? null
  });
  await auditV1(
    services,
    session.user.id,
    customerOrganizationId,
    "organization_relationship",
    relationship.id,
    "product_v1.organization_relationship.invited",
    context
  );
  return { statusCode: 201, body: { relationship } };
};

export const productV1RelationshipTransitionRoute = async (
  relationshipId: string,
  action: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const nextState = relationshipActions[action];
  if (!nextState) {
    throw new AuthError("invalid_request", "Unsupported relationship action.", 400);
  }
  const relationship = await services.productV1.getRelationship(relationshipId);
  if (!relationship) {
    throw new AuthError("not_found", "Organization relationship was not found.", 404);
  }
  const session = await requireOrganizationAccess(cookieHeader, services, relationship.customerOrganizationId, [
    "owner",
    "org_admin"
  ]);
  let updated;
  try {
    updated = await services.productV1.transitionRelationship({
      relationshipId,
      nextState,
      actorUserId: session.user.id
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid relationship transition")) {
      throw new AuthError("invalid_relationship_transition", error.message, 409);
    }
    throw error;
  }
  if (updated.state === "TERMINATED") {
    await services.productV1.revokeAssignmentsForRelationship(updated.id);
  }
  await auditV1(
    services,
    session.user.id,
    updated.customerOrganizationId,
    "organization_relationship",
    updated.id,
    `product_v1.organization_relationship.${action}`,
    context
  );
  return { statusCode: 200, body: { relationship: updated } };
};

export const productV1PartnerAssignmentsRoute = async (
  partnerId: string,
  query: URLSearchParams,
  body: Record<string, unknown>,
  method: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  await requirePartnerRole(services, partnerId, session.user.id, ["owner", "admin"]);
  await backfillActivePartnerGrants(partnerId, services);
  if (method === "GET") {
    return paginated(await services.productV1.listAssignments(partnerId), query);
  }
  const assignment = await services.productV1.createAssignment({
    partnerId,
    relationshipId: requiredString(body, "relationshipId", "Relationship ID"),
    customerOrganizationId: requiredString(body, "organizationId", "Customer organization ID"),
    assigneeType: body.assigneeType === "team" ? "team" : "user",
    assigneeId: requiredString(body, "assigneeId", "Assignee ID"),
    scopes: stringArray(body.scopes, ["security.read"]),
    expiresAt: optionalString(body, "expiresAt") ?? null,
    createdByUserId: session.user.id
  });
  await auditV1(
    services,
    session.user.id,
    assignment.customerOrganizationId,
    "partner_assignment",
    assignment.id,
    "product_v1.partner_assignment.created",
    context
  );
  return { statusCode: 201, body: { assignment } };
};

export const productV1PartnerCustomerContextRoute = async (
  partnerId: string,
  organizationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await readSession(cookieHeader, services);
  await requirePartnerRole(services, partnerId, session.user.id, ["owner", "admin", "analyst", "viewer"]);
  await backfillActivePartnerGrants(partnerId, services);
  const activeRelationship = (await services.productV1
    .listRelationshipsForPartner(partnerId))
    .find((relationship) => relationship.customerOrganizationId === organizationId && relationship.state === "ACTIVE");
  if (!activeRelationship || !(await services.productV1.hasActiveAssignment({ partnerId, organizationId, userId: session.user.id, requiredScope: "security.read" }))) {
    throw new AuthError("forbidden", "Partner customer access requires an active relationship and assignment.", 403);
  }
  return {
    statusCode: 200,
    body: {
      customerContext: {
        partnerId,
        organizationId,
        relationshipId: activeRelationship.id,
        delegated: true
      }
    }
  };
};

export const productV1SupportSessionsRoute = async (
  query: URLSearchParams,
  body: Record<string, unknown>,
  method: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const organizationId = query.get("organizationId") ?? optionalString(body, "organizationId");
  const session = await readSession(cookieHeader, services);
  if (method === "GET") {
    if (!organizationId) {
      throw new AuthError("invalid_request", "Organization ID is required to list support sessions.", 400);
    }
    if (organizationId) {
      await requireOrganizationRole({
        repository: services.rbacRepository,
        userId: session.user.id,
        organizationId,
        allowedRoles: ["owner", "org_admin", "auditor"]
      });
    }
    return paginated(await services.productV1.listSupportSessions(organizationId), query);
  }
  const targetOrganizationId = requiredString(body, "organizationId", "Organization ID");
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: session.user.id,
    organizationId: targetOrganizationId,
    allowedRoles: ["owner", "org_admin"]
  });
  const supportSession = await services.productV1.createSupportSession({
    organizationId: targetOrganizationId,
    actorUserId: session.user.id,
    reason: requiredString(body, "reason", "Support session reason"),
    policyBasis: body.policyBasis === "platform_break_glass" ? "platform_break_glass" : "customer_approved",
    ticketReference: optionalString(body, "ticketReference") ?? null,
    ttlMinutes: integerValue(body.ttlMinutes) ?? 60
  });
  await auditV1(
    services,
    session.user.id,
    targetOrganizationId,
    "support_session",
    supportSession.id,
    "product_v1.support_session.started",
    context
  );
  return { statusCode: 201, body: { supportSession } };
};

export const productV1EndSupportSessionRoute = async (
  supportSessionId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const supportSession = await services.productV1.getSupportSession(supportSessionId);
  if (!supportSession) {
    throw new AuthError("not_found", "Support session was not found.", 404);
  }
  const session = await requireOrganizationAccess(cookieHeader, services, supportSession.organizationId, [
    "owner",
    "org_admin"
  ]);
  const ended = await services.productV1.endSupportSession({
    supportSessionId,
    reason: optionalString(body, "reason") ?? "ended_by_authorized_user"
  });
  await auditV1(
    services,
    session.user.id,
    ended.organizationId,
    "support_session",
    ended.id,
    "product_v1.support_session.ended",
    context
  );
  return { statusCode: 200, body: { supportSession: ended } };
};

export const productV1CountryPacksRoute = async (
  query: URLSearchParams,
  countryCode: string | null
): Promise<JsonResult> => {
  const packs = productV1CountryPackDefinitions.map(countryPackContract);
  if (countryCode) {
    const pack = packs.find((candidate) => candidate.countryCode === countryCode.toUpperCase());
    if (!pack) {
      throw new AuthError("not_found", "Country pack was not found.", 404);
    }
    return { statusCode: 200, body: { countryPack: pack } };
  }
  return paginated(packs, query);
};

export const productV1RunClassificationRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  await requireOrganizationAccess(cookieHeader, services, organizationId);
  const countryCode = (optionalString(body, "countryCode") ?? "RO").toUpperCase();
  const pack = productV1CountryPackDefinitions.find((candidate) => candidate.countryCode === countryCode);
  if (!pack) {
    throw new AuthError("invalid_request", "Unsupported country pack.", 400);
  }
  const classification = classifyWithNis2CountryPack(pack, recordValue(body.answers) ?? body);
  return {
    statusCode: 202,
    body: operationBody(
      await services.productV1.createOperation({
        organizationId,
        kind: "setup",
        targetType: "classification",
        status: "succeeded",
        result: {
          normalizedOutcome: normalizeClassificationOutcome(classification.result),
          rawOutcome: classification.result,
          countryCode,
          countryPackVersion: pack.packVersion,
          reviewStatus: pack.status === "active" ? "reviewed" : "review_required",
          legalReviewRequired: true,
          explanation: classification.explanation,
          legalCaveat: PURESOC_LEGAL_CAVEAT
        }
      })
    )
  };
};

export const productV1ProviderCapabilitiesRoute = async (
  organizationId: string,
  query: URLSearchParams,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  await requireOrganizationAccess(cookieHeader, services, organizationId);
  const connections = await services.providerConnections.listConnections(organizationId);
  const rows: Array<ReturnType<typeof capabilityView>> = [];
  for (const connection of connections.connections) {
    const capabilities = await services.providerConnections.store.listCapabilities(organizationId, connection.id);
    rows.push(...capabilities.map((capability) => capabilityView(capability)));
  }
  return paginated(rows, query);
};

export const productV1Microsoft365SyncRunRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, [
    "owner",
    "org_admin",
    "security_operator"
  ]);
  const providerConnectionId = optionalString(body, "providerConnectionId") ?? (await primaryMicrosoftConnection(organizationId, services))?.id;
  if (!providerConnectionId) {
    throw new AuthError("invalid_request", "Connect Microsoft 365 before running sync.", 400);
  }
  const operation = await services.productV1.createOperation({
    organizationId,
    kind: "sync",
    idempotencyKey: idempotencyKey(context),
    targetType: "provider_connection",
    targetId: providerConnectionId,
    status: "running",
    progress: { requestedModules: stringArray(body.requestedModules, []) }
  });
  if (operation.status !== "running") {
    return { statusCode: 202, body: operationBody(operation) };
  }
  const result = await services.microsoft365ProviderConnections.runSync({
    organizationId,
    actorUserId: session.user.id,
    providerConnectionId,
    requestedModules: stringArray(body.requestedModules, undefined),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  const completed = await services.productV1.updateOperation({
    ...operation,
    status: "succeeded",
    result: { syncRunId: result.syncRun.id, status: result.syncRun.status }
  });
  await emitProductV1Event(services, {
    organizationId,
    eventType: "product_v1.microsoft365.sync_run.completed",
    aggregateType: "operation",
    aggregateId: completed.id,
    context,
    payload: {
      providerConnectionId,
      syncRunId: result.syncRun.id,
      status: result.syncRun.status
    }
  });
  return { statusCode: 202, body: operationBody(completed) };
};

export const productV1Microsoft365DisconnectRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, ["owner", "org_admin"]);
  const providerConnectionId = optionalString(body, "providerConnectionId") ?? (await primaryMicrosoftConnection(organizationId, services))?.id;
  if (!providerConnectionId) {
    throw new AuthError("invalid_request", "Microsoft 365 is not connected.", 400);
  }
  const result = await services.microsoft365ProviderConnections.disconnect({
    organizationId,
    actorUserId: session.user.id,
    providerConnectionId,
    reason: optionalString(body, "reason"),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  const operation = await services.productV1.createOperation({
    organizationId,
    kind: "sync",
    idempotencyKey: idempotencyKey(context),
    targetType: "provider_connection",
    targetId: providerConnectionId,
    status: "succeeded",
    result: {
      connection: result.connection,
      providerRevocation: result.providerRevocation,
      dependentControlsMarkedStale: true,
      historicalObservationsPreserved: true
    }
  });
  await emitProductV1Event(services, {
    organizationId,
    eventType: "product_v1.microsoft365.disconnected",
    aggregateType: "operation",
    aggregateId: operation.id,
    context,
    payload: {
      providerConnectionId,
      providerRevocation: result.providerRevocation,
      dependentControlsMarkedStale: true,
      historicalObservationsPreserved: true
    }
  });
  return {
    statusCode: 202,
    body: operationBody(operation)
  };
};

export const productV1AggregateRoute = async (
  organizationId: string,
  resource: string,
  query: URLSearchParams,
  body: Record<string, unknown>,
  method: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, method === "GET" ? undefined : [
    "owner",
    "org_admin",
    "compliance_manager",
    "security_operator"
  ]);
  if (method === "GET") {
    return paginated(await listAggregate(resource, organizationId, services), query);
  }
  const created = await createAggregate(resource, organizationId, body, services);
  await auditV1(services, session.user.id, organizationId, resource, created.id, `product_v1.${resource}.created`, context);
  await emitProductV1Event(services, {
    organizationId,
    eventType: `product_v1.${resource}.created`,
    aggregateType: resource,
    aggregateId: created.id,
    context,
    payload: { resourceId: created.id }
  });
  return { statusCode: 201, body: { [singular(resource)]: created } };
};

export const productV1AggregateUpdateRoute = async (
  organizationId: string,
  resource: string,
  recordId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, [
    "owner",
    "org_admin",
    "compliance_manager",
    "security_operator"
  ]);
  let result;
  try {
    result = await updateAggregate(resource, organizationId, recordId, body, services);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unknown product v1")) {
      throw new AuthError("not_found", "Product v1 resource was not found for this organization.", 404);
    }
    throw error;
  }
  await services.auditWriter.write({
    actorUserId: session.user.id,
    organizationId,
    targetType: resource,
    targetId: recordId,
    action: `product_v1.${resource}.updated`,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    beforeJson: result.before,
    afterJson: result.after
  });
  await emitProductV1Event(services, {
    organizationId,
    eventType: `product_v1.${resource}.updated`,
    aggregateType: resource,
    aggregateId: recordId,
    context,
    payload: {
      before: result.before,
      after: result.after
    }
  });
  return { statusCode: 200, body: { [singular(resource)]: result.after } };
};

export const productV1RetentionPoliciesRoute = async (
  organizationId: string,
  query: URLSearchParams,
  body: Record<string, unknown>,
  method: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, method === "GET" ? undefined : [
    "owner",
    "org_admin"
  ]);
  if (method === "GET") {
    return paginated(await services.productV1.listRetentionPolicies(organizationId), query);
  }
  const policy = await services.productV1.createRetentionPolicy({
    organizationId,
    name: requiredString(body, "name", "Retention policy name"),
    retentionClass: retentionClass(body.retentionClass),
    retainForDays: boundedInteger(body.retainForDays, 0, 3650),
    allowDeleteAfterRetention: booleanValue(body.allowDeleteAfterRetention) ?? true,
    legalHoldDefault: booleanValue(body.legalHoldDefault) ?? false
  });
  await auditV1(
    services,
    session.user.id,
    organizationId,
    "retention_policy",
    policy.id,
    "product_v1.retention_policy.created",
    context
  );
  return { statusCode: 201, body: { retentionPolicy: policy } };
};

export const productV1FileObjectsRoute = async (
  organizationId: string,
  query: URLSearchParams,
  body: Record<string, unknown>,
  method: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, method === "GET" ? undefined : [
    "owner",
    "org_admin",
    "compliance_manager",
    "security_operator"
  ]);
  if (method === "GET") {
    return paginated(await services.productV1.listFileObjects(organizationId), query);
  }
  const fileObject = await services.productV1.createFileObject({
    organizationId,
    purpose: filePurpose(body.purpose),
    filename: requiredString(body, "filename", "File name"),
    mimeType: requiredString(body, "mimeType", "MIME type"),
    sizeBytes: boundedInteger(body.sizeBytes, 0, 10_000_000_000),
    checksumSha256: checksumSha256(body.checksumSha256),
    storage: storageMetadata(body.storage),
    scanStatus: fileScanStatus(body.scanStatus),
    scanFindings: stringArray(body.scanFindings, []),
    retentionClass: retentionClass(body.retentionClass),
    retentionPolicyId: optionalString(body, "retentionPolicyId") ?? null,
    legalHold: booleanValue(body.legalHold) ?? false,
    legalHoldReason: optionalString(body, "legalHoldReason") ?? null,
    encryption: encryptionMetadata(body.encryption),
    sourceResourceType: optionalString(body, "sourceResourceType") ?? null,
    sourceResourceId: optionalString(body, "sourceResourceId") ?? null,
    sourceReferences: stringArray(body.sourceReferences, []),
    createdByUserId: session.user.id
  });
  await auditV1(services, session.user.id, organizationId, "file_object", fileObject.id, "product_v1.file_object.created", context);
  await emitProductV1Event(services, {
    organizationId,
    eventType: "product_v1.file_object.created",
    aggregateType: "file_object",
    aggregateId: fileObject.id,
    context,
    payload: {
      purpose: fileObject.purpose,
      retentionClass: fileObject.retentionClass,
      scanStatus: fileObject.scanStatus
    }
  });
  return { statusCode: 201, body: { fileObject } };
};

export const productV1FileObjectLegalHoldRoute = async (
  organizationId: string,
  fileObjectId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, [
    "owner",
    "org_admin",
    "compliance_manager"
  ]);
  const fileObject = await services.productV1.setFileObjectLegalHold({
    organizationId,
    fileObjectId,
    legalHold: booleanValue(body.legalHold) ?? true,
    reason: optionalString(body, "reason") ?? null
  });
  await auditV1(
    services,
    session.user.id,
    organizationId,
    "file_object",
    fileObject.id,
    fileObject.legalHold ? "product_v1.file_object.legal_hold_applied" : "product_v1.file_object.legal_hold_released",
    context
  );
  await emitProductV1Event(services, {
    organizationId,
    eventType: fileObject.legalHold ? "product_v1.file_object.legal_hold_applied" : "product_v1.file_object.legal_hold_released",
    aggregateType: "file_object",
    aggregateId: fileObject.id,
    context,
    payload: {
      legalHold: fileObject.legalHold,
      legalHoldReason: fileObject.legalHoldReason
    }
  });
  return { statusCode: 200, body: { fileObject } };
};

export const productV1DeleteFileObjectRoute = async (
  organizationId: string,
  fileObjectId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, ["owner", "org_admin"]);
  let result;
  try {
    result = await services.productV1.tombstoneFileObject({
      organizationId,
      fileObjectId,
      reason: optionalString(body, "reason") ?? "deleted_by_authorized_user"
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unknown file object")) {
      throw new AuthError("not_found", "File object was not found.", 404);
    }
    throw error;
  }
  if (!result.deleted) {
    await services.auditWriter.write({
      actorUserId: session.user.id,
      organizationId,
      targetType: "file_object",
      targetId: result.fileObject.id,
      action: "product_v1.file_object.delete_blocked",
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      afterJson: {
        blockedReason: result.blockedReason,
        retainUntil: result.fileObject.retainUntil,
        legalHold: result.fileObject.legalHold
      }
    });
    await emitProductV1Event(services, {
      organizationId,
      eventType: "product_v1.file_object.delete_blocked",
      aggregateType: "file_object",
      aggregateId: result.fileObject.id,
      context,
      payload: {
        blockedReason: result.blockedReason,
        retainUntil: result.fileObject.retainUntil,
        legalHold: result.fileObject.legalHold
      },
      outboxStatus: "skipped"
    });
    throw new AuthError("retention_delete_blocked", "File object deletion is blocked by retention policy.", 409);
  }
  await services.auditWriter.write({
    actorUserId: session.user.id,
    organizationId,
    targetType: "file_object",
    targetId: result.fileObject.id,
    action: "product_v1.file_object.tombstoned",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      deletedAt: result.fileObject.deletedAt,
      deleteReason: result.fileObject.deleteReason
    }
  });
  await emitProductV1Event(services, {
    organizationId,
    eventType: "product_v1.file_object.tombstoned",
    aggregateType: "file_object",
    aggregateId: result.fileObject.id,
    context,
    payload: {
      deletedAt: result.fileObject.deletedAt,
      deleteReason: result.fileObject.deleteReason
    }
  });
  return { statusCode: 200, body: { fileObject: result.fileObject } };
};

export const productV1ReportTemplatesRoute = (): JsonResult => ({
  statusCode: 200,
  body: {
    data: reportTemplateKeys.map((templateKey) => ({
      templateKey,
      supportedFormats: ["json", "pdf"],
      pdfStatus: "deterministic_product_v1_state_artifact",
      storageStatus: "metadata_state_until_object_storage_contract_is_wired"
    })),
    page: {
      nextCursor: null,
      limit: reportTemplateKeys.length
    }
  }
});

export const productV1ReportSnapshotsRoute = async (
  organizationId: string,
  query: URLSearchParams,
  body: Record<string, unknown>,
  method: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, method === "GET" ? undefined : [
    "owner",
    "org_admin",
    "compliance_manager",
    "auditor"
  ]);
  if (method === "GET") {
    return paginated(await services.productV1.listReportSnapshots(organizationId), query);
  }
  const format = reportSnapshotFormat(optionalString(body, "format"));
  const requestIdempotencyKey = idempotencyKey(context);
  if (requestIdempotencyKey) {
    const existingOperation = await services.productV1.findOperationByIdempotencyKey({
      organizationId,
      kind: "report",
      idempotencyKey: requestIdempotencyKey
    });
    if (existingOperation) {
      return { statusCode: 202, body: operationBody(existingOperation) };
    }
  }
  const operation = await services.productV1.createOperation({
    organizationId,
    kind: "report",
    idempotencyKey: requestIdempotencyKey,
    targetType: "report_snapshot",
    status: "running",
    progress: {
      stage: "creating_snapshot",
      format
    }
  });
  const locale = localeValue(optionalString(body, "locale") ?? "en");
  const legalCaveat = resolveLegalCaveatMessage(locale);
  try {
    const snapshot = await services.productV1.createReportSnapshot({
      organizationId,
      templateKey: reportTemplateKey(body.templateKey),
      locale,
      format,
      version: optionalString(body, "version") ?? "v1",
      legalCaveat: legalCaveat.text,
      legalCaveatLocale: legalCaveat.resolvedLocale,
      legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
      sourceReferences: stringArray(body.sourceReferences, []),
      content: recordValue(body.content) ?? {},
      createdByUserId: session.user.id
    });
    await auditV1(
      services,
      session.user.id,
      organizationId,
      "report_snapshot",
      snapshot.reportSnapshot.id,
      "product_v1.report_snapshot.created",
      context,
      {
        format: snapshot.reportSnapshot.format,
        fileObjectId: snapshot.fileObject.id,
        checksumSha256: snapshot.reportSnapshot.checksumSha256
      }
    );
    await emitProductV1Event(services, {
      organizationId,
      eventType: "product_v1.report_snapshot.created",
      aggregateType: "report_snapshot",
      aggregateId: snapshot.reportSnapshot.id,
      context,
      payload: {
        templateKey: snapshot.reportSnapshot.templateKey,
        locale: snapshot.reportSnapshot.locale,
        format: snapshot.reportSnapshot.format,
        fileObjectId: snapshot.fileObject.id,
        checksumSha256: snapshot.reportSnapshot.checksumSha256,
        sourceReferences: snapshot.reportSnapshot.sourceReferences
      }
    });
    const completed = await services.productV1.updateOperation({
      ...operation,
      targetId: snapshot.reportSnapshot.id,
      status: "succeeded",
      progress: {
        stage: "completed",
        format: snapshot.reportSnapshot.format
      },
      result: snapshot
    });
    return { statusCode: 202, body: operationBody(completed) };
  } catch (error) {
    await services.productV1.updateOperation({
      ...operation,
      status: "failed",
      error: productV1ErrorRecord(error)
    });
    throw error;
  }
};

export const productV1DownloadReportSnapshotRoute = async (
  organizationId: string,
  reportSnapshotId: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<BinaryResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, [
    "owner",
    "org_admin",
    "compliance_manager",
    "auditor"
  ]);
  const reportSnapshot = await services.productV1.getReportSnapshot(organizationId, reportSnapshotId);
  if (!reportSnapshot) {
    throw new AuthError("not_found", "Report snapshot was not found.", 404);
  }
  const artifact = renderProductV1ReportSnapshotArtifact(reportSnapshot);
  if (artifact.checksumSha256 !== reportSnapshot.checksumSha256) {
    throw new AuthError("invalid_request", "Report snapshot checksum verification failed.", 409);
  }
  await auditV1(
    services,
    session.user.id,
    organizationId,
    "report_snapshot",
    reportSnapshot.id,
    "product_v1.report_snapshot.downloaded",
    context,
    {
      format: reportSnapshot.format,
      checksumSha256: artifact.checksumSha256,
      fileObjectId: reportSnapshot.fileObjectId
    }
  );
  return {
    kind: "binary",
    statusCode: 200,
    body: artifact.body,
    headers: {
      "cache-control": "no-store",
      "content-type": artifact.mimeType,
      "content-disposition": `attachment; filename="${artifact.filename}"`,
      "x-puresoc-content-sha256": artifact.checksumSha256,
      "x-puresoc-file-object-id": reportSnapshot.fileObjectId,
      "x-puresoc-renderer": artifact.renderer
    }
  };
};

export const productV1GetOperationRoute = async (
  operationId: string,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  const operation = await services.productV1.getOperation(operationId);
  if (!operation) {
    throw new AuthError("not_found", "Operation was not found.", 404);
  }
  if (operation.organizationId) {
    await requireOrganizationAccess(cookieHeader, services, operation.organizationId);
  } else {
    await readSession(cookieHeader, services);
  }
  return { statusCode: 200, body: { operation } };
};

export const productV1InternalEventsRoute = async (
  organizationId: string,
  query: URLSearchParams,
  cookieHeader: string | undefined,
  services: ApiServices
): Promise<JsonResult> => {
  await requireOrganizationAccess(cookieHeader, services, organizationId, [
    "owner",
    "org_admin",
    "compliance_manager",
    "security_operator",
    "auditor"
  ]);
  return paginated(await services.productV1.listInternalEvents(organizationId), query);
};

export const productV1InternalEventPublishResultRoute = async (
  organizationId: string,
  eventId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, ["owner", "org_admin", "security_operator"]);
  let event;
  try {
    event = await services.productV1.updateInternalEventStatus({
      organizationId,
      eventId,
      outboxStatus: internalEventStatus(body.outboxStatus),
      failureReason: optionalString(body, "failureReason") ?? null,
      nextAttemptAt: optionalString(body, "nextAttemptAt") ?? null
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unknown product v1 internal_event")) {
      throw new AuthError("not_found", "Internal event was not found for this organization.", 404);
    }
    throw error;
  }
  await services.auditWriter.write({
    actorUserId: session.user.id,
    organizationId,
    targetType: "internal_event",
    targetId: event.id,
    action: "product_v1.internal_event.publish_result_recorded",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson: {
      outboxStatus: event.outboxStatus,
      attempts: event.attempts,
      publishedAt: event.publishedAt,
      failureReason: event.failureReason,
      nextAttemptAt: event.nextAttemptAt
    }
  });
  return { statusCode: 200, body: { internalEvent: event } };
};

export const productV1NotificationsRoute = async (
  organizationId: string,
  query: URLSearchParams,
  body: Record<string, unknown>,
  method: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, method === "GET" ? undefined : [
    "owner",
    "org_admin",
    "compliance_manager",
    "security_operator"
  ]);
  if (method === "GET") {
    return paginated(await services.productV1.listNotificationItems(organizationId), query);
  }

  const notification = await services.productV1.createNotificationItem({
    organizationId,
    title: requiredString(body, "title", "Notification title"),
    body: optionalString(body, "body") ?? null,
    category: notificationCategory(body.category),
    severity: notificationSeverity(body.severity),
    status: "unread",
    sourceResourceType: optionalString(body, "sourceResourceType") ?? null,
    sourceResourceId: optionalString(body, "sourceResourceId") ?? null,
    actionHref: optionalString(body, "actionHref") ?? null,
    createdByUserId: session.user.id,
    readAt: null,
    archivedAt: null,
    suppressedAt: null
  });
  await auditV1(
    services,
    session.user.id,
    organizationId,
    "notification_item",
    notification.id,
    "product_v1.notification.created",
    context,
    { category: notification.category, severity: notification.severity }
  );
  await emitProductV1Event(services, {
    organizationId,
    eventType: "product_v1.notification.created",
    aggregateType: "notification_item",
    aggregateId: notification.id,
    context,
    payload: {
      category: notification.category,
      severity: notification.severity,
      sourceResourceType: notification.sourceResourceType,
      sourceResourceId: notification.sourceResourceId
    }
  });
  return { statusCode: 201, body: { notification } };
};

export const productV1NotificationUpdateRoute = async (
  organizationId: string,
  notificationId: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId);
  let result;
  try {
    result = await services.productV1.updateNotificationItem({
      organizationId,
      notificationId,
      status: notificationStatus(body.status ?? (body.read === true ? "read" : undefined))
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unknown product v1 notification_item")) {
      throw new AuthError("not_found", "Notification was not found for this organization.", 404);
    }
    throw error;
  }
  await services.auditWriter.write({
    actorUserId: session.user.id,
    organizationId,
    targetType: "notification_item",
    targetId: notificationId,
    action: "product_v1.notification.updated",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    beforeJson: result.before,
    afterJson: result.after
  });
  await emitProductV1Event(services, {
    organizationId,
    eventType: "product_v1.notification.updated",
    aggregateType: "notification_item",
    aggregateId: notificationId,
    context,
    payload: {
      beforeStatus: result.before.status,
      afterStatus: result.after.status
    }
  });
  return { statusCode: 200, body: { notification: result.after } };
};

export const productV1NotificationPreferencesRoute = async (
  organizationId: string,
  body: Record<string, unknown>,
  method: string,
  cookieHeader: string | undefined,
  context: V1Context,
  services: ApiServices
): Promise<JsonResult> => {
  const session = await requireOrganizationAccess(cookieHeader, services, organizationId, method === "GET" ? undefined : [
    "owner",
    "org_admin",
    "compliance_manager"
  ]);
  if (method === "GET") {
    return {
      statusCode: 200,
      body: { notificationPreferences: await services.productV1.getNotificationPreferences(organizationId) }
    };
  }

  const before = await services.productV1.getNotificationPreferences(organizationId);
  const notificationPreferences = await services.productV1.saveNotificationPreferences({
    organizationId,
    digestFrequency: notificationDigestFrequency(body.digestFrequency),
    suppressedCategories: stringArray(body.suppressedCategories, []).map(notificationCategory),
    mutedUntil: optionalString(body, "mutedUntil") ?? null,
    updatedByUserId: session.user.id
  });
  await services.auditWriter.write({
    actorUserId: session.user.id,
    organizationId,
    targetType: "notification_preferences",
    targetId: notificationPreferences.id,
    action: "product_v1.notification_preferences.updated",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    beforeJson: before,
    afterJson: notificationPreferences
  });
  await emitProductV1Event(services, {
    organizationId,
    eventType: "product_v1.notification_preferences.updated",
    aggregateType: "notification_preferences",
    aggregateId: notificationPreferences.id,
    context,
    payload: {
      digestFrequency: notificationPreferences.digestFrequency,
      suppressedCategories: notificationPreferences.suppressedCategories
    }
  });
  return { statusCode: 200, body: { notificationPreferences } };
};

const listAggregate = async (resource: string, organizationId: string, services: ApiServices): Promise<unknown[]> => {
  switch (resource) {
    case "assets":
      return services.productV1.listAssets(organizationId);
    case "findings":
      return services.productV1.listFindings(organizationId);
    case "remediation-plans":
      return services.productV1.listRemediationPlans(organizationId);
    case "tasks":
      return services.productV1.listTasks(organizationId);
    case "incidents":
      return services.productV1.listIncidents(organizationId);
    case "risks":
      return services.productV1.listRisks(organizationId);
    case "policies":
      return services.productV1.listPolicies(organizationId);
    case "supplier-reviews":
      return services.productV1.listSupplierReviews(organizationId);
    case "policy-reviews":
      return services.productV1.listPolicyReviews(organizationId);
    case "policy-acknowledgements":
      return services.productV1.listPolicyAcknowledgements(organizationId);
    case "governance-activities":
      return services.productV1.listGovernanceActivities(organizationId);
    case "governance-calendar-events":
      return services.productV1.listGovernanceCalendarEvents(organizationId);
    case "attestations":
      return services.productV1.listAttestations(organizationId);
    case "training-records":
      return services.productV1.listTrainingRecords(organizationId);
    default:
      throw new AuthError("not_found", "Unknown v1 resource.", 404);
  }
};

const createAggregate = async (
  resource: string,
  organizationId: string,
  body: Record<string, unknown>,
  services: ApiServices
): Promise<{ id: string }> => {
  switch (resource) {
    case "assets":
      return services.productV1.createAsset({
        organizationId,
        assetType: optionalString(body, "assetType") ?? "manual_system",
        displayName: requiredString(body, "displayName", "Asset display name"),
        source: body.source === "provider" ? "provider" : "manual",
        lifecycleState: "active"
      });
    case "findings":
      return services.productV1.createFinding({
        organizationId,
        title: requiredString(body, "title", "Finding title"),
        severity: severity(body.severity),
        status: "open",
        ownerUserId: optionalString(body, "ownerUserId") ?? null,
        sourceType: body.sourceType === "provider" ? "provider" : "manual"
      });
    case "remediation-plans":
      return services.productV1.createRemediationPlan({
        organizationId,
        objective: requiredString(body, "objective", "Remediation objective"),
        status: "draft",
        ownerUserId: optionalString(body, "ownerUserId") ?? null
      });
    case "tasks":
      return services.productV1.createTask({
        organizationId,
        title: requiredString(body, "title", "Task title"),
        status: "TODO",
        priority: severity(body.priority),
        ownerUserId: optionalString(body, "ownerUserId") ?? null,
        dueDate: optionalString(body, "dueDate") ?? null
      });
    case "incidents":
      return services.productV1.createIncident({
        organizationId,
        title: requiredString(body, "title", "Incident title"),
        awarenessTime: optionalString(body, "awarenessTime")
      });
    case "risks":
      return services.productV1.createRisk({
        organizationId,
        statement: requiredString(body, "statement", "Risk statement"),
        state: "IDENTIFIED",
        inherentScore: boundedScore(body.inherentScore),
        residualScore: boundedScore(body.residualScore),
        treatment: body.treatment === "accept" ? "accept" : "mitigate",
        ownerUserId: optionalString(body, "ownerUserId") ?? null,
        reviewDueAt: optionalString(body, "reviewDueAt") ?? null
      });
    case "policies":
      return services.productV1.createPolicy({
        organizationId,
        title: requiredString(body, "title", "Policy title"),
        status: "draft",
        ownerUserId: optionalString(body, "ownerUserId") ?? null,
        reviewDueAt: optionalString(body, "reviewDueAt") ?? null
      });
    case "supplier-reviews":
      return services.productV1.createSupplierReview({
        organizationId,
        supplierId: requiredString(body, "supplierId", "Supplier ID"),
        status: "scheduled",
        outcome: "not_assessed",
        ownerUserId: optionalString(body, "ownerUserId") ?? null,
        reviewDueAt: optionalString(body, "reviewDueAt") ?? null,
        completedAt: null,
        evidenceFileObjectIds: stringArray(body.evidenceFileObjectIds, []),
        riskIds: stringArray(body.riskIds, []),
        notes: optionalString(body, "notes") ?? null
      });
    case "policy-reviews":
      return services.productV1.createPolicyReview({
        organizationId,
        policyDocumentId: requiredString(body, "policyDocumentId", "Policy document ID"),
        status: "scheduled",
        reviewerUserId: optionalString(body, "reviewerUserId") ?? null,
        reviewDueAt: optionalString(body, "reviewDueAt") ?? null,
        completedAt: null,
        comments: optionalString(body, "comments") ?? null
      });
    case "policy-acknowledgements":
      return services.productV1.createPolicyAcknowledgement({
        organizationId,
        policyDocumentId: requiredString(body, "policyDocumentId", "Policy document ID"),
        acknowledgedByUserId: requiredString(body, "acknowledgedByUserId", "Acknowledging user ID"),
        status: "pending",
        dueAt: optionalString(body, "dueAt") ?? null,
        acknowledgedAt: null
      });
    case "governance-activities":
      return services.productV1.createGovernanceActivity({
        organizationId,
        activityType: governanceActivityType(body.activityType),
        title: requiredString(body, "title", "Governance activity title"),
        status: "planned",
        ownerUserId: optionalString(body, "ownerUserId") ?? null,
        dueAt: optionalString(body, "dueAt") ?? null,
        completedAt: null,
        linkedRiskIds: stringArray(body.linkedRiskIds, []),
        linkedPolicyIds: stringArray(body.linkedPolicyIds, []),
        linkedSupplierIds: stringArray(body.linkedSupplierIds, [])
      });
    case "governance-calendar-events":
      return services.productV1.createGovernanceCalendarEvent({
        organizationId,
        title: requiredString(body, "title", "Governance calendar event title"),
        eventType: governanceCalendarEventType(body.eventType),
        startsAt: optionalString(body, "startsAt") ?? new Date().toISOString(),
        dueAt: optionalString(body, "dueAt") ?? null,
        status: "scheduled",
        ownerUserId: optionalString(body, "ownerUserId") ?? null,
        sourceResourceType: optionalString(body, "sourceResourceType") ?? null,
        sourceResourceId: optionalString(body, "sourceResourceId") ?? null,
        recurrence: governanceRecurrence(body.recurrence)
      });
    case "attestations":
      return services.productV1.createAttestation({
        organizationId,
        title: requiredString(body, "title", "Attestation title"),
        scope: optionalString(body, "scope") ?? "organization",
        status: "open",
        attestedByUserId: optionalString(body, "attestedByUserId") ?? null,
        dueAt: optionalString(body, "dueAt") ?? null,
        submittedAt: null,
        evidenceFileObjectIds: stringArray(body.evidenceFileObjectIds, []),
        sourceReferences: stringArray(body.sourceReferences, [])
      });
    case "training-records":
      return services.productV1.createTrainingRecord({
        organizationId,
        subject: requiredString(body, "subject", "Training subject"),
        assigneeUserId: optionalString(body, "assigneeUserId") ?? null,
        personId: optionalString(body, "personId") ?? null,
        status: "assigned",
        assignedAt: optionalString(body, "assignedAt") ?? new Date().toISOString(),
        dueAt: optionalString(body, "dueAt") ?? null,
        completedAt: null,
        evidenceFileObjectIds: stringArray(body.evidenceFileObjectIds, [])
      });
    default:
      throw new AuthError("not_found", "Unknown v1 resource.", 404);
  }
};

const updateAggregate = async (
  resource: string,
  organizationId: string,
  recordId: string,
  body: Record<string, unknown>,
  services: ApiServices
): Promise<{ before: { id: string; organizationId: string }; after: { id: string; organizationId: string } }> => {
  const completedAt = optionalNullableStringUpdate(body, "completedAt");
  switch (resource) {
    case "findings":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, ["open", "in_progress", "accepted_risk", "suppressed", "remediated", "verified", "reopened"], "status"),
        ownerUserId: optionalNullableStringUpdate(body, "ownerUserId")
      }));
    case "remediation-plans":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, ["draft", "active", "completed", "canceled"], "status"),
        ownerUserId: optionalNullableStringUpdate(body, "ownerUserId")
      }));
    case "tasks":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, ["TODO", "IN_PROGRESS", "BLOCKED", "AWAITING_REVIEW", "DONE", "CANCELED"], "status"),
        priority: enumUpdate(body.priority, ["low", "medium", "high", "critical"], "priority"),
        ownerUserId: optionalNullableStringUpdate(body, "ownerUserId"),
        dueDate: optionalNullableStringUpdate(body, "dueDate")
      }));
    case "incidents":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, [
          "NEW",
          "TRIAGE",
          "INVESTIGATING",
          "CONTAINMENT",
          "ERADICATION",
          "RECOVERY",
          "MONITORING",
          "RESOLVED",
          "CLOSED",
          "REOPENED"
        ], "status")
      }));
    case "risks":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        state: enumUpdate(body.state, [
          "IDENTIFIED",
          "ASSESSMENT_REQUIRED",
          "ASSESSED",
          "TREATMENT_PLANNED",
          "TREATMENT_IN_PROGRESS",
          "MONITORING",
          "ACCEPTED",
          "TRANSFERRED",
          "CLOSED",
          "REOPENED"
        ], "state"),
        treatment: enumUpdate(body.treatment, ["mitigate", "accept", "transfer", "avoid"], "treatment"),
        inherentScore: integerUpdate(body, "inherentScore", 1, 25),
        residualScore: integerUpdate(body, "residualScore", 1, 25),
        ownerUserId: optionalNullableStringUpdate(body, "ownerUserId"),
        reviewDueAt: optionalNullableStringUpdate(body, "reviewDueAt")
      }));
    case "policies":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, ["draft", "under_review", "approved", "published", "superseded", "retired"], "status"),
        ownerUserId: optionalNullableStringUpdate(body, "ownerUserId"),
        reviewDueAt: optionalNullableStringUpdate(body, "reviewDueAt")
      }));
    case "supplier-reviews":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, ["scheduled", "in_progress", "completed", "overdue", "canceled"], "status"),
        outcome: enumUpdate(body.outcome, ["not_assessed", "acceptable", "gaps_found", "remediation_required", "blocked"], "outcome"),
        ownerUserId: optionalNullableStringUpdate(body, "ownerUserId"),
        reviewDueAt: optionalNullableStringUpdate(body, "reviewDueAt"),
        completedAt,
        evidenceFileObjectIds: arrayUpdate(body, "evidenceFileObjectIds"),
        riskIds: arrayUpdate(body, "riskIds"),
        notes: optionalNullableStringUpdate(body, "notes")
      }));
    case "policy-reviews":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, ["scheduled", "in_progress", "approved", "changes_requested", "superseded", "canceled"], "status"),
        reviewerUserId: optionalNullableStringUpdate(body, "reviewerUserId"),
        reviewDueAt: optionalNullableStringUpdate(body, "reviewDueAt"),
        completedAt,
        comments: optionalNullableStringUpdate(body, "comments")
      }));
    case "policy-acknowledgements":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, ["pending", "acknowledged", "overdue", "revoked"], "status"),
        dueAt: optionalNullableStringUpdate(body, "dueAt"),
        acknowledgedAt: optionalNullableStringUpdate(body, "acknowledgedAt")
      }));
    case "governance-activities":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, ["planned", "in_progress", "completed", "blocked", "canceled"], "status"),
        ownerUserId: optionalNullableStringUpdate(body, "ownerUserId"),
        dueAt: optionalNullableStringUpdate(body, "dueAt"),
        completedAt,
        linkedRiskIds: arrayUpdate(body, "linkedRiskIds"),
        linkedPolicyIds: arrayUpdate(body, "linkedPolicyIds"),
        linkedSupplierIds: arrayUpdate(body, "linkedSupplierIds")
      }));
    case "governance-calendar-events":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, ["scheduled", "completed", "overdue", "canceled"], "status"),
        dueAt: optionalNullableStringUpdate(body, "dueAt"),
        ownerUserId: optionalNullableStringUpdate(body, "ownerUserId")
      }));
    case "attestations":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, ["draft", "open", "submitted", "accepted", "rejected"], "status"),
        attestedByUserId: optionalNullableStringUpdate(body, "attestedByUserId"),
        dueAt: optionalNullableStringUpdate(body, "dueAt"),
        submittedAt: optionalNullableStringUpdate(body, "submittedAt"),
        evidenceFileObjectIds: arrayUpdate(body, "evidenceFileObjectIds"),
        sourceReferences: arrayUpdate(body, "sourceReferences")
      }));
    case "training-records":
      return services.productV1.updateStoredRecord(resourceRecordType(resource), organizationId, recordId, stripUndefined({
        status: enumUpdate(body.status, ["assigned", "completed", "overdue", "waived"], "status"),
        assigneeUserId: optionalNullableStringUpdate(body, "assigneeUserId"),
        personId: optionalNullableStringUpdate(body, "personId"),
        dueAt: optionalNullableStringUpdate(body, "dueAt"),
        completedAt,
        evidenceFileObjectIds: arrayUpdate(body, "evidenceFileObjectIds")
      }));
    default:
      throw new AuthError("not_found", "Unknown v1 resource.", 404);
  }
};

const readSession = async (cookieHeader: string | undefined, services: ApiServices) => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  return services.localAuth.getSession(sessionToken ?? "");
};

const requireOrganizationAccess = async (
  cookieHeader: string | undefined,
  services: ApiServices,
  organizationId: string,
  allowedRoles: readonly PureSocRoleKey[] = ["owner", "org_admin", "compliance_manager", "security_operator", "auditor"]
) => {
  const session = await readSession(cookieHeader, services);
  await requireOrganizationRole({
    repository: services.rbacRepository,
    userId: session.user.id,
    organizationId,
    allowedRoles
  });
  return session;
};

const requirePartnerRole = async (
  services: ApiServices,
  partnerId: string,
  userId: string,
  allowedRoles: readonly string[]
) => {
  const member = await services.partnerRepository.findPartnerMember(partnerId, userId);
  const partner = await services.partnerRepository.findPartnerById(partnerId);
  if (!partner || partner.status !== "active" || !member || member.status !== "active" || !allowedRoles.includes(member.role)) {
    throw new AuthError("forbidden", "Partner role is not permitted for this operation.", 403);
  }
  return member;
};

const backfillActivePartnerGrants = async (partnerId: string, services: ApiServices): Promise<void> => {
  const grants = await services.partnerRepository.listPartnerTenantGrants(partnerId);
  for (const grant of grants) {
    if (grant.status === "active") {
      await services.productV1.backfillRelationshipFromGrant({
        partnerId,
        customerOrganizationId: grant.organizationId,
        grantedByUserId: grant.grantedByUserId,
        accessLevel: grant.accessLevel
      });
    }
  }
};

const primaryMicrosoftConnection = async (organizationId: string, services: ApiServices) => {
  const connections = await services.providerConnections.listConnections(organizationId);
  return connections.connections.find((connection) => connection.providerKey === "microsoft365") ?? null;
};

const capabilityView = (capability: ProviderCapabilityRecord): {
  capabilityKey: string;
  moduleKey: string;
  state: ProductV1CapabilityState;
  statusReason: string | null;
  permissionsRequired: string[];
  licenseRequired: string[];
} => ({
  capabilityKey: capability.capabilityKey,
  moduleKey: capability.moduleKey,
  state: normalizeCapabilityState(capability),
  statusReason: capability.statusReason ?? null,
  permissionsRequired: capability.permissionsRequired,
  licenseRequired: capability.licenseRequired
});

const normalizeCapabilityState = (capability: ProviderCapabilityRecord): ProductV1CapabilityState => {
  if (capability.available) {
    return "AVAILABLE";
  }
  if (capability.status === "missing_permission") {
    return "PERMISSION_REQUIRED";
  }
  if (capability.status === "unavailable_license") {
    return "LICENSE_REQUIRED";
  }
  if (capability.status === "revoked_consent") {
    return "CONSENT_EXPIRED";
  }
  if (capability.status === "unsupported_api") {
    return "UNSUPPORTED_CLOUD";
  }
  if (capability.status === "rate_limited" || capability.status === "pending" || capability.status === "running") {
    return "TEMPORARILY_UNAVAILABLE";
  }
  return "ERROR";
};

const normalizeClassificationOutcome = (result: string): ProductV1ClassificationOutcome => {
  if (result === "likely_essential" || result === "essential_entity") {
    return "LIKELY_ESSENTIAL_OR_EQUIVALENT";
  }
  if (result === "likely_important" || result === "important_entity" || result === "possibly_in_scope") {
    return "LIKELY_IMPORTANT_OR_EQUIVALENT";
  }
  if (result === "out_of_scope" || result === "not_applicable") {
    return "LIKELY_OUT_OF_SCOPE";
  }
  if (result === "special_designation_possible" || result === "voluntary_registration_possible") {
    return "SPECIAL_DESIGNATION_POSSIBLE";
  }
  if (result === "insufficient_data" || result === "unknown") {
    return "INSUFFICIENT_INFORMATION";
  }
  return "REQUIRES_PROFESSIONAL_REVIEW";
};

const countryPackContract = (pack: (typeof productV1CountryPackDefinitions)[number]) => ({
  countryCode: pack.countryCode,
  version: pack.packVersion,
  status: pack.status,
  reviewStatus: pack.status === "active" ? "approved" : "review_required",
  effectiveFrom: pack.effectiveDate,
  effectiveTo: null,
  supportedLocales,
  localizedTerms: {
    legalCaveat: Object.fromEntries(
      supportedLocales.map((locale) => {
        const caveat = resolveLegalCaveatMessage(locale);
        return [
          locale,
          {
            text: caveat.text,
            resolvedLocale: caveat.resolvedLocale,
            fallbackUsed: caveat.fallbackUsed,
            reviewStatus: caveat.reviewStatus
          }
        ];
      })
    )
  },
  authorityDirectory: pack.authorityGuidance.map((guidance, index) => ({
    id: `${pack.countryCode.toLowerCase()}-authority-guidance-${index + 1}`,
    guidance,
    reviewRequired: pack.status !== "active"
  })),
  incidentRules: pack.registrationGuidance.map((guidance, index) => ({
    id: `${pack.countryCode.toLowerCase()}-registration-guidance-${index + 1}`,
    guidance,
    reviewRequired: pack.status !== "active"
  })),
  sourceReferences: pack.officialSources,
  impactAnalysis: {
    status: "not_run",
    reason: "No prior activated country-pack version exists in this local workspace."
  },
  legalActivationBlocked: pack.status !== "active"
});

const operationBody = (operation: { id: string; status: string }) => ({
  operationId: operation.id,
  status: operation.status,
  links: {
    self: `/api/v1/operations/${operation.id}`
  }
});

const emitProductV1Event = (
  services: ApiServices,
  input: {
    organizationId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    context: V1Context;
    payload?: Record<string, unknown>;
    outboxStatus?: ProductV1InternalEventStatus;
  }
) =>
  services.productV1.createInternalEvent({
    organizationId: input.organizationId,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    idempotencyKey: [
      input.context.requestId ?? "no-request-id",
      input.context.correlationId ?? "no-correlation-id",
      input.eventType,
      input.aggregateType,
      input.aggregateId
    ].join(":"),
    outboxStatus: input.outboxStatus,
    payload: {
      requestId: input.context.requestId ?? null,
      correlationId: input.context.correlationId ?? null,
      ...(input.payload ?? {})
    }
  }).then(() => undefined);

const paginated = <T>(items: T[], query: URLSearchParams): JsonResult => {
  const limit = Math.min(Math.max(Number(query.get("limit") ?? 50) || 50, 1), 100);
  const cursor = query.get("cursor");
  const offset = cursor ? Math.max(Number(cursor) || 0, 0) : 0;
  const filtered = applyFilters(items, query);
  const data = filtered.slice(offset, offset + limit);
  const nextOffset = offset + data.length;
  return {
    statusCode: 200,
    body: {
      data,
      page: {
        nextCursor: nextOffset < filtered.length ? String(nextOffset) : null,
        limit
      }
    }
  };
};

const applyFilters = <T>(items: T[], query: URLSearchParams): T[] => {
  const filters = [...query.entries()].filter(([key]) => key.startsWith("filter[") && key.endsWith("]"));
  if (filters.length === 0) {
    return items;
  }
  return items.filter((item) =>
    filters.every(([key, value]) => {
      const field = key.slice("filter[".length, -1);
      const record = item as Record<string, unknown>;
      return String(record[field] ?? "") === value;
    })
  );
};

const idempotencyKey = (context: V1Context): string | null =>
  "idempotencyKey" in context ? context.idempotencyKey : context.requestId ?? null;

const requiredString = (body: Record<string, unknown>, key: string, label = key): string => {
  const value = optionalString(body, key);
  if (!value) {
    throw new AuthError("invalid_request", `${label} is required.`, 400);
  }
  return value;
};

const optionalString = (body: Record<string, unknown>, key: string): string | undefined => {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const stringArray = (value: unknown, fallback?: string[]): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : fallback ?? [];

const recordValue = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const resourceRecordType = (resource: string): ProductV1RecordType => {
  const recordType = ({
    assets: "asset",
    findings: "finding",
    "remediation-plans": "remediation_plan",
    tasks: "task",
    incidents: "incident",
    risks: "risk",
    policies: "policy",
    "supplier-reviews": "supplier_review",
    "policy-reviews": "policy_review",
    "policy-acknowledgements": "policy_acknowledgement",
    "governance-activities": "governance_activity",
    "governance-calendar-events": "governance_calendar_event",
    attestations: "attestation",
    "training-records": "training_record"
  } as const)[resource];
  if (!recordType) {
    throw new AuthError("not_found", "Unknown v1 resource.", 404);
  }
  return recordType;
};

const retentionClass = (value: unknown): ProductV1RetentionClass => {
  if (value === "evidence" || value === "report_snapshot" || value === "audit_export" || value === "temporary") {
    return value;
  }
  return "evidence";
};

const filePurpose = (value: unknown): ProductV1FilePurpose => {
  if (
    value === "uploaded_evidence" ||
    value === "generated_report" ||
    value === "audit_export" ||
    value === "policy_document" ||
    value === "incident_package"
  ) {
    return value;
  }
  return "uploaded_evidence";
};

const fileScanStatus = (value: unknown): ProductV1FileScanStatus => {
  if (value === "clean" || value === "infected" || value === "failed" || value === "skipped") {
    return value;
  }
  return "pending";
};

const internalEventStatus = (value: unknown): ProductV1InternalEventStatus => {
  if (value === "published" || value === "failed" || value === "skipped" || value === "pending") {
    return value;
  }
  throw new AuthError("invalid_request", "outboxStatus must be pending, published, failed, or skipped.", 400);
};

const notificationCategories: readonly ProductV1NotificationCategory[] = [
  "system",
  "compliance",
  "incident",
  "evidence",
  "remediation",
  "connector",
  "governance"
];

const notificationCategory = (value: unknown): ProductV1NotificationCategory => {
  if (notificationCategories.includes(value as ProductV1NotificationCategory)) {
    return value as ProductV1NotificationCategory;
  }
  return "system";
};

const notificationSeverity = (value: unknown): ProductV1NotificationSeverity => {
  if (value === "low" || value === "medium" || value === "high" || value === "critical") {
    return value;
  }
  return "info";
};

const notificationStatus = (value: unknown): ProductV1NotificationStatus => {
  if (value === "unread" || value === "read" || value === "archived" || value === "suppressed") {
    return value;
  }
  throw new AuthError("invalid_request", "status must be unread, read, archived, or suppressed.", 400);
};

const notificationDigestFrequency = (value: unknown): ProductV1NotificationDigestFrequency => {
  if (value === "off" || value === "weekly") {
    return value;
  }
  if (value === "daily") {
    return value;
  }
  return "off";
};

const governanceActivityType = (
  value: unknown
): "management_review" | "control_review" | "risk_review" | "supplier_review" | "training" | "attestation" => {
  if (
    value === "control_review" ||
    value === "risk_review" ||
    value === "supplier_review" ||
    value === "training" ||
    value === "attestation"
  ) {
    return value;
  }
  return "management_review";
};

const governanceCalendarEventType = (
  value: unknown
): "review" | "deadline" | "training" | "attestation" | "renewal" | "report" => {
  if (value === "deadline" || value === "training" || value === "attestation" || value === "renewal" || value === "report") {
    return value;
  }
  return "review";
};

const governanceRecurrence = (value: unknown): "none" | "monthly" | "quarterly" | "annual" | null => {
  if (value === "monthly" || value === "quarterly" || value === "annual") {
    return value;
  }
  return "none";
};

const checksumSha256 = (value: unknown): string => {
  if (typeof value === "string" && /^[a-f0-9]{64}$/i.test(value)) {
    return value.toLowerCase();
  }
  throw new AuthError("invalid_request", "checksumSha256 must be a 64-character SHA-256 hex digest.", 400);
};

const storageMetadata = (value: unknown): { provider: string; bucket?: string | null; key: string; versionId?: string | null } => {
  const storage = recordValue(value);
  if (!storage) {
    throw new AuthError("invalid_request", "storage metadata is required.", 400);
  }
  return {
    provider: requiredString(storage, "provider", "Storage provider"),
    bucket: optionalString(storage, "bucket") ?? null,
    key: requiredString(storage, "key", "Storage key"),
    versionId: optionalString(storage, "versionId") ?? null
  };
};

const encryptionMetadata = (
  value: unknown
): { mode?: "provider_managed" | "customer_managed" | "local_development"; algorithm?: string | null; keyRef?: string | null } => {
  const encryption = recordValue(value);
  if (!encryption) {
    return {};
  }
  const mode = encryption.mode;
  return {
    mode:
      mode === "customer_managed" || mode === "local_development" || mode === "provider_managed"
        ? mode
        : "provider_managed",
    algorithm: optionalString(encryption, "algorithm") ?? null,
    keyRef: optionalString(encryption, "keyRef") ?? null
  };
};

const localeValue = (value: string): "en" | "ro" | "pl" | "de" => {
  if (value === "en" || value === "ro" || value === "pl" || value === "de") {
    return value;
  }
  throw new AuthError("invalid_request", "locale must be one of en, ro, pl, or de.", 400);
};

const reportSnapshotFormat = (value: string | undefined): ReportSnapshotFormat => {
  if (value === undefined || value === "json") {
    return "json";
  }
  if (value === "pdf") {
    return "pdf";
  }
  throw new AuthError("invalid_request", "format must be json or pdf.", 400);
};

const reportTemplateKey = (value: unknown): ReportTemplateKey => {
  if (reportTemplateKeys.includes(value as ReportTemplateKey)) {
    return value as ReportTemplateKey;
  }
  throw new AuthError("invalid_request", "templateKey is not a supported report template.", 400);
};

const assertSetupStep = (step: string): ProductV1SetupStep => {
  if (!productV1SetupSteps.includes(step as ProductV1SetupStep)) {
    throw new AuthError("invalid_request", "Unsupported setup step.", 400);
  }
  return step as ProductV1SetupStep;
};

const booleanValue = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);

const integerValue = (value: unknown): number | undefined =>
  Number.isInteger(value) ? (value as number) : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : undefined;

const boundedInteger = (value: unknown, minimum: number, maximum: number): number => {
  const parsed = integerValue(value);
  if (parsed === undefined || parsed < minimum || parsed > maximum) {
    throw new AuthError("invalid_request", `Integer value must be between ${minimum} and ${maximum}.`, 400);
  }
  return parsed;
};

const integerUpdate = (
  body: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number
): number | undefined => (hasOwn(body, key) ? boundedInteger(body[key], minimum, maximum) : undefined);

const enumUpdate = <T extends string>(value: unknown, allowed: readonly T[], field: string): T | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }
  throw new AuthError("invalid_request", `${field} is not a supported lifecycle value.`, 400);
};

const arrayUpdate = (body: Record<string, unknown>, key: string): string[] | undefined =>
  hasOwn(body, key) ? stringArray(body[key], []) : undefined;

const optionalNullableStringUpdate = (body: Record<string, unknown>, key: string): string | null | undefined =>
  hasOwn(body, key) ? optionalString(body, key) ?? null : undefined;

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;

const hasOwn = (body: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(body, key);

const boundedScore = (value: unknown): number => Math.min(Math.max(integerValue(value) ?? 1, 1), 25);

const criticality = (value: unknown): "low" | "medium" | "high" | "critical" =>
  value === "low" || value === "high" || value === "critical" ? value : "medium";

const severity = (value: unknown): "low" | "medium" | "high" | "critical" =>
  value === "low" || value === "high" || value === "critical" ? value : "medium";

const singular = (resource: string): string =>
  resource.endsWith("ies") ? `${resource.slice(0, -3)}y` : resource.endsWith("s") ? resource.slice(0, -1) : resource;

const productV1ErrorRecord = (error: unknown): Record<string, unknown> => {
  if (error instanceof AuthError) {
    return {
      code: error.code,
      message: error.message
    };
  }
  return {
    code: "internal_error",
    message: "Request failed."
  };
};

const auditV1 = (
  services: ApiServices,
  actorUserId: string,
  organizationId: string,
  targetType: string,
  targetId: string,
  action: string,
  context: V1Context,
  afterJson?: Record<string, unknown>
): Promise<void> =>
  services.auditWriter.write({
    actorUserId,
    organizationId,
    targetType,
    targetId,
    action,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    afterJson
  }).then(() => undefined);
