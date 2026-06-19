import { Argon2idPasswordHasher, passwordHashAlgorithm } from "@puresoc/auth-local";
import {
  createPrismaClient,
  PrismaOutputRecordRepository,
  PrismaProviderResourceStore,
  type PureSocPrismaClient,
  type StoredAnalysisRecordContract
} from "@puresoc/database";
import {
  generateRecommendationSnapshot,
  type RecommendationContextInput,
  type RecommendationContract
} from "@puresoc/recommendations";

type DemoCommand = "seed" | "reset" | "verify";

interface DemoCustomer {
  id: string;
  grantId: string;
  assessmentId: string;
  connectionId?: string;
  syncRunSummary?: Record<string, unknown>;
  name: string;
  legalName: string;
  countryCode: string;
  jurisdiction: string;
  sector: string;
  classification: string;
  employeeCount: number;
  assessmentStatus: "active" | "draft";
  microsoft: RecommendationContextInput["microsoft365"] & {
    connected: boolean;
    displayName?: string;
    externalTenantId?: string;
  };
  controlStatus: "passing" | "partial" | "failing" | "needs_evidence";
  gapSeverity: "medium" | "high" | "critical";
  gapSummary: string;
  opportunity?: {
    type: string;
    priority: "medium" | "high" | "critical";
    relevantMicrosoftCapabilityOrPlan?: string;
    evidenceSource: string;
    nextAction: string;
  };
}

const demoPassword = "PureSOC-Demo-2026!";
const generatedAt = "2026-06-19T09:30:00.000Z";

const demoIds = {
  distributorPartner: "11111111-1111-4111-8111-000000000001",
  partner: "11111111-1111-4111-8111-000000000002",
  ownerUser: "11111111-1111-4111-8111-000000000101",
  analystUser: "11111111-1111-4111-8111-000000000102",
  ownerCredential: "11111111-1111-4111-8111-000000000201",
  analystCredential: "11111111-1111-4111-8111-000000000202",
  ownerIdentity: "11111111-1111-4111-8111-000000000301",
  analystIdentity: "11111111-1111-4111-8111-000000000302",
  ownerVerification: "11111111-1111-4111-8111-000000000401",
  analystVerification: "11111111-1111-4111-8111-000000000402",
  ownerMember: "11111111-1111-4111-8111-000000000501",
  analystMember: "11111111-1111-4111-8111-000000000502"
};

const demoUsers = [
  {
    id: demoIds.ownerUser,
    credentialId: demoIds.ownerCredential,
    identityId: demoIds.ownerIdentity,
    verificationId: demoIds.ownerVerification,
    email: "mara@asterion.example",
    displayName: "Mara Ionescu"
  },
  {
    id: demoIds.analystUser,
    credentialId: demoIds.analystCredential,
    identityId: demoIds.analystIdentity,
    verificationId: demoIds.analystVerification,
    email: "leo@asterion.example",
    displayName: "Leo Kowalski"
  }
];

