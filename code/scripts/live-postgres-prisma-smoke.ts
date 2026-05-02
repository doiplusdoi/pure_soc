import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";

const schemaPath = "packages/database/prisma/schema.prisma";
const disposableConfirmationVariable = "PURESOC_DATABASE_SMOKE_CONFIRM_DISPOSABLE";

const main = async (): Promise<void> => {
  const databaseUrl = requireDisposableDatabaseUrl();
  log(`Target database: ${redactDatabaseUrl(databaseUrl)}`);

  await runPrisma(["migrate", "deploy", "--schema", schemaPath]);
  await runPrisma(["generate", "--schema", schemaPath]);

  const database = await import("@puresoc/database");
  const { AuditWriter } = await import("@puresoc/audit");
  const { LEGAL_CAVEAT_MESSAGE_KEY, resolveLegalCaveatMessage } = await import("@puresoc/shared");

  const prisma = database.createPrismaClient();
  const runId = randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  const organizationId = randomUUID();
  const userId = randomUUID();
  const assessmentId = randomUUID();
  const actorUserId = userId;
  const providerConnectionId = randomUUID();
  const evidenceArtifactId = randomUUID();
  const sourceId = randomUUID();
  const sourceVersionId = randomUUID();
  const sourceMapId = randomUUID();
  const actionTemplateId = randomUUID();
  const actionRunId = randomUUID();
  const notificationDraftId = randomUUID();
  const reportId = randomUUID();
  const dashboardSnapshotId = randomUUID();

  const checks: string[] = [];

  try {
    await prisma.$connect();
    const migrationRows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at ASC
    `;
    assert(migrationRows.some((row) => row.migration_name === "20260430000000_initial"), "Initial migration was not recorded.");
    assert(
      migrationRows.some((row) => row.migration_name === "20260502020000_oidc_authorization_state"),
      "OIDC authorization-state migration was not recorded."
    );
    checks.push(`migrations:${migrationRows.length}`);

    const identityRepository = new database.PrismaIdentityOrganizationRbacRepository(prisma);
    const auditSink = new database.PrismaAuditSink(prisma);
    const auditWriter = new AuditWriter({
      sink: auditSink,
      now: () => now
    });
    const oidcStore = new database.PrismaOidcAuthorizationStateStore(prisma, {
      codeVerifierEncryptionKey: "m31-live-postgres-smoke-local-key"
    });
    const providerStore = new database.PrismaProviderResourceStore(prisma, {
      now: () => now
    });
    const complianceRepository = new database.PrismaComplianceResultRepository(prisma);
    const evidenceRepository = new database.PrismaEvidenceRepository(prisma);
    const billingRepository = new database.PrismaBillingRepository(prisma);
    const regulatoryRepository = new database.PrismaRegulatorySourceRepository(prisma);
    const actionRepository = new database.PrismaActionRepository(prisma);
    const notificationRepository = new database.PrismaNotificationDraftRepository(prisma);
    const outputRepository = new database.PrismaOutputRecordRepository(prisma);

    const email = `m31-smoke-${runId}@example.invalid`;
    await identityRepository.createLocalAccount({
      user: {
        id: userId,
        email,
        displayName: "M31 Prisma smoke user",
        emailVerifiedAt: null,
        disabledAt: null,
        createdAt: now,
        updatedAt: now
      },
      identityAccount: {
        id: randomUUID(),
        userId,
        providerKey: "local",
        providerSubject: email,
        providerEmail: email,
        displayName: "M31 Prisma smoke user",
        createdAt: now,
        lastLoginAt: null
      },
      credential: {
        id: randomUUID(),
        userId,
        email,
        passwordHash: "argon2id$m31-smoke-password-hash",
        passwordHashAlgorithm: "argon2id",
        passwordUpdatedAt: now,
        emailVerifiedAt: now,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now
      },
      emailVerificationToken: {
        id: randomUUID(),
        userId,
        email,
        tokenHash: `sha256:${randomUUID()}`,
        expiresAt: new Date(now.getTime() + 3_600_000),
        usedAt: now,
        createdAt: now
      }
    });
    await identityRepository.createSession({
      id: randomUUID(),
      userId,
      activeOrganizationId: organizationId,
      sessionHash: `sha256:${randomUUID()}`,
      ipAddress: "127.0.0.1",
      userAgent: "puresoc-m31-live-postgres-smoke",
      expiresAt: new Date(now.getTime() + 3_600_000),
      revokedAt: null,
      createdAt: now
    });
    await identityRepository.createOrganization({
      id: organizationId,
      name: "M31 Prisma Smoke Organization",
      legalName: "M31 Prisma Smoke SRL",
      billingStatus: "none",
      defaultLocale: "en",
      primaryCountryCode: "RO",
      headquartersCountryCode: "RO",
      createdAt: now,
      updatedAt: now
    });
    await identityRepository.addOrganizationMember({
      id: randomUUID(),
      organizationId,
      userId,
      status: "active",
      createdAt: now,
      updatedAt: now
    });
    const ownerRole = await identityRepository.ensureRole({
      key: "owner",
      name: "Owner",
      description: "M31 smoke owner role"
    });
    await identityRepository.bindRole({
      id: randomUUID(),
      organizationId,
      userId,
      roleId: ownerRole.id,
      roleKey: "owner",
      scopeJson: {},
      createdAt: now
    });
    const roleBindings = await identityRepository.findRoleBindings(organizationId, userId);
    assert(roleBindings.some((binding) => binding.roleKey === "owner"), "Owner role binding was not readable.");
    checks.push("identity/session/org/rbac");

    const auditRecord = await auditWriter.write({
      actorUserId,
      organizationId,
      targetType: "smoke",
      targetId: runId,
      action: "m31.live_postgres_smoke",
      afterJson: {
        status: "started",
        accessToken: "should-be-redacted"
      }
    });
    const rawAuditRow = await prisma.auditLog.findUnique({
      where: {
        id: auditRecord.id
      }
    });
    assert(rawAuditRow?.entryHash, "Audit entry hash was not persisted.");
    assert(
      !JSON.stringify(rawAuditRow?.canonicalPayload ?? {}).includes("should-be-redacted"),
      "Audit canonical payload persisted a sensitive token-like value."
    );
    checks.push("audit");

    const codeVerifier = `m31-code-verifier-${runId}`;
    await oidcStore.saveAuthorizationState({
      id: randomUUID(),
      providerKey: "github",
      stateHash: `state-hash-${runId}`,
      nonceHash: `nonce-hash-${runId}`,
      codeVerifier,
      redirectUri: "http://localhost:3001/api/auth/oidc/github/callback",
      createdAt: now,
      expiresAt: new Date(now.getTime() + 600_000),
      consumedAt: null
    });
    const consumedState = await oidcStore.consumeAuthorizationState({
      providerKey: "github",
      stateHash: `state-hash-${runId}`,
      consumedAt: new Date(now.getTime() + 1_000)
    });
    assert(consumedState?.codeVerifier === codeVerifier, "OIDC state did not round-trip through the protected store.");
    const rawOidcRow = await prisma.oidcAuthorizationState.findFirst({
      where: {
        stateHash: `state-hash-${runId}`
      }
    });
    assert(
      rawOidcRow?.codeVerifierEnvelope && !rawOidcRow.codeVerifierEnvelope.includes(codeVerifier),
      "OIDC PKCE verifier was not protected at rest."
    );
    checks.push("oidc_transient_state");

    const connection = await providerStore.createConnection({
      id: providerConnectionId,
      organizationId,
      providerKey: "mock",
      displayName: "M31 smoke mock provider",
      externalTenantId: `tenant-${runId}`,
      externalTenantName: "M31 Smoke Tenant",
      status: "connected",
      readEnabled: true,
      writeEnabled: false,
      metadata: {
        smokeRunId: runId
      }
    });
    assert(connection.writeEnabled === false, "Provider write execution must remain disabled in the smoke.");
    await providerStore.upsertCredential({
      organizationId,
      providerConnectionId,
      providerKey: "mock",
      credentialType: "oauth_token",
      encryptedPayload: JSON.stringify({
        version: 1,
        ciphertext: `m31-smoke-ciphertext-${runId}`
      }),
      expiresAt: new Date(now.getTime() + 86_400_000).toISOString(),
      rotationRequired: false
    });
    await providerStore.upsertPermissionBundle({
      organizationId,
      providerConnectionId,
      providerKey: "mock",
      bundleKey: "m31_read_baseline",
      permissionsRequired: ["Directory.Read.All"],
      permissionsGranted: ["Directory.Read.All"],
      enabled: true
    });
    await providerStore.upsertCapability({
      organizationId,
      providerConnectionId,
      providerKey: "mock",
      moduleKey: "identity",
      capabilityKey: "identity_read",
      available: true,
      licenseRequired: [],
      licenseDetected: [],
      permissionsRequired: ["Directory.Read.All"],
      permissionsGranted: ["Directory.Read.All"],
      status: "succeeded",
      statusReason: null
    });
    const syncRun = await providerStore.createSyncRun({
      organizationId,
      providerConnectionId,
      providerKey: "mock"
    });
    await providerStore.upsertSyncModule({
      organizationId,
      providerConnectionId,
      syncRunId: syncRun.id,
      providerKey: "mock",
      moduleKey: "identity",
      status: "succeeded",
      missingPermissions: [],
      missingLicenses: [],
      statusReason: null,
      pagesRead: 1,
      retryCount: 0
    });
    const rawResource = await providerStore.upsertRawResource({
      organizationId,
      providerConnectionId,
      providerKey: "mock",
      externalId: `user-${runId}`,
      externalResourceType: "user",
      sourceModule: "identity",
      syncRunId: syncRun.id,
      rawJson: {
        id: `user-${runId}`,
        displayName: "M31 Smoke Admin"
      },
      observedAt: nowIso
    });
    const normalizedResource = await providerStore.upsertNormalizedResource({
      organizationId,
      providerConnectionId,
      providerKey: "mock",
      rawResourceId: rawResource.id,
      externalId: `user-${runId}`,
      externalResourceType: "user",
      resourceType: "cloud_user",
      sourceModule: "identity",
      normalizedJson: {
        displayName: "M31 Smoke Admin",
        isPrivileged: true
      },
      observedAt: nowIso
    });
    const finding = await providerStore.upsertFinding({
      organizationId,
      providerConnectionId,
      normalizedResourceId: normalizedResource.id,
      resourceExternalId: `user-${runId}`,
      resourceType: "cloud_user",
      syncRunId: syncRun.id,
      providerKey: "mock",
      moduleKey: "identity",
      findingKey: `m31.admin_mfa_missing.${runId}`,
      title: "M31 smoke admin MFA gap",
      summary: "Synthetic privileged account lacks MFA evidence.",
      severity: "high",
      status: "open",
      evidence: {
        source: "m31-live-postgres-smoke"
      },
      observedAt: nowIso
    });
    await providerStore.upsertRecommendation({
      organizationId,
      providerConnectionId,
      sourceFindingId: finding.id,
      sourceFindingKey: finding.findingKey,
      providerKey: "mock",
      moduleKey: "identity",
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      title: "M31 smoke MFA recommendation",
      summary: "Attach MFA policy evidence.",
      severity: "high",
      confidence: "high",
      recommendationType: "guided",
      automationMode: "guided",
      requiredPermissions: ["Directory.Read.All"],
      requiredLicense: [],
      expectedChange: "MFA evidence is attached.",
      blastRadius: "No provider writes.",
      manualFallback: "Upload policy evidence.",
      evidenceRequired: true,
      status: "proposed",
      sourceReferences: [{ sourceRecordId: "m31-smoke-source" }]
    });
    const recommendations = await providerStore.listRecommendations(organizationId, providerConnectionId);
    assert(recommendations.length === 1, "Provider recommendation was not readable through the store.");
    checks.push("provider_connections_and_telemetry");

    const complianceResultSet = createComplianceResultSet({
      organizationId,
      assessmentId,
      userId,
      findingId: finding.id,
      recommendationId: randomUUID(),
      recordedAt: nowIso
    });
    await complianceRepository.saveComplianceResults(complianceResultSet);
    const reloadedCompliance = await complianceRepository.findComplianceResults({
      organizationId,
      assessmentId
    });
    assert(reloadedCompliance?.results.length === 1, "Compliance results were not reloaded from Prisma.");
    checks.push("compliance_results");

    const artifact = {
      id: evidenceArtifactId,
      organizationId,
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      sourceType: "manual_upload",
      manualSourceLabel: "M31 smoke upload",
      title: "M31 smoke MFA policy",
      storageUri: `object://private/evidence/${organizationId}/${evidenceArtifactId}.txt`,
      contentHashSha256: "a".repeat(64),
      mimeType: "text/plain",
      sizeBytes: 64,
      scanStatus: "clean",
      scanScannerName: "m31-smoke-scanner",
      scanFindings: [],
      scannedAt: nowIso,
      createdBy: actorUserId,
      createdAt: nowIso,
      linkedAssessmentId: assessmentId,
      linkedSourceRecordId: sourceId,
      links: [
        {
          id: randomUUID(),
          organizationId,
          evidenceArtifactId,
          targetType: "control",
          targetId: "nis2.access-control.mfa",
          relation: "evidence",
          createdAt: nowIso
        }
      ]
    };
    await evidenceRepository.saveArtifact(artifact);
    await evidenceRepository.saveAccessLog({
      id: randomUUID(),
      organizationId,
      evidenceArtifactId,
      actorUserId,
      action: "download",
      ipAddress: "127.0.0.1",
      userAgent: "puresoc-m31-live-postgres-smoke",
      createdAt: nowIso
    });
    const artifacts = await evidenceRepository.listArtifacts(organizationId);
    const accessLogs = await evidenceRepository.listAccessLogs(organizationId, evidenceArtifactId);
    assert(artifacts.some((entry) => entry.id === evidenceArtifactId), "Evidence artifact was not listed.");
    assert(accessLogs.length === 1, "Evidence access log was not listed.");
    checks.push("evidence_metadata_access_logs");

    const billingCustomerId = randomUUID();
    await billingRepository.upsertBillingCustomer({
      id: billingCustomerId,
      organizationId,
      providerKey: "none",
      externalCustomerId: null,
      billingEmail: email,
      metadataJson: {
        smokeRunId: runId
      },
      createdAt: nowIso,
      updatedAt: nowIso
    });
    await billingRepository.upsertBillingSubscription({
      id: randomUUID(),
      organizationId,
      billingCustomerId,
      providerKey: "none",
      externalSubscriptionId: null,
      externalPriceId: null,
      externalProductId: null,
      subscriptionStatus: "offline_active",
      currentPeriodStart: nowIso,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      createdAt: nowIso,
      updatedAt: nowIso
    });
    await billingRepository.replaceBillingEntitlements(organizationId, [
      {
        id: randomUUID(),
        organizationId,
        entitlementKey: "nis2_eu_portal",
        enabled: true,
        source: "m31-smoke",
        expiresAt: null,
        updatedAt: nowIso
      }
    ]);
    const billingEvent = await billingRepository.recordBillingEventIfNew({
      id: randomUUID(),
      organizationId,
      providerKey: "none",
      externalEventId: `m31-smoke-${runId}`,
      eventType: "m31.smoke",
      payloadJson: {
        smokeRunId: runId
      },
      processedAt: null,
      createdAt: nowIso
    });
    assert(billingEvent.duplicate === false, "First billing event insert was unexpectedly treated as duplicate.");
    await billingRepository.markBillingEventProcessed({
      providerKey: "none",
      externalEventId: `m31-smoke-${runId}`,
      organizationId,
      processedAt: nowIso
    });
    const entitlements = await billingRepository.listBillingEntitlements(organizationId);
    assert(entitlements.some((entry) => entry.entitlementKey === "nis2_eu_portal"), "Billing entitlement was not listed.");
    checks.push("billing");

    await regulatoryRepository.upsertSource({
      id: sourceId,
      frameworkKey: "nis2",
      jurisdiction: "EU",
      sourceType: "directive",
      title: "M31 smoke regulatory source",
      url: null,
      localFilePath: null,
      publicationDate: null,
      lastCheckedAt: nowIso,
      versionLabel: "m31-smoke",
      authorityName: "PureSOC smoke",
      trustLevel: "primary",
      status: "review_required",
      activationStatus: "draft",
      activeVersionId: null,
      notes: "Synthetic source for live PostgreSQL smoke.",
      createdAt: nowIso,
      updatedAt: nowIso
    });
    await regulatoryRepository.saveSourceVersion({
      id: sourceVersionId,
      sourceId,
      versionLabel: "m31-smoke-v1",
      contentHashSha256: "b".repeat(64),
      activationStatus: "draft",
      validationStatus: "validated",
      metadataJson: {
        smokeRunId: runId
      },
      importValidationReportJson: {
        validationPassed: true
      },
      activatedAt: null,
      activatedBy: null,
      supersededAt: null,
      supersededByVersionId: null,
      createdAt: nowIso
    });
    await regulatoryRepository.saveSourceMapEntries([
      {
        id: sourceMapId,
        sourceId,
        sourceVersionId,
        targetCollection: "notification_drafts",
        targetKey: "m31-smoke-field",
        sourceLocation: "m31-smoke:cell:A1",
        mappingJson: {
          smokeRunId: runId
        },
        createdAt: nowIso
      }
    ]);
    const reviewTask = await regulatoryRepository.saveReviewTask({
      id: randomUUID(),
      organizationId,
      sourceId,
      sourceVersionId,
      countryPackVersionId: null,
      assignedRoleKey: "regulatory_admin",
      status: "open",
      reason: "M31 smoke review task",
      createdForStatus: "review_required",
      metadataJson: {
        smokeRunId: runId
      },
      createdAt: nowIso,
      resolvedAt: null
    });
    await regulatoryRepository.saveReviewDecision({
      id: randomUUID(),
      taskId: reviewTask.id,
      sourceVersionId,
      decision: "reviewed",
      decidedBy: actorUserId,
      decidedAt: nowIso,
      notes: "Synthetic reviewed decision; no activation.",
      decisionJson: {
        smokeRunId: runId
      }
    });
    const sourceMapEntries = await regulatoryRepository.listSourceMapEntries(sourceVersionId);
    assert(sourceMapEntries.length === 1, "Regulatory source-map entry was not listed.");
    checks.push("regulatory_sources");

    const actionTemplate = {
      id: actionTemplateId,
      organizationId,
      providerKey: "mock",
      moduleKey: "identity",
      actionKey: "m31_smoke_preflight_only",
      actionType: "technical",
      automationMode: "preflightable",
      title: "M31 smoke preflight-only action",
      description: "Synthetic action metadata; no provider write execution.",
      riskLevel: "medium",
      licenseRequired: [],
      permissionsRequired: ["Directory.Read.All"],
      preconditions: {
        providerWritesDisabled: true
      },
      expectedChange: "No external provider changes.",
      blastRadius: "None; metadata-only smoke.",
      rollbackStrategy: "Delete synthetic metadata in the disposable database.",
      manualFallback: "Manual evidence upload.",
      evidenceRequired: true,
      enabledByDefault: false,
      highRiskForbiddenInV1: false,
      sourceReferences: [{ sourceRecordId: sourceId }],
      createdAt: nowIso,
      updatedAt: nowIso
    };
    await actionRepository.saveTemplate(actionTemplate);
    await actionRepository.saveActionRun({
      id: actionRunId,
      organizationId,
      providerConnectionId,
      recommendationId: null,
      actionTemplateId,
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      providerKey: "mock",
      moduleKey: "identity",
      actionKey: actionTemplate.actionKey,
      actionType: "technical",
      automationMode: "preflightable",
      title: actionTemplate.title,
      riskLevel: "medium",
      licenseRequired: [],
      permissionsRequired: ["Directory.Read.All"],
      preconditions: actionTemplate.preconditions,
      expectedChange: actionTemplate.expectedChange,
      blastRadius: actionTemplate.blastRadius,
      rollbackStrategy: actionTemplate.rollbackStrategy,
      manualFallback: actionTemplate.manualFallback,
      evidenceRequired: true,
      highRiskForbiddenInV1: false,
      status: "preflight_passed",
      approval: {
        status: "not_requested"
      },
      preflightStatus: "passed",
      preflightResult: {
        status: "passed",
        checkedAt: nowIso,
        checks: [
          {
            code: "provider_writes_disabled",
            status: "passed",
            message: "Provider write execution remains disabled."
          }
        ],
        requiredPermissions: ["Directory.Read.All"],
        requiredLicense: [],
        canRequestApproval: false
      },
      preStateSnapshot: {
        providerConnectionId,
        sourceType: "action_pre_state",
        capturedAt: nowIso,
        resourceRefs: []
      },
      verificationStatus: "not_run",
      evidenceArtifactIds: [evidenceArtifactId],
      checklistTaskIds: [],
      sourceReferences: [{ sourceRecordId: sourceId }],
      createdAt: nowIso,
      updatedAt: nowIso
    });
    const actionRuns = await actionRepository.listActionRuns(organizationId);
    assert(actionRuns.some((run) => run.id === actionRunId), "Remediation action metadata was not listed.");
    checks.push("remediation_actions_metadata");

    const legalCaveat = resolveLegalCaveatMessage("en");
    const notificationPayload = {
      frameworkKey: "nis2",
      jurisdiction: "RO",
      legalCaveat: legalCaveat.text,
      legalCaveatFallbackUsed: legalCaveat.fallbackUsed,
      legalCaveatLocale: legalCaveat.resolvedLocale,
      legalCaveatMessageKey: LEGAL_CAVEAT_MESSAGE_KEY,
      locale: "en",
      notificationType: "country_registration",
      payload: {
        organizationName: "M31 Prisma Smoke Organization"
      },
      payloadSchemaKey: "ro.nis2.registration_notification.v1",
      payloadSchemaVersion: "1.0.0",
      sourceMappedFields: [
        {
          fieldKey: "organizationName",
          sourceMapId,
          sourceReferences: [{ sourceRecordId: sourceId }],
          label: {
            locale: "en",
            messageKey: "ro.nis2.notification.organization_name",
            text: "Organization name"
          }
        }
      ],
      sourceReferences: [{ sourceRecordId: sourceId }]
    };
    await notificationRepository.saveNotificationDraft({
      id: notificationDraftId,
      organizationId,
      assessmentId,
      jurisdiction: "RO",
      notificationType: "country_registration",
      status: "draft",
      payload: notificationPayload,
      sourceReferences: [sourceId],
      createdAt: nowIso,
      updatedAt: nowIso
    });
    await notificationRepository.saveRoNis2CompanionDraft({
      id: randomUUID(),
      organizationId,
      assessmentId,
      notificationDraftId,
      status: "draft",
      payload: notificationPayload,
      sourceReferences: [sourceId],
      legalCaveat: legalCaveat.text,
      createdBy: actorUserId,
      createdAt: nowIso,
      updatedAt: nowIso
    });
    const notificationDrafts = await notificationRepository.listNotificationDraftsForOrganization({
      organizationId,
      jurisdiction: "RO"
    });
    assert(notificationDrafts.some((draft) => draft.id === notificationDraftId), "Notification draft was not listed.");
    checks.push("notification_drafts");

    const storedAnalysis = createStoredAnalysisRecord({
      organizationId,
      assessmentId,
      evidenceArtifactId,
      recordedAt: nowIso
    });
    await outputRepository.saveStoredAnalysis(storedAnalysis);
    await outputRepository.saveGeneratedReport({
      id: reportId,
      organizationId,
      assessmentId,
      reportType: "internal_readiness",
      jurisdiction: "EU",
      status: "ready",
      legalCaveat: legalCaveat.text,
      sourceReferences: [sourceId],
      reportData: {
        title: "M31 smoke internal readiness report",
        assessmentId,
        legalCaveat: legalCaveat.text,
        sourceReferences: [{ sourceRecordId: sourceId }]
      },
      evidenceArtifactId,
      createdBy: actorUserId,
      createdAt: nowIso
    });
    await outputRepository.saveDashboardSnapshot({
      id: dashboardSnapshotId,
      organizationId,
      assessmentId,
      snapshotType: "readiness_overview",
      source: "stored_analysis",
      snapshot: {
        readinessScoreLabel: "PureSOC internal readiness",
        smokeRunId: runId
      },
      createdAt: nowIso
    });
    const latestSnapshot = await outputRepository.findLatestDashboardSnapshot(organizationId, assessmentId);
    const report = await outputRepository.findGeneratedReport(organizationId, reportId);
    assert(latestSnapshot?.id === dashboardSnapshotId, "Latest dashboard snapshot was not readable.");
    assert(report?.id === reportId, "Generated report metadata was not readable.");
    checks.push("stored_outputs");

    await auditWriter.write({
      actorUserId,
      organizationId,
      targetType: "smoke",
      targetId: runId,
      action: "m31.live_postgres_smoke.completed",
      afterJson: {
        checks
      }
    });
  } finally {
    await prisma.$disconnect();
  }

  log(`Passed ${checks.length} live PostgreSQL checks: ${checks.join(", ")}`);
};

