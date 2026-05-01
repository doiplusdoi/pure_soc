import { AuditWriter, InMemoryAuditSink } from "@puresoc/audit";
import {
  Argon2idPasswordHasher,
  FailedLoginRateLimiter,
  LocalAuthService
} from "@puresoc/auth-local";
import {
  InMemoryOidcAuthorizationStateStore,
  OidcSocialLoginService,
  type OauthProfileClient,
  type OidcProviderConfig,
  type OidcTokenClient,
  type OidcTokenVerifier
} from "@puresoc/auth-oidc";
import { OrganizationService } from "../organizations/service";
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
  PrismaActionRepository,
  PrismaBillingRepository,
  PrismaComplianceResultRepository,
  PrismaEvidenceRepository,
  PrismaNotificationDraftRepository,
  PrismaRegulatorySourceRepository,
  createPrismaClient,
  type NotificationDraftRepository,
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
import { BillingApiService } from "../billing/service";
import { InMemoryPureSocRepository } from "./memory-repository";
import { NotificationDraftApiService } from "../compliance/nis2/notification-drafts/service";
import { createRoNis2NotificationDraftCompanionBuilder } from "../compliance/nis2/ro/notification-draft-companion";
import {
  HttpUploadScanner,
  MockUploadScanner,
  NoopUploadScanner,
  S3ObjectStorageAdapter,
  type EvidenceRepository,
  type ObjectStorageAdapter,
  type UploadScanningHook
} from "@puresoc/evidence";
import { createLocalMicrosoft365TokenCipher } from "@puresoc/provider-microsoft365";

export interface ApiPersistenceRuntime {
  mode: PureSocConfig["app"]["persistenceMode"];
  persistedContexts: string[];
  memoryBackedContexts: string[];
}