const demoCustomers: DemoCustomer[] = [
  {
    id: "22222222-2222-4222-8222-000000000001",
    grantId: "33333333-3333-4333-8333-000000000001",
    assessmentId: "44444444-4444-4444-8444-000000000001",
    connectionId: "55555555-5555-4555-8555-000000000001",
    name: "MedicaNova SRL",
    legalName: "MedicaNova SRL",
    countryCode: "RO",
    jurisdiction: "RO",
    sector: "pharmaceutical manufacturer",
    classification: "likely in scope",
    employeeCount: 118,
    assessmentStatus: "active",
    microsoft: {
      connected: true,
      displayName: "Microsoft 365 fixture",
      externalTenantId: "fixture-medicanova",
      userCount: 118,
      subscriptions: [
        {
          skuPartNumber: "SPB",
          consumedUnits: 118,
          servicePlans: ["AAD_PREMIUM", "INTUNE_A", "DEFENDER_FOR_BUSINESS", "ATP_ENTERPRISE"]
        }
      ]
    },
    controlStatus: "partial",
    gapSeverity: "high",
    gapSummary: "Regulated-process access and supplier continuity evidence need review.",
    opportunity: {
      type: "partner_service_regulated_process_review",
      priority: "high",
      evidenceSource: "Declared assessment and NIS2 readiness gaps",
      nextAction: "Review regulated process access, supplier risk, and continuity evidence"
    }
  },
  {
    id: "22222222-2222-4222-8222-000000000002",
    grantId: "33333333-3333-4333-8333-000000000002",
    assessmentId: "44444444-4444-4444-8444-000000000002",
    connectionId: "55555555-5555-4555-8555-000000000002",
    name: "NordFrucht GmbH",
    legalName: "NordFrucht GmbH",
    countryCode: "DE",
    jurisdiction: "DE",
    sector: "food distributor",
    classification: "possibly in scope",
    employeeCount: 72,
    assessmentStatus: "active",
    microsoft: {
      connected: true,
      displayName: "Microsoft 365 fixture",
      externalTenantId: "fixture-nordfrucht",
      userCount: 72,
      subscriptions: [
        {
          skuPartNumber: "O365_BUSINESS_PREMIUM",
          consumedUnits: 72,
          servicePlans: ["EXCHANGE_S_STANDARD"]
        }
      ]
    },
    controlStatus: "partial",
    gapSeverity: "high",
    gapSummary: "Identity access, endpoint, and supplier continuity evidence are incomplete."
  },
  {
    id: "22222222-2222-4222-8222-000000000003",
    grantId: "33333333-3333-4333-8333-000000000003",
    assessmentId: "44444444-4444-4444-8444-000000000003",
    name: "SecureOps Polska Sp. z o.o.",
    legalName: "SecureOps Polska Sp. z o.o.",
    countryCode: "PL",
    jurisdiction: "PL",
    sector: "managed service provider",
    classification: "legal review required",
    employeeCount: 28,
    assessmentStatus: "draft",
    microsoft: {
      connected: false,
      userCount: 28,
      subscriptions: []
    },
    controlStatus: "needs_evidence",
    gapSeverity: "critical",
    gapSummary: "Privileged access, customer-impacting service, and incident handling evidence are incomplete.",
    opportunity: {
      type: "partner_service_privileged_access_review",
      priority: "critical",
      evidenceSource: "Partial assessment and disconnected Microsoft state",
      nextAction: "Schedule privileged access and incident handling workshop"
    }
  }
];

const command = (process.argv[2] ?? "seed") as DemoCommand;

const prisma = createPrismaClient();

try {
  if (!["seed", "reset", "verify"].includes(command)) {
    throw new Error("Usage: npm run demo:seed | npm run demo:reset | npm run demo:verify");
  }

  if (command === "reset") {
    await resetDemo(prisma);
    console.log("PureSOC demo data reset complete.");
  } else if (command === "verify") {
    await verifyDemo(prisma);
  } else {
    await resetDemo(prisma);
    await seedDemo(prisma);
    await verifyDemo(prisma);
  }
} catch (error) {
  handleDemoCommandError(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

function handleDemoCommandError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Can't reach database server")) {
    console.error(
      JSON.stringify(
        {
          status: "blocked",
          reason: "database_unreachable",
          databaseUrl: "Use DATABASE_URL for a migrated local/disposable PostgreSQL database.",
          nextAction:
            "Start the PureSOC Postgres service, run npm run prisma:migrate:deploy, then rerun npm run demo:seed."
        },
        null,
        2
      )
    );
    return;
  }

  console.error(message);
}