const runPrisma = async (args: string[]): Promise<void> => {
  const command = workspaceBinary("prisma");
  log(`Running prisma ${args.join(" ")}`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`prisma ${args.join(" ")} exited with code ${code ?? "unknown"}.`));
    });
  });
};

const workspaceBinary = (name: string): string => {
  const binaryName = process.platform === "win32" ? `${name}.cmd` : name;
  const localBinary = join(process.cwd(), "node_modules", ".bin", binaryName);
  return existsSync(localBinary) ? localBinary : binaryName;
};

const requireDisposableDatabaseUrl = (): URL => {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) {
    throw new Error("DATABASE_URL is required for the live PostgreSQL smoke.");
  }

  const databaseUrl = new URL(rawDatabaseUrl);
  if (!["postgresql:", "postgres:"].includes(databaseUrl.protocol)) {
    throw new Error("DATABASE_URL must use the postgres/postgresql protocol.");
  }

  const confirmedDisposable = process.env[disposableConfirmationVariable] === "true";
  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\/+/, ""));
  const databaseLooksDisposable = /(^|[-_])(smoke|test|ci|tmp|disposable)([-_]|$)/i.test(databaseName);
  if (!confirmedDisposable && !databaseLooksDisposable) {
    throw new Error(
      [
        "Refusing to run live migration/CRUD smoke because the database name does not look disposable.",
        `Use a disposable database name containing smoke/test/ci/tmp/disposable, or set ${disposableConfirmationVariable}=true after verifying the target is not production.`
      ].join(" ")
    );
  }

  return databaseUrl;
};

