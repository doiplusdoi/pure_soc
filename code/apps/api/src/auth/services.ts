import { appendFileSync, chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import {
  AuditCheckpointService,
  AuditWriter,
  FakeExternalAuditCheckpointProvider,
  InMemoryAuditCheckpointRepository,
  InMemoryAuditSink,
  NoneExternalAuditCheckpointProvider,
  createAuditRetentionExportPolicy,
  type AuditCheckpointRepository,
  type AuditExternalCheckpointProvider,
  type AuditLogInput
} from "@puresoc/audit";
import {
  Argon2idPasswordHasher,
  FailedLoginRateLimiter,
  LocalAuthService,
  type LocalAuthRepository
} from "@puresoc/auth-local";
import {
  InMemoryOidcAuthorizationStateStore,
  OidcSocialLoginService,
  type OidcAuthorizationStateStore,
  type OidcIdentityRepository,
  type OauthProfileClient,
  type OidcProviderConfig,
  type OidcTokenClient,
  type OidcTokenVerifier
} from "@puresoc/auth-oidc";
import { OrganizationService, type OrganizationRepository } from "../organizations/service";
import { ProviderConnectionsService } from "../provider-connections/service";
import { InMemoryProviderResourceStore } from "@puresoc/providers-core";
import { InMemoryComplianceResultRepository, type ComplianceResultRepository } from "@puresoc/compliance-core";
import { loadConfig, type PureSocConfig } from "@puresoc/config";
import {
  InMemoryRegulatorySourceRepository,
  RegulatorySourceReviewService,
  type RegulatorySourceRepository
} from "@puresoc/regulatory-sources";
import type { RecommendationContract, RemediationActionRepository } from "@puresoc/recommendations";
import { InMemoryRemediationActionRepository } from "@puresoc/recommendations";
import {
  InMemoryNotificationDraftRepository,
  InMemoryNotificationRepository,
  InMemoryNis2OnboardingRepository,
  InMemoryOutputRecordRepository,
  InMemoryProviderConsentStateStore,
  InMemoryRoNis2ReadinessRepository,
  PrismaActionRepository,
  PrismaAuditCheckpointRepository,
  PrismaBillingRepository,
  PrismaComplianceResultRepository,
  PrismaEvidenceRepository,
  PrismaNotificationDraftRepository,
  PrismaNotificationRepository,
  PrismaNis2OnboardingRepository,
  PrismaOutputRecordRepository,
  PrismaOidcAuthorizationStateStore,
  PrismaPartnerRepository,
  PrismaProviderConsentStateStore,
  PrismaRoNis2ReadinessRepository,
  PrismaAuditSink,
  PrismaProviderResourceStore,
  PrismaIdentityOrganizationRbacRepository,
  PrismaRegulatorySourceRepository,
  createPrismaClient,
  type Nis2OnboardingRepository,
  type NotificationDraftRepository,
  type PrismaNotificationClient,
  type OutputRecordRepository,
  type ProviderConsentStateStore,
  type RoNis2ReadinessRepository,
  type PureSocPrismaClient
} from "@puresoc/database";
import type { BillingRepository } from "@puresoc/billing-core";
import { Microsoft365ProviderConnectionService } from "../provider-connections/microsoft365/service";
import { ComplianceEvaluationService } from "../compliance/service";
import { RecommendationApiService } from "../recommendations/service";
import { ActionApiService } from "../actions/service";
import { EvidenceApiService } from "../evidence/service";
import { DashboardApiService } from "../dashboards/service";
import { ReportApiService } from "../reports/service";
import type { ReportPdfRendererClient } from "../reports/service";
import { createHttpReportPdfRendererClient } from "../reports/renderer-client";
import type { EvidencePackageLimitConfig } from "@puresoc/reports";
import { BillingApiService } from "../billing/service";
import { createInMemoryApiRepositorySet, type InMemoryApiRepositorySet } from "./memory-repository";
import { NotificationDraftApiService } from "../compliance/nis2/notification-drafts/service";
import { Nis2OnboardingApiService } from "../compliance/nis2/onboarding-service";
import { createRoNis2NotificationDraftCompanionBuilder } from "../compliance/nis2/ro/notification-draft-companion";
import { RoNis2ReadinessApiService } from "../compliance/nis2/ro/service";
import { createPartnerAwareRbacRepository, type RbacRepository } from "../rbac";
import {
  HttpUploadScanner,
  MockUploadScanner,
  NoopUploadScanner,
  S3ObjectStorageAdapter,
  type EvidenceRepository,
  type ObjectStorageAdapter,
  type UploadScanningHook
} from "@puresoc/evidence";
import {
  createLocalMicrosoft365TokenCipher,
  createMicrosoft365TokenKeyProviderFromConfig
} from "@puresoc/provider-microsoft365";
import {
  DisabledNotificationTransport,
  NotificationService,
  SlackWebhookNotificationTransport,
  SmtpNotificationTransport,
  TeamsWebhookNotificationTransport,
  type NotificationChannelType,
  type NotificationRepository,
  type NotificationTransport
} from "@puresoc/notifications";
import { NotificationApiService } from "../notifications/service";
import { InMemoryPartnerRepository } from "../partners/memory-repository";
import { RepositoryBackedPartnerPortfolioReader } from "../partners/portfolio";
import { PartnerService, type PartnerRepository } from "../partners/service";

export interface ApiPersistenceRuntime {
  mode: PureSocConfig["app"]["persistenceMode"];
  persistedContexts: string[];
  memoryBackedContexts: string[];
}

export interface EmailVerificationDelivery {
  deliver(input: { userId: string; email: string; plaintextToken: string; expiresAt: Date }): void;
}

export interface OrganizationInvitationDelivery {
  deliver(input: {
    organizationId: string;
    invitationId: string;
    email: string;
    roleKey: string;
    invitedByUserId: string;
    plaintextToken: string;
    expiresAt: Date;
  }): void;
}

export class NoopEmailVerificationDelivery implements EmailVerificationDelivery {
  deliver(): void {
    // Real email delivery is intentionally deferred until a provider is selected.
  }
}

export class LocalDevFileEmailVerificationDelivery implements EmailVerificationDelivery {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  deliver(input: { userId: string; email: string; plaintextToken: string; expiresAt: Date }): void {
    mkdirSync(dirname(this.filePath), { recursive: true, mode: 0o700 });
    appendFileSync(
      this.filePath,
      `${JSON.stringify({
        schemaVersion: "puresoc.local_dev.email_verification_delivery.v1",
        kind: "email_verification",
        userId: input.userId,
        email: input.email,
        plaintextToken: input.plaintextToken,
        expiresAt: input.expiresAt.toISOString()
      })}\n`,
      { mode: 0o600 }
    );
    chmodSync(this.filePath, 0o600);
  }
}

export class NoopOrganizationInvitationDelivery implements OrganizationInvitationDelivery {
  deliver(): void {
    // Real invitation email delivery is intentionally deferred until a provider is selected.
  }
}

export class InMemoryEmailVerificationDelivery implements EmailVerificationDelivery {
  readonly deliveries: Array<{ userId: string; email: string; plaintextToken: string; expiresAt: Date }> = [];

  deliver(input: { userId: string; email: string; plaintextToken: string; expiresAt: Date }): void {
    this.deliveries.push(input);
  }
}

export class InMemoryOrganizationInvitationDelivery implements OrganizationInvitationDelivery {
  readonly deliveries: Array<{
    organizationId: string;
    invitationId: string;
    email: string;
    roleKey: string;
    invitedByUserId: string;
    plaintextToken: string;
    expiresAt: Date;
  }> = [];

  deliver(input: {
    organizationId: string;
    invitationId: string;
    email: string;
    roleKey: string;
    invitedByUserId: string;
    plaintextToken: string;
    expiresAt: Date;
  }): void {
    this.deliveries.push(input);
  }
}

export const createDefaultEmailVerificationDelivery = (
  config: PureSocConfig,
  env: NodeJS.ProcessEnv = process.env
): EmailVerificationDelivery => {
  const localDeliveryFile = env.PURESOC_AUTH_DEV_EMAIL_DELIVERY_FILE?.trim();
  if (!localDeliveryFile) {
    return new NoopEmailVerificationDelivery();
  }

  if (config.app.env !== "development") {
    throw new Error("PURESOC_AUTH_DEV_EMAIL_DELIVERY_FILE is only supported when PURESOC_APP_ENV=development.");
  }

  return new LocalDevFileEmailVerificationDelivery(localDeliveryFile);
};

export interface ApiServices {
  config: PureSocConfig;
  persistence: ApiPersistenceRuntime;
  memoryRepositories: InMemoryApiRepositorySet;
  prismaClient?: PureSocPrismaClient;
  emailVerificationDelivery: EmailVerificationDelivery;
  organizationInvitationDelivery: OrganizationInvitationDelivery;
  auditSink: RuntimeAuditSink;
  auditWriter: AuditWriter;
  auditCheckpoints: AuditCheckpointService;
  localAuth: LocalAuthService;
  oidcAuth: OidcSocialLoginService;
  organizations: OrganizationService;
  partners: PartnerService;
  providerConnections: ProviderConnectionsService;
  microsoft365ProviderConnections: Microsoft365ProviderConnectionService;
  compliance: ComplianceEvaluationService;
  recommendations: RecommendationApiService;
  regulatorySources: RegulatorySourceReviewService;
  evidence: EvidenceApiService;
  reports: ReportApiService;
  dashboards: DashboardApiService;
  billing: BillingApiService;
  outputRepository: OutputRecordRepository;
  notificationDraftRepository: NotificationDraftRepository;
  nis2Onboarding: Nis2OnboardingApiService;
  roNis2Readiness: RoNis2ReadinessApiService;
  identityRepository: LocalAuthRepository & OidcIdentityRepository & OrganizationRepository & RbacRepository;
  partnerRepository: PartnerRepository;
  rbacRepository: RbacRepository;
  notificationDrafts: NotificationDraftApiService;
  notifications: NotificationApiService;
  notificationRepository: NotificationRepository;
  notificationDelivery: NotificationService;
  actionsRepository: RemediationActionRepository;
  actions: ActionApiService;
}

export const createApiServices = (
  options: {
    now?: () => Date;
    billingConfig?: PureSocConfig["billing"];
    config?: PureSocConfig;
    evidenceStorage?: ObjectStorageAdapter;
    uploadScanner?: UploadScanningHook;
    emailVerificationDelivery?: EmailVerificationDelivery;
    organizationInvitationDelivery?: OrganizationInvitationDelivery;
    evidencePackageLimits?: EvidencePackageLimitConfig;
    reportPdfRenderer?: ReportPdfRendererClient;
    notificationTransports?: Partial<Record<NotificationChannelType, NotificationTransport>>;
    prismaClient?: PureSocPrismaClient;
    oidcTokenClient?: OidcTokenClient;
    oidcTokenVerifier?: OidcTokenVerifier;
    oauthProfileClient?: OauthProfileClient;
  } = {}
): ApiServices => {
  const config = options.config ?? loadConfig();
  const billingConfig = options.billingConfig ?? config.billing;
  const emailVerificationDelivery =
    options.emailVerificationDelivery ?? createDefaultEmailVerificationDelivery(config, process.env);
  const organizationInvitationDelivery =
    options.organizationInvitationDelivery ?? new NoopOrganizationInvitationDelivery();
  const memoryRepositories = createInMemoryApiRepositorySet();
  const runtimeRepositories = createRuntimeRepositories({
    config,
    memoryRepositories,
    prismaClient: options.prismaClient,
    now: options.now
  });
  const auditWriter = new AuditWriter({
    sink: runtimeRepositories.auditSink,
    now: options.now,
    contextEnricher: createTenantAccessAuditContextEnricher({
      partnerRepository: runtimeRepositories.partnerRepository,
      now: options.now
    })
  });
  const auditCheckpoints = new AuditCheckpointService({
    repository: runtimeRepositories.auditCheckpointRepository,
    retentionPolicy: createAuditRetentionExportPolicy({
      policyKey: config.audit.retention.policyKey,
      auditLogRetentionDays: config.audit.retention.auditLogRetentionDays,
      checkpointRetentionDays: config.audit.retention.checkpointRetentionDays,
      exportRetentionDays: config.audit.retention.exportRetentionDays,
      checkpointCadenceDays: config.audit.retention.checkpointCadenceDays
    }),
    externalCheckpointProvider: createAuditExternalCheckpointProvider(config, options.now),
    now: options.now
  });
  const rateLimiter = new FailedLoginRateLimiter({
    maxAttempts: 5,
    windowMs: 60_000,
    now: options.now
  });
  const localAuth = new LocalAuthService({
    repository: runtimeRepositories.identityRepository,
    auditWriter,
    passwordHasher: new Argon2idPasswordHasher(),
    rateLimiter,
    requireEmailVerification: config.auth.requireEmailVerification,
    now: options.now
  });
  const oidcAuth = new OidcSocialLoginService({
    repository: runtimeRepositories.identityRepository,
    auditWriter,
    stateStore: runtimeRepositories.oidcAuthorizationStateStore,
    providers: toOidcProviderConfigs(config),
    tokenClient: options.oidcTokenClient,
    tokenVerifier: options.oidcTokenVerifier,
    profileClient: options.oauthProfileClient,
    now: options.now,
    stateTtlMs: config.auth.socialLogin.stateTtlMs
  });
  const organizations = new OrganizationService({
    repository: runtimeRepositories.identityRepository,
    auditWriter,
    now: options.now
  });
  const providerStore = runtimeRepositories.providerResourceStore;
  const partners = new PartnerService({
    repository: runtimeRepositories.partnerRepository,
    organizations,
    auditWriter,
    portfolioReader: new RepositoryBackedPartnerPortfolioReader(runtimeRepositories.outputRepository, providerStore),
    now: options.now
  });
  const notificationDelivery = new NotificationService({
    repository: runtimeRepositories.notificationRepository,
    transports: options.notificationTransports ?? createNotificationTransports(config),
    now: options.now
  });
  const providerConnections = new ProviderConnectionsService({
    store: providerStore,
    auditWriter,
    now: options.now
  });
  const microsoft365ProviderConnections = new Microsoft365ProviderConnectionService({
    store: providerStore,
    auditWriter,
    consentStateStore: runtimeRepositories.providerConsentStateStore,
    connectorApp: {
      clientId: config.connectors.microsoft365.clientId,
      clientSecret: config.connectors.microsoft365.clientSecret,
      authorityHost: config.connectors.microsoft365.authorityHost
    },
    connectorMode: config.connectors.microsoft365.mode,
    fixtureSet: config.connectors.microsoft365.fixtureSet,
    graphBaseUrl: config.connectors.microsoft365.graphBaseUrl,
    maxRetries: config.connectors.microsoft365.maxRetries,
    tokenCipherFactory: () =>
      createLocalMicrosoft365TokenCipher({
        keyProvider: createMicrosoft365TokenKeyProviderFromConfig({
          providerKind: config.connectors.providerTokenKeyProvider,
          activeKeyId: optionalNonEmpty(config.connectors.providerTokenEncryptionKeyId),
          activeKeyMaterial: optionalNonEmpty(config.connectors.providerTokenEncryptionKey),
          previousKeys: config.connectors.providerTokenEncryptionPreviousKeys.map((key) => ({
            keyId: key.id,
            masterKey: key.key
          }))
        })
      }),
    notifications: notificationDelivery,
    now: options.now
  });
  const recommendations = new RecommendationApiService();
  const regulatorySources = new RegulatorySourceReviewService({
    repository: runtimeRepositories.regulatorySourceRepository,
    now: options.now
  });
  const evidence = new EvidenceApiService({
    repository: runtimeRepositories.evidenceRepository,
    auditWriter,
    storage: options.evidenceStorage ?? createEvidenceObjectStorage(config),
    scanner: options.uploadScanner ?? createUploadScanner(config, options.now),
    rejectUnscannedUploads: config.app.env === "production",
    maxUploadBytes: config.api.requestLimits.evidenceUploadMaxBytes,
    now: options.now
  });
  const reports = new ReportApiService({
    repository: runtimeRepositories.outputRepository,
    evidence,
    auditWriter,
    providerStore,
    pdfRenderer: options.reportPdfRenderer ?? createHttpReportPdfRendererClient(config.reports.renderer),
    storeGeneratedReportsAsEvidence: config.reports.storeGeneratedReportsAsEvidence,
    evidencePackageLimits: options.evidencePackageLimits ?? config.reports.evidencePackage,
    now: options.now
  });
  const dashboards = new DashboardApiService({
    repository: runtimeRepositories.outputRepository,
    now: options.now
  });
  const billing = new BillingApiService({
    repository: runtimeRepositories.billingRepository,
    auditWriter,
    config: billingConfig,
    now: options.now
  });
  const notificationDrafts = new NotificationDraftApiService({
    repository: runtimeRepositories.notificationDraftRepository,
    auditWriter,
    companionBuilders: [createRoNis2NotificationDraftCompanionBuilder()],
    now: options.now
  });
  const compliance = new ComplianceEvaluationService({
    store: providerStore,
    analysisRepository: {
      listArtifacts: (organizationId) => runtimeRepositories.evidenceRepository.listArtifacts(organizationId),
      saveStoredAnalysis: (record) => runtimeRepositories.outputRepository.saveStoredAnalysis(record)
    },
    resultRepository: runtimeRepositories.complianceResultRepository,
    notifications: notificationDelivery,
    now: options.now
  });
  const notifications = new NotificationApiService({
    repository: runtimeRepositories.notificationRepository,
    service: notificationDelivery,
    auditWriter
  });
  const roNis2Readiness = new RoNis2ReadinessApiService({
    repository: runtimeRepositories.roNis2ReadinessRepository,
    now: options.now
  });
  const nis2Onboarding = new Nis2OnboardingApiService({
    repository: runtimeRepositories.nis2OnboardingRepository,
    outputRepository: runtimeRepositories.outputRepository,
    now: options.now
  });
  const actions = new ActionApiService({
    repository: runtimeRepositories.actionsRepository,
    auditWriter,
    notifications: notificationDelivery,
    now: options.now
  });

  const rbacRepository = createPartnerAwareRbacRepository({
    baseRepository: runtimeRepositories.identityRepository,
    partnerRepository: runtimeRepositories.partnerRepository,
    now: options.now
  });

  return {
    config,
    persistence: runtimeRepositories.persistence,
    memoryRepositories,
    prismaClient: runtimeRepositories.prismaClient,
    emailVerificationDelivery,
    organizationInvitationDelivery,
    auditSink: runtimeRepositories.auditSink,
    auditWriter,
    auditCheckpoints,
    localAuth,
    oidcAuth,
    organizations,
    partners,
    providerConnections,
    microsoft365ProviderConnections,
    compliance,
    recommendations,
    regulatorySources,
    evidence,
    reports,
    dashboards,
    billing,
    outputRepository: runtimeRepositories.outputRepository,
    notificationDraftRepository: runtimeRepositories.notificationDraftRepository,
    nis2Onboarding,
    roNis2Readiness,
    identityRepository: runtimeRepositories.identityRepository,
    partnerRepository: runtimeRepositories.partnerRepository,
    rbacRepository,
    notificationDrafts,
    notifications,
    notificationRepository: runtimeRepositories.notificationRepository,
    notificationDelivery,
    actionsRepository: runtimeRepositories.actionsRepository,
    actions
  };
};

interface RuntimeRepositorySet {
  persistence: ApiPersistenceRuntime;
  prismaClient?: PureSocPrismaClient;
  auditSink: RuntimeAuditSink;
  auditCheckpointRepository: AuditCheckpointRepository;
  complianceResultRepository: ComplianceResultRepository<RecommendationContract>;
  regulatorySourceRepository: RegulatorySourceRepository;
  actionsRepository: RemediationActionRepository;
  evidenceRepository: EvidenceRepository;
  billingRepository: BillingRepository;
  notificationDraftRepository: NotificationDraftRepository;
  notificationRepository: NotificationRepository;
  nis2OnboardingRepository: Nis2OnboardingRepository;
  roNis2ReadinessRepository: RoNis2ReadinessRepository;
  outputRepository: OutputRecordRepository;
  identityRepository: LocalAuthRepository & OidcIdentityRepository & OrganizationRepository & RbacRepository;
  partnerRepository: PartnerRepository;
  providerResourceStore: InMemoryProviderResourceStore | PrismaProviderResourceStore;
  providerConsentStateStore: ProviderConsentStateStore;
  oidcAuthorizationStateStore: OidcAuthorizationStateStore;
}

type RuntimeAuditSink = InMemoryAuditSink | PrismaAuditSink;

const createTenantAccessAuditContextEnricher = (input: {
  partnerRepository: PartnerRepository;
  now?: () => Date;
}) => {
  const now = input.now ?? (() => new Date());

  return async (record: AuditLogInput) => {
    const actorUserId = record.actorUserId ?? null;
    const organizationId = record.organizationId ?? null;
    if (!actorUserId || !organizationId) {
      return null;
    }

    try {
      const session = await input.partnerRepository.findActiveTenantAccessSessionForActor(actorUserId);
      if (
        !session ||
        session.status !== "active" ||
        session.effectiveOrganizationId !== organizationId ||
        session.expiresAt <= now()
      ) {
        return null;
      }

      const [partner, member, grant] = await Promise.all([
        input.partnerRepository.findPartnerById(session.partnerId),
        input.partnerRepository.findPartnerMember(session.partnerId, actorUserId),
        input.partnerRepository.findActivePartnerTenantGrant(session.partnerId, organizationId)
      ]);

      if (!partner || partner.status !== "active" || !member || member.status !== "active" || !grant) {
        return null;
      }

      return {
        partnerTenantContext: {
          schemaVersion: "puresoc.audit.tenant_access_context.v1",
          partnerId: partner.id,
          partnerName: partner.name,
          tenantSessionId: session.id,
          effectiveOrganizationId: session.effectiveOrganizationId,
          realActorUserId: session.realActorUserId,
          reason: session.reason,
          partnerRole: member.role,
          grantLevel: grant.accessLevel,
          requestId: session.requestId ?? null,
          traceId: session.traceId ?? null,
          expiresAt: session.expiresAt.toISOString()
        }
      };
    } catch {
      return null;
    }
  };
};

const createRuntimeRepositories = (input: {
  config: PureSocConfig;
  memoryRepositories: InMemoryApiRepositorySet;
  prismaClient?: PureSocPrismaClient;
  now?: () => Date;
}): RuntimeRepositorySet => {
  if (input.config.app.persistenceMode !== "prisma") {
    const auditSink = new InMemoryAuditSink();

    return {
      persistence: {
        mode: "memory",
        persistedContexts: [],
        memoryBackedContexts: [
          "identity_sessions_organizations_rbac",
          "partner_tenant_access",
          "audit_logs",
          "provider_connections_and_telemetry",
          "compliance_results",
          "evidence_metadata_access_logs",
          "billing",
          "regulatory_sources",
          "remediation_actions",
          "notification_drafts",
          "notification_channels_logs_deadlines",
          "nis2_onboarding_classification",
          "ro_nis2_onboarding_classification",
          "stored_analysis_reports_dashboards",
          "oidc_transient_state"
        ]
      },
      complianceResultRepository: new InMemoryComplianceResultRepository<RecommendationContract>(),
      auditSink,
      auditCheckpointRepository: new InMemoryAuditCheckpointRepository(auditSink),
      regulatorySourceRepository: new InMemoryRegulatorySourceRepository(),
      actionsRepository: new InMemoryRemediationActionRepository(),
      evidenceRepository: input.memoryRepositories.evidenceRepository,
      billingRepository: input.memoryRepositories.billingRepository,
      notificationDraftRepository: new InMemoryNotificationDraftRepository(),
      notificationRepository: new InMemoryNotificationRepository({ now: input.now }),
      nis2OnboardingRepository: new InMemoryNis2OnboardingRepository(),
      roNis2ReadinessRepository: new InMemoryRoNis2ReadinessRepository(),
      outputRepository: new InMemoryOutputRecordRepository(),
      identityRepository: input.memoryRepositories.identityRepository,
      partnerRepository: new InMemoryPartnerRepository(input.memoryRepositories.identityRepository),
      providerResourceStore: new InMemoryProviderResourceStore({ now: input.now }),
      providerConsentStateStore: new InMemoryProviderConsentStateStore({ now: input.now }),
      oidcAuthorizationStateStore: new InMemoryOidcAuthorizationStateStore()
    };
  }

  const prismaClient = input.prismaClient ?? createPrismaClient();
  const identityRepository = new PrismaIdentityOrganizationRbacRepository(prismaClient as never);
  const auditSink = new PrismaAuditSink(prismaClient as never);

  return {
    persistence: {
      mode: "prisma",
      persistedContexts: [
        "audit_logs",
        "identity_sessions_organizations_rbac",
        "partner_tenant_access",
        "compliance_results",
        "evidence_metadata_access_logs",
        "billing",
        "regulatory_sources",
        "remediation_actions",
        "notification_drafts",
        "notification_channels_logs_deadlines",
        "nis2_onboarding_classification",
        "ro_nis2_onboarding_classification",
        "provider_connections_and_telemetry",
        "stored_analysis_reports_dashboards",
        "oidc_transient_state"
      ],
      memoryBackedContexts: []
    },
    prismaClient,
    auditSink,
    auditCheckpointRepository: new PrismaAuditCheckpointRepository(prismaClient as never),
    complianceResultRepository: new PrismaComplianceResultRepository(prismaClient),
    regulatorySourceRepository: new PrismaRegulatorySourceRepository(prismaClient as never),
    actionsRepository: new PrismaActionRepository(prismaClient as never),
    evidenceRepository: new PrismaEvidenceRepository(prismaClient as never),
    billingRepository: new PrismaBillingRepository(prismaClient as never),
    notificationDraftRepository: new PrismaNotificationDraftRepository(prismaClient as never),
    notificationRepository: new PrismaNotificationRepository(prismaClient as unknown as PrismaNotificationClient),
    nis2OnboardingRepository: new PrismaNis2OnboardingRepository(prismaClient as never),
    roNis2ReadinessRepository: new PrismaRoNis2ReadinessRepository(prismaClient as never),
    outputRepository: new PrismaOutputRecordRepository(prismaClient as never),
    identityRepository,
    partnerRepository: new PrismaPartnerRepository(prismaClient as never),
    providerResourceStore: new PrismaProviderResourceStore(prismaClient as never, { now: input.now }),
    providerConsentStateStore: new PrismaProviderConsentStateStore(prismaClient as never, { now: input.now }),
    oidcAuthorizationStateStore: new PrismaOidcAuthorizationStateStore(prismaClient as never, {
      codeVerifierEncryptionKey: input.config.auth.socialLogin.transientStateEncryptionKey
    })
  };
};

const toOidcProviderConfigs = (config: PureSocConfig): OidcProviderConfig[] =>
  (["microsoft_entra", "google", "github"] as const).map((providerKey) => ({
    providerKey,
    enabled: config.auth.socialLogin.providers[providerKey].enabled,
    mode: config.auth.socialLogin.providers[providerKey].mode,
    issuer: config.auth.socialLogin.providers[providerKey].issuer,
    authorizationEndpoint: config.auth.socialLogin.providers[providerKey].authorizationEndpoint,
    tokenEndpoint: config.auth.socialLogin.providers[providerKey].tokenEndpoint,
    jwksUri: config.auth.socialLogin.providers[providerKey].jwksUri || null,
    profileEndpoint: config.auth.socialLogin.providers[providerKey].profileEndpoint || null,
    emailEndpoint: config.auth.socialLogin.providers[providerKey].emailEndpoint || null,
    clientId: config.auth.socialLogin.providers[providerKey].clientId,
    clientSecret: config.auth.socialLogin.providers[providerKey].clientSecret || null,
    redirectUri: config.auth.socialLogin.providers[providerKey].redirectUri,
    scopes: config.auth.socialLogin.providers[providerKey].scopes,
    pkceRequired: config.auth.socialLogin.providers[providerKey].pkceRequired,
    nonceRequired: config.auth.socialLogin.providers[providerKey].nonceRequired
  }));

const createEvidenceObjectStorage = (config: PureSocConfig): ObjectStorageAdapter | undefined => {
  if (config.storage.objectStorage.provider !== "s3") {
    return undefined;
  }

  return new S3ObjectStorageAdapter({
    endpoint: config.storage.objectStorage.endpoint,
    region: config.storage.objectStorage.region,
    bucket: config.storage.objectStorage.bucket,
    accessKeyId: config.storage.objectStorage.accessKeyId,
    secretAccessKey: config.storage.objectStorage.secretAccessKey,
    forcePathStyle: config.storage.objectStorage.forcePathStyle
  });
};

const createAuditExternalCheckpointProvider = (
  config: PureSocConfig,
  now: (() => Date) | undefined
): AuditExternalCheckpointProvider => {
  if (config.audit.externalCheckpoint.provider === "fake-local") {
    return new FakeExternalAuditCheckpointProvider({ now });
  }

  return new NoneExternalAuditCheckpointProvider();
};

const createUploadScanner = (config: PureSocConfig, now: (() => Date) | undefined): UploadScanningHook => {
  if (config.storage.uploadScanner.mode === "mock") {
    return new MockUploadScanner({
      status: config.storage.uploadScanner.mockStatus,
      now
    });
  }

  if (config.storage.uploadScanner.mode === "http") {
    return new HttpUploadScanner({
      endpoint: config.storage.uploadScanner.endpoint,
      timeoutMs: config.storage.uploadScanner.timeoutMs,
      now
    });
  }

  return new NoopUploadScanner({
    environment: config.app.env,
    allowInProduction: config.storage.uploadScanner.allowNoopInProduction,
    now
  });
};

const optionalNonEmpty = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const createNotificationTransports = (
  config: PureSocConfig
): Partial<Record<NotificationChannelType, NotificationTransport>> => ({
  email: config.notifications.smtp.enabled
    ? new SmtpNotificationTransport({
        host: config.notifications.smtp.host,
        port: config.notifications.smtp.port,
        secure: config.notifications.smtp.secure,
        startTls: config.notifications.smtp.startTls,
        username: config.notifications.smtp.username,
        password: config.notifications.smtp.password,
        from: config.notifications.smtp.from,
        timeoutMs: config.notifications.smtp.timeoutMs
      })
    : new DisabledNotificationTransport("SMTP notification delivery is not configured."),
  slack_webhook: new SlackWebhookNotificationTransport({
    timeoutMs: config.notifications.webhooks.timeoutMs
  }),
  teams_webhook: new TeamsWebhookNotificationTransport({
    timeoutMs: config.notifications.webhooks.timeoutMs
  })
});