async function resetDemo(client: PureSocPrismaClient) {
  const organizationIds = demoCustomers.map((customer) => customer.id);
  const userIds = demoUsers.map((user) => user.id);
  const userEmails = demoUsers.map((user) => user.email);
  const partnerIds = [demoIds.partner, demoIds.distributorPartner];

  await client.tenantAccessSession.deleteMany({
    where: {
      OR: [
        { partnerId: { in: partnerIds } },
        { effectiveOrganizationId: { in: organizationIds } },
        { realActorUserId: { in: userIds } }
      ]
    }
  });
  await client.partnerTenantGrant.deleteMany({
    where: {
      OR: [{ partnerId: { in: partnerIds } }, { organizationId: { in: organizationIds } }]
    }
  });
  await client.partnerMember.deleteMany({
    where: {
      OR: [{ partnerId: { in: partnerIds } }, { userId: { in: userIds } }]
    }
  });
  await client.partner.deleteMany({
    where: {
      id: { in: partnerIds }
    }
  });
  await client.providerSyncModule.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.providerSyncRun.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.providerRecommendation.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.providerFinding.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.providerNormalizedResource.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.providerRawResource.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.providerCapability.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.providerPermissionBundle.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.providerCredential.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.providerConsentState.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.providerConnection.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.reportExport.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.generatedReport.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.dashboardWidget.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.dashboardSnapshot.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.complianceResultSnapshot.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.complianceGap.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.complianceControlResult.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.readinessPlanItem.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.readinessPlan.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.evidenceLink.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.evidenceAccessLog.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.evidenceArtifact.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.notificationLog.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.notificationChannel.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.notificationDeadline.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.notificationDraft.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.roNis2NotificationDraft.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.roNis2ClassificationRun.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.roNis2OnboardingProgress.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await client.roleBinding.deleteMany({
    where: {
      OR: [{ organizationId: { in: organizationIds } }, { userId: { in: userIds } }]
    }
  });
  await client.organizationMember.deleteMany({
    where: {
      OR: [{ organizationId: { in: organizationIds } }, { userId: { in: userIds } }]
    }
  });
  await client.session.deleteMany({ where: { userId: { in: userIds } } });
  await client.emailVerificationToken.deleteMany({
    where: {
      OR: [{ userId: { in: userIds } }, { email: { in: userEmails } }]
    }
  });
  await client.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
  await client.localCredential.deleteMany({
    where: {
      OR: [{ userId: { in: userIds } }, { email: { in: userEmails } }]
    }
  });
  await client.identityAccount.deleteMany({
    where: {
      OR: [{ userId: { in: userIds } }, { providerEmail: { in: userEmails } }]
    }
  });
  await client.user.deleteMany({
    where: {
      OR: [{ id: { in: userIds } }, { email: { in: userEmails } }]
    }
  });
  await client.organization.deleteMany({ where: { id: { in: organizationIds } } });
}