const redactDatabaseUrl = (databaseUrl: URL): string => {
  const redacted = new URL(databaseUrl.toString());
  if (redacted.password) {
    redacted.password = "REDACTED";
  }
  return redacted.toString();
};

const log = (message: string): void => {
  console.log(`[M31 PostgreSQL smoke] ${message}`);
};

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};

const createComplianceResultSet = (input: {
  organizationId: string;
  assessmentId: string;
  userId: string;
  findingId: string;
  recommendationId: string;
  recordedAt: string;
}) => ({
  organizationId: input.organizationId,
  assessmentId: input.assessmentId,
  jurisdiction: "EU",
  catalogVersion: "m31-smoke",
  recordedAt: input.recordedAt,
  results: [
    {
      id: `${input.assessmentId}:nis2.access-control.mfa:EU`,
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      controlId: "nis2.access-control.mfa",
      controlCode: "NIS2-EU-MFA-001",
      jurisdiction: "EU",
      status: "failing",
      confidence: "high",
      providerSignalIds: [input.findingId],
      evidenceArtifactIds: [],
      checklistRunItemIds: ["m31-smoke-manual-mfa"],
      summary: "M31 smoke provider signal requires MFA evidence.",
      matchedFindings: [
        {
          id: input.findingId,
          providerKey: "mock",
          moduleKey: "identity",
          findingKey: "m31.admin_mfa_missing",
          title: "M31 smoke admin MFA gap",
          summary: "Synthetic privileged account lacks MFA evidence.",
          severity: "high",
          evidence: {
            source: "m31-live-postgres-smoke"
          }
        }
      ],
      missingEvidence: [
        {
          requirementKey: "mfa-policy",
          title: "MFA policy evidence",
          sourceReferences: [{ sourceRecordId: "m31-smoke-source", article: "21" }]
        }
      ],
      manualTasks: [
        {
          id: "m31-smoke-manual-mfa",
          organizationId: input.organizationId,
          assessmentId: input.assessmentId,
          controlId: "nis2.access-control.mfa",
          templateId: "m31-smoke-admin-access-review",
          itemKey: "confirm-admin-mfa",
          title: "Confirm admin MFA coverage",
          status: "assigned",
          ownerUserId: input.userId,
          evidenceArtifactIds: [],
          sourceReferences: [{ sourceRecordId: "m31-smoke-source", article: "21" }]
        }
      ],
      countryPackWarnings: [],
      sourceReferences: [{ sourceRecordId: "m31-smoke-source", article: "21" }],
      evidenceCompleteness: {
        required: 1,
        present: 0,
        missing: 1,
        ratio: 0
      },
      evaluatedAt: input.recordedAt
    }
  ],
  gaps: [
    {
      id: `${input.assessmentId}:nis2.access-control.mfa:gap`,
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      jurisdiction: "EU",
      controlId: "nis2.access-control.mfa",
      controlCode: "NIS2-EU-MFA-001",
      status: "failing",
      severity: "high",
      confidence: "high",
      summary: "M31 smoke provider signal requires MFA evidence.",
      findingIds: [input.findingId],
      findings: ["Synthetic privileged account lacks MFA evidence."],
      missingEvidence: ["MFA policy evidence"],
      recommendedActions: ["Attach MFA policy evidence."],
      providerSignals: ["m31.admin_mfa_missing"],
      manualTaskIds: ["m31-smoke-manual-mfa"],
      manualTasks: ["Confirm admin MFA coverage"],
      countryPackWarnings: [],
      sourceReferences: [{ sourceRecordId: "m31-smoke-source", article: "21" }]
    }
  ],
  recommendations: [
    {
      id: input.recommendationId,
      organizationId: input.organizationId,
      sourceFindingId: input.findingId,
      sourceFindingIds: [input.findingId],
      manualTaskIds: ["m31-smoke-manual-mfa"],
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      title: "Attach MFA policy evidence",
      summary: "M31 smoke provider signal requires MFA evidence.",
      severity: "high",
      confidence: "high",
      recommendationType: "guided",
      automationMode: "guided",
      requiredPermissions: ["Directory.Read.All"],
      requiredLicense: [],
      expectedChange: "Evidence is attached.",
      blastRadius: "No provider writes.",
      manualFallback: "Upload evidence manually.",
      evidenceRequired: true,
      status: "proposed",
      sourceReferences: [{ sourceRecordId: "m31-smoke-source", article: "21" }]
    }
  ],
  readinessPlan: {
    id: `${input.assessmentId}:readiness-plan`,
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    title: "PureSOC internal readiness plan",
    targetReadinessPercent: 100,
    status: "draft",
    generatedAt: input.recordedAt,
    items: [
      {
        id: `${input.assessmentId}:readiness-plan:1`,
        organizationId: input.organizationId,
        readinessPlanId: `${input.assessmentId}:readiness-plan`,
        controlId: "nis2.access-control.mfa",
        providerRecommendationId: input.recommendationId,
        jurisdiction: "EU",
        gapSummary: "M31 smoke provider signal requires MFA evidence.",
        recommendedAction: "Attach MFA policy evidence.",
        actionType: "guided",
        ownerUserId: input.userId,
        dueDate: "2026-05-07",
        automationAvailable: false,
        evidenceRequired: true,
        findingIds: [input.findingId],
        manualTaskIds: ["m31-smoke-manual-mfa"],
        dependencies: ["Directory.Read.All"],
        status: "proposed",
        legalReviewRequired: false,
        sourceReferences: [{ sourceRecordId: "m31-smoke-source", article: "21" }]
      }
    ]
  },
  checklistItems: [
    {
      id: "m31-smoke-manual-mfa",
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      controlId: "nis2.access-control.mfa",
      templateId: "m31-smoke-admin-access-review",
      itemKey: "confirm-admin-mfa",
      title: "Confirm admin MFA coverage",
      status: "assigned",
      ownerUserId: input.userId,
      evidenceArtifactIds: [],
      sourceReferences: [{ sourceRecordId: "m31-smoke-source", article: "21" }]
    }
  ]
});