export interface ApiServices {
  config: PureSocConfig;
  persistence: ApiPersistenceRuntime;
  repository: InMemoryPureSocRepository;
  prismaClient?: PureSocPrismaClient;
  auditSink: InMemoryAuditSink;
  auditWriter: AuditWriter;
  localAuth: LocalAuthService;
  oidcAuth: OidcSocialLoginService;
  organizations: OrganizationService;
  providerConnections: ProviderConnectionsService;
  microsoft365ProviderConnections: Microsoft365ProviderConnectionService;
  compliance: ComplianceEvaluationService;
  recommendations: RecommendationApiService;
  regulatorySources: RegulatorySourceReviewService;
  evidence: EvidenceApiService;
  reports: ReportApiService;
  dashboards: DashboardApiService;
  billing: BillingApiService;
  notificationDraftRepository: NotificationDraftRepository;
  notificationDrafts: NotificationDraftApiService;
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
    prismaClient?: PureSocPrismaClient;
    oidcTokenClient?: OidcTokenClient;
    oidcTokenVerifier?: OidcTokenVerifier;
    oauthProfileClient?: OauthProfileClient;
  } = {}
): ApiServices => {
  const config = options.config ?? loadConfig();
  const billingConfig = options.billingConfig ?? config.billing;
  const repository = new InMemoryPureSocRepository();
  const auditSink = new InMemoryAuditSink();
  const auditWriter = new AuditWriter({
    sink: auditSink,
    now: options.now
  });
  const rateLimiter = new FailedLoginRateLimiter({
    maxAttempts: 5,
    windowMs: 60_000,
    now: options.now
  });
  const localAuth = new LocalAuthService({
    repository,
    auditWriter,
    passwordHasher: new Argon2idPasswordHasher(),
    rateLimiter,
    now: options.now
  });
  const oidcAuth = new OidcSocialLoginService({
    repository,
    auditWriter,
    stateStore: new InMemoryOidcAuthorizationStateStore(),
    providers: toOidcProviderConfigs(config),
    tokenClient: options.oidcTokenClient,
    tokenVerifier: options.oidcTokenVerifier,
    profileClient: options.oauthProfileClient,
    now: options.now,
    stateTtlMs: config.auth.socialLogin.stateTtlMs
  });
  const organizations = new OrganizationService({
    repository,
    auditWriter,
    now: options.now
  });
  const providerStore = new InMemoryProviderResourceStore({ now: options.now });
  const runtimeRepositories = createRuntimeRepositories({
    config,
    memoryRepository: repository,
    prismaClient: options.prismaClient
  });
  const providerConnections = new ProviderConnectionsService({
    store: providerStore,
    auditWriter,
    now: options.now
  });
  const microsoft365ProviderConnections = new Microsoft365ProviderConnectionService({
    store: providerStore,
    auditWriter,
    tokenCipher: createLocalMicrosoft365TokenCipher({
      activeKeyId: config.connectors.providerTokenEncryptionKeyId,
      keys: [
        {
          keyId: config.connectors.providerTokenEncryptionKeyId,
          masterKey: config.connectors.providerTokenEncryptionKey
        },
        ...config.connectors.providerTokenEncryptionPreviousKeys.map((key) => ({
          keyId: key.id,
          masterKey: key.key
        }))
      ]
    }),
    now: options.now
  });
  const compliance = new ComplianceEvaluationService({
    store: providerStore,
    analysisRepository: {
      listArtifacts: (organizationId) => runtimeRepositories.evidenceRepository.listArtifacts(organizationId),
      saveStoredAnalysis: (record) => repository.saveStoredAnalysis(record)
    },
    resultRepository: runtimeRepositories.complianceResultRepository,
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
    repository,
    evidence,
    auditWriter,
    storeGeneratedReportsAsEvidence: config.reports.storeGeneratedReportsAsEvidence,
    now: options.now
  });
  const dashboards = new DashboardApiService({
    repository,
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
  const actions = new ActionApiService({
    repository: runtimeRepositories.actionsRepository,
    auditWriter,
    now: options.now
  });

  return {
    config,
    persistence: runtimeRepositories.persistence,
    repository,
    prismaClient: runtimeRepositories.prismaClient,
    auditSink,
    auditWriter,
    localAuth,
    oidcAuth,
    organizations,
    providerConnections,
    microsoft365ProviderConnections,
    compliance,
    recommendations,
    regulatorySources,
    evidence,
    reports,
    dashboards,
    billing,
    notificationDraftRepository: runtimeRepositories.notificationDraftRepository,
    notificationDrafts,
    actionsRepository: runtimeRepositories.actionsRepository,
    actions
  };
};

interface RuntimeRepositorySet {
  persistence: ApiPersistenceRuntime;
  prismaClient?: PureSocPrismaClient;
  complianceResultRepository: ComplianceResultRepository<RecommendationContract>;
  regulatorySourceRepository: RegulatorySourceRepository;
  actionsRepository: RemediationActionRepository;
  evidenceRepository: EvidenceRepository;
  billingRepository: BillingRepository;
  notificationDraftRepository: NotificationDraftRepository;
}

const createRuntimeRepositories = (input: {
  config: PureSocConfig;
  memoryRepository: InMemoryPureSocRepository;
  prismaClient?: PureSocPrismaClient;
}): RuntimeRepositorySet => {
  if (input.config.app.persistenceMode !== "prisma") {
    return {
      persistence: {
        mode: "memory",
        persistedContexts: [],
        memoryBackedContexts: [
          "identity_sessions_organizations_rbac",
          "audit_logs",
          "provider_connections_and_telemetry",
          "compliance_results",
          "evidence_metadata_access_logs",
          "billing",
          "regulatory_sources",
          "remediation_actions",
          "notification_drafts",
          "stored_analysis_reports_dashboards"
        ]
      },
      complianceResultRepository: new InMemoryComplianceResultRepository<RecommendationContract>(),
      regulatorySourceRepository: new InMemoryRegulatorySourceRepository(),
      actionsRepository: new InMemoryRemediationActionRepository(),
      evidenceRepository: input.memoryRepository,
      billingRepository: input.memoryRepository,
      notificationDraftRepository: new InMemoryNotificationDraftRepository()
    };
  }

  const prismaClient = input.prismaClient ?? createPrismaClient();

  return {
    persistence: {
      mode: "prisma",
      persistedContexts: [
        "compliance_results",
        "evidence_metadata_access_logs",
        "billing",
        "regulatory_sources",
        "remediation_actions",
        "notification_drafts"
      ],
      memoryBackedContexts: [
        "identity_sessions_organizations_rbac",
        "audit_logs",
        "provider_connections_and_telemetry",
        "stored_analysis_reports_dashboards",
        "oidc_transient_state"
      ]
    },
    prismaClient,
    complianceResultRepository: new PrismaComplianceResultRepository(prismaClient),
    regulatorySourceRepository: new PrismaRegulatorySourceRepository(prismaClient as never),
    actionsRepository: new PrismaActionRepository(prismaClient as never),
    evidenceRepository: new PrismaEvidenceRepository(prismaClient as never),
    billingRepository: new PrismaBillingRepository(prismaClient as never),
    notificationDraftRepository: new PrismaNotificationDraftRepository(prismaClient as never)
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