async function seedDemo(client: PureSocPrismaClient) {
  const passwordHasher = new Argon2idPasswordHasher();
  const passwordHash = await passwordHasher.hashPassword(demoPassword);
  const now = new Date(generatedAt);
  const outputRepository = new PrismaOutputRecordRepository(client);
  const providerStore = new PrismaProviderResourceStore(client, {
    now: () => now
  });

  for (const user of demoUsers) {
    await client.user.create({
      data: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        locale: "en",
        disabledAt: null,
        createdAt: now,
        updatedAt: now
      }
    });
    await client.identityAccount.create({
      data: {
        id: user.identityId,
        userId: user.id,
        providerKey: "local",
        providerSubject: user.email,
        providerEmail: user.email,
        displayName: user.displayName,
        createdAt: now,
        lastLoginAt: null
      }
    });
    await client.localCredential.create({
      data: {
        id: user.credentialId,
        userId: user.id,
        email: user.email,
        passwordHash,
        passwordHashAlgorithm,
        passwordUpdatedAt: now,
        emailVerifiedAt: now,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now
      }
    });
    await client.emailVerificationToken.create({
      data: {
        id: user.verificationId,
        userId: user.id,
        email: user.email,
        tokenHash: `demo-used-${user.id}`,
        expiresAt: now,
        usedAt: now,
        createdAt: now
      }
    });
  }

  await client.partner.create({
    data: {
      id: demoIds.distributorPartner,
      name: "Northstar Distributor",
      slug: "northstar-distributor",
      status: "active",
      parentPartnerId: null,
      createdAt: now,
      updatedAt: now
    }
  });
  await client.partner.create({
    data: {
      id: demoIds.partner,
      name: "Asterion Cloud Partners",
      slug: "asterion-cloud-partners",
      status: "active",
      parentPartnerId: demoIds.distributorPartner,
      createdAt: now,
      updatedAt: now
    }
  });
  await client.partnerMember.create({
    data: {
      id: demoIds.ownerMember,
      partnerId: demoIds.partner,
      userId: demoIds.ownerUser,
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now
    }
  });
  await client.partnerMember.create({
    data: {
      id: demoIds.analystMember,
      partnerId: demoIds.partner,
      userId: demoIds.analystUser,
      role: "analyst",
      status: "active",
      createdAt: now,
      updatedAt: now
    }
  });

  for (const customer of demoCustomers) {
    await client.organization.create({
      data: {
        id: customer.id,
        name: customer.name,
        legalName: customer.legalName,
        billingStatus: "none",
        defaultLocale: customer.countryCode === "RO" ? "ro-RO" : "en",
        primaryCountryCode: customer.countryCode,
        headquartersCountryCode: customer.countryCode,
        createdAt: now,
        updatedAt: now
      }
    });
    await client.partnerTenantGrant.create({
      data: {
        id: customer.grantId,
        partnerId: demoIds.partner,
        organizationId: customer.id,
        accessLevel: "admin",
        status: "active",
        grantedByUserId: demoIds.ownerUser,
        revokedAt: null,
        createdAt: now,
        updatedAt: now
      }
    });

    await outputRepository.saveStoredAnalysis(storedAnalysisForCustomer(customer));

    if (customer.microsoft.connected && customer.connectionId) {
      const connection = await providerStore.createConnection({
        id: customer.connectionId,
        organizationId: customer.id,
        providerKey: "microsoft365",
        displayName: customer.microsoft.displayName ?? "Microsoft 365 fixture",
        externalTenantId: customer.microsoft.externalTenantId,
        externalTenantName: customer.name,
        status: "connected",
        readEnabled: true,
        writeEnabled: false,
        metadata: {
          mode: "fixture",
          fixtureSet: "partner_demo"
        }
      });
      const syncRun = await providerStore.createSyncRun({
        organizationId: customer.id,
        providerConnectionId: connection.id,
        providerKey: "microsoft365"
      });
      for (const moduleKey of ["tenant-profile", "licensing", "users-groups-roles", "mfa-registration", "secure-score"]) {
        await providerStore.upsertSyncModule({
          organizationId: customer.id,
          providerConnectionId: connection.id,
          syncRunId: syncRun.id,
          providerKey: "microsoft365",
          moduleKey,
          status: "succeeded",
          missingPermissions: [],
          missingLicenses: [],
          statusReason: "Seeded fixture module result.",
          pagesRead: 1,
          retryCount: 0
        });
      }
      await providerStore.completeSyncRun(syncRun.id, "succeeded", {
        fixtureSet: "partner_demo",
        seeded: true,
        ...(customer.syncRunSummary ?? {})
      });
    }
  }
}