const createStoredAnalysisRecord = (input: {
  organizationId: string;
  assessmentId: string;
  evidenceArtifactId: string;
  recordedAt: string;
}) => ({
  organizationId: input.organizationId,
  assessmentId: input.assessmentId,
  jurisdiction: "EU",
  catalogVersion: "m31-smoke",
  recordedAt: input.recordedAt,
  results: [
    {
      id: `${input.assessmentId}:stored-output:EU`,
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      controlId: "nis2.access-control.mfa",
      controlCode: "NIS2-EU-MFA-001",
      jurisdiction: "EU",
      status: "passing",
      confidence: "high",
      providerSignalIds: [],
      evidenceArtifactIds: [input.evidenceArtifactId],
      checklistRunItemIds: [],
      summary: "M31 smoke stored output result.",
      matchedFindings: [],
      missingEvidence: [],
      manualTasks: [],
      countryPackWarnings: [],
      sourceReferences: [{ sourceRecordId: "m31-smoke-source", article: "21" }],
      evidenceCompleteness: {
        required: 1,
        present: 1,
        missing: 0,
        ratio: 1
      },
      evaluatedAt: input.recordedAt
    }
  ],
  gaps: [],
  recommendations: [],
  readinessPlan: {
    id: `${input.assessmentId}:stored-output-readiness-plan`,
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    title: "PureSOC internal readiness plan",
    targetReadinessPercent: 100,
    status: "draft",
    generatedAt: input.recordedAt,
    items: []
  },
  evidenceArtifacts: [
    {
      id: input.evidenceArtifactId,
      organizationId: input.organizationId,
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      sourceType: "manual_upload",
      title: "M31 smoke MFA policy",
      storageUri: `object://private/evidence/${input.organizationId}/${input.evidenceArtifactId}.txt`,
      contentHashSha256: "a".repeat(64),
      mimeType: "text/plain",
      sizeBytes: 64,
      scanStatus: "clean",
      createdAt: input.recordedAt,
      links: []
    }
  ]
});

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[M31 PostgreSQL smoke] Failed: ${message}`);
  process.exit(1);
});
