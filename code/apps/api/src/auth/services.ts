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
import { InMemoryComplianceResultRepository } from "@puresoc/compliance-core";
import { loadConfig, type PureSocConfig } from "@puresoc/config";
import { InMemoryRegulatorySourceRepository, RegulatorySourceReviewService } from "@puresoc/regulatory-sources";
import type { RecommendationContract } from "@puresoc/recommendations";
import { InMemoryRemediationActionRepository } from "@puresoc/recommendations";
import { Microsoft365ProviderConnectionService } from "../provider-connections/microsoft365/service";
import { ComplianceEvaluationService } from "../compliance/service";
import { RecommendationApiService } from "../recommendations/service";
import { ActionApiService } from "../actions/service";
import { EvidenceApiService } from "../evidence/service";
import { DashboardApiService } from "../dashboards/service";
import { ReportApiService } from "../reports/service";
import { BillingApiService } from "../billing/service";
import { InMemoryPureSocRepository } from "./memory-repository";
import {
  HttpUploadScanner,
  MockUploadScanner,
  NoopUploadScanner,
  S3ObjectStorageAdapter,
  type ObjectStorageAdapter,
  type UploadScanningHook
} from "@puresoc/evidence";

export interface ApiServices {
  repository: InMemoryPureSocRepository;
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
  actionsRepository: InMemoryRemediationActionRepository;
  actions: ActionApiService;
}

export const createApiServices = (
  options: {
    now?: () => Date;
    billingConfig?: PureSocConfig["billing"];
    config?: PureSocConfig;
    evidenceStorage?: ObjectStorageAdapter;
    uploadScanner?: UploadScanningHook;
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
  const complianceResultRepository = new InMemoryComplianceResultRepository<RecommendationContract>();
  const regulatorySourceRepository = new InMemoryRegulatorySourceRepository();
  const actionsRepository = new InMemoryRemediationActionRepository();
  const providerConnections = new ProviderConnectionsService({
    store: providerStore,
    auditWriter,
    now: options.now
  });
  const microsoft365ProviderConnections = new Microsoft365ProviderConnectionService({
    store: providerStore,
    auditWriter,
    now: options.now
  });
  const compliance = new ComplianceEvaluationService({
    store: providerStore,
    analysisRepository: repository,
    resultRepository: complianceResultRepository,
    now: options.now
  });
  const recommendations = new RecommendationApiService();
  const regulatorySources = new RegulatorySourceReviewService({
    repository: regulatorySourceRepository,
    now: options.now
  });
  const evidence = new EvidenceApiService({
    repository,
    auditWriter,
    storage: options.evidenceStorage ?? createEvidenceObjectStorage(config),
    scanner: options.uploadScanner ?? createUploadScanner(config, options.now),
    rejectUnscannedUploads: config.app.env === "production",
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
    repository,
    auditWriter,
    config: billingConfig,
    now: options.now
  });
  const actions = new ActionApiService({
    repository: actionsRepository,
    auditWriter,
    now: options.now
  });

  return {
    repository,
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
    actionsRepository,
    actions
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
      now
    });
  }

  return new NoopUploadScanner({
    environment: config.app.env,
    allowInProduction: config.storage.uploadScanner.allowNoopInProduction,
    now
  });
};