async function verifyDemo(client: PureSocPrismaClient) {
  const [partner, customerCount, owner, analyst, grantCount] = await Promise.all([
    client.partner.findUnique({ where: { id: demoIds.partner } }),
    client.organization.count({ where: { id: { in: demoCustomers.map((customer) => customer.id) } } }),
    client.user.findUnique({ where: { id: demoIds.ownerUser } }),
    client.user.findUnique({ where: { id: demoIds.analystUser } }),
    client.partnerTenantGrant.count({ where: { partnerId: demoIds.partner, status: "active" } })
  ]);

  if (!partner || customerCount !== demoCustomers.length || !owner || !analyst || grantCount !== demoCustomers.length) {
    throw new Error("PureSOC demo data is incomplete. Run npm run demo:seed.");
  }

  const outputRepository = new PrismaOutputRecordRepository(client);
  const analyses = await Promise.all(
    demoCustomers.map((customer) => outputRepository.findLatestStoredAnalysis(customer.id))
  );
  if (analyses.some((analysis) => !analysis)) {
    throw new Error("PureSOC demo stored analysis snapshots are incomplete. Run npm run demo:seed.");
  }

  const connectionCount = await client.providerConnection.count({
    where: {
      organizationId: {
        in: demoCustomers.filter((customer) => customer.microsoft.connected).map((customer) => customer.id)
      },
      providerKey: "microsoft365",
      status: "connected"
    }
  });
  if (connectionCount !== 2) {
    throw new Error("PureSOC demo Microsoft fixture connections are incomplete. Run npm run demo:seed.");
  }

  console.log(
    JSON.stringify(
      {
        status: "ready",
        partner: partner.name,
        login: {
          ownerEmail: demoUsers[0].email,
          analystEmail: demoUsers[1].email,
          password: demoPassword,
          scope: "local deterministic demo only"
        },
        customers: demoCustomers.map((customer) => ({
          name: customer.name,
          countryCode: customer.countryCode,
          sector: customer.sector,
          microsoft: customer.microsoft.connected ? "fixture_connected" : "disconnected"
        }))
      },
      null,
      2
    )
  );
}

function storedAnalysisForCustomer(customer: DemoCustomer): StoredAnalysisRecordContract {
  const gap = gapForCustomer(customer);
  const snapshot = generateRecommendationSnapshot({
    organizationId: customer.id,
    gaps: [gap],
    context: recommendationContextForCustomer(customer),
    generatedAt
  });
  const recommendations = snapshot.recommendations.map((recommendation) =>
    enrichRecommendationForPortfolio(recommendation, customer)
  );

  return {
    organizationId: customer.id,
    assessmentId: customer.assessmentId,
    jurisdiction: customer.jurisdiction,
    catalogVersion: "puresoc.demo.nis2.partner.v1",
    recordedAt: generatedAt,
    results: [controlResultForCustomer(customer)],
    gaps: [gap],
    recommendations,
    readinessPlan: {
      id: `${customer.assessmentId}:plan`,
      organizationId: customer.id,
      assessmentId: customer.assessmentId,
      title: `${customer.name} readiness plan`,
      targetReadinessPercent: 100,
      status: customer.assessmentStatus,
      generatedAt,
      items: []
    },
    evidenceArtifacts: []
  };
}

function recommendationContextForCustomer(customer: DemoCustomer): RecommendationContextInput {
  return {
    countryCode: customer.countryCode,
    sector: customer.sector,
    likelyEntityCategory: customer.classification,
    employeeCount: customer.employeeCount,
    operationalDependencies:
      customer.sector === "managed service provider"
        ? ["privileged access", "customer-impacting services", "incident response"]
        : customer.sector === "food distributor"
          ? ["supplier delivery", "cold-chain continuity"]
          : ["regulated process", "supplier quality", "operational continuity"],
    microsoft365: customer.microsoft
  };
}

function controlResultForCustomer(customer: DemoCustomer): StoredAnalysisRecordContract["results"][number] {
  return {
    organizationId: customer.id,
    assessmentId: customer.assessmentId,
    controlId: controlIdForCustomer(customer),
    controlCode: "NIS2-EU-ACCESS-001",
    jurisdiction: customer.jurisdiction,
    status: customer.controlStatus,
    confidence: customer.microsoft.connected ? "medium" : "low",
    providerSignalIds: customer.microsoft.connected ? ["m365:mfa-registration:coverage"] : [],
    evidenceArtifactIds: [],
    checklistRunItemIds: [],
    summary: customer.gapSummary,
    matchedFindings: [],
    missingEvidence: [],
    manualTasks: [],
    countryPackWarnings: [],
    sourceReferences: [],
    evidenceCompleteness: {
      required: 2,
      present: customer.controlStatus === "passing" ? 2 : customer.controlStatus === "partial" ? 1 : 0,
      missing: customer.controlStatus === "passing" ? 0 : customer.controlStatus === "partial" ? 1 : 2,
      ratio: customer.controlStatus === "passing" ? 1 : customer.controlStatus === "partial" ? 0.5 : 0
    },
    evaluatedAt: generatedAt
  };
}

function gapForCustomer(customer: DemoCustomer): StoredAnalysisRecordContract["gaps"][number] {
  return {
    id: `${customer.assessmentId}:${controlIdForCustomer(customer)}:gap`,
    organizationId: customer.id,
    assessmentId: customer.assessmentId,
    jurisdiction: customer.jurisdiction,
    controlId: controlIdForCustomer(customer),
    controlCode: "NIS2-EU-ACCESS-001",
    status: customer.controlStatus,
    severity: customer.gapSeverity,
    confidence: customer.microsoft.connected ? "medium" : "low",
    summary: customer.gapSummary,
    findingIds: customer.microsoft.connected ? ["m365:mfa-registration:coverage"] : [],
    findings: [customer.gapSummary],
    missingEvidence: ["Configuration evidence", "Owner-approved readiness evidence"],
    recommendedActions: ["Review this readiness gap"],
    providerSignals: customer.microsoft.connected ? ["m365:mfa-registration:coverage"] : [],
    manualTaskIds: [],
    manualTasks: [],
    countryPackWarnings: [],
    sourceReferences: []
  };
}

function enrichRecommendationForPortfolio(
  recommendation: RecommendationContract,
  customer: DemoCustomer
): RecommendationContract {
  const evidenceUsed = [
    ...(recommendation.decision?.evidenceUsed ?? []),
    { type: "business_context" as const, label: "Sector", value: customer.sector },
    { type: "business_context" as const, label: "Likely classification", value: customer.classification }
  ];

  if (recommendation.opportunity || !customer.opportunity) {
    return {
      ...recommendation,
      decision: recommendation.decision
        ? {
            ...recommendation.decision,
            evidenceUsed
          }
        : undefined
    };
  }

  return {
    ...recommendation,
    severity: customer.opportunity.priority,
    decision: {
      finding: customer.gapSummary,
      whyItMatters: "This customer has business-context NIS2 readiness work that should be reviewed with a partner.",
      evidenceUsed,
      nis2ControlMappings: [recommendation.controlId],
      countryMappings: [customer.countryCode],
      priority: customer.opportunity.priority,
      recommendedAction: customer.opportunity.nextAction,
      expectedReadinessEffect: "Estimated readiness effect after customer-approved remediation and evidence capture.",
      requiredCapability: "Partner-led readiness review",
      partnerServiceOpportunity: customer.opportunity.type,
      customerCta: "Review this readiness gap",
      partnerCta: "Add to remediation plan",
      disclaimer: "Readiness recommendation only; it is not legal advice or certification."
    },
    opportunity: {
      type: customer.opportunity.type,
      priority: customer.opportunity.priority,
      relevantMicrosoftCapabilityOrPlan: customer.opportunity.relevantMicrosoftCapabilityOrPlan,
      affectedUsers: customer.employeeCount,
      nis2Areas: [recommendation.controlId],
      evidenceSource: customer.opportunity.evidenceSource,
      nextAction: customer.opportunity.nextAction
    }
  };
}

function controlIdForCustomer(customer: DemoCustomer): string {
  if (customer.sector === "managed service provider") {
    return "nis2.privileged-access";
  }
  if (customer.sector === "pharmaceutical manufacturer") {
    return "nis2.operational-continuity";
  }
  return "nis2.identity-access";
}
