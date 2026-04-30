import { AuditWriter, InMemoryAuditSink } from "@puresoc/audit";
import {
  Argon2idPasswordHasher,
  FailedLoginRateLimiter,
  LocalAuthService
} from "@puresoc/auth-local";
import { OrganizationService } from "../organizations/service";
import { ProviderConnectionsService } from "../provider-connections/service";
import { InMemoryProviderResourceStore } from "@puresoc/providers-core";
import { InMemoryComplianceResultRepository } from "@puresoc/compliance-core";
import type { RecommendationContract } from "@puresoc/recommendations";
import { Microsoft365ProviderConnectionService } from "../provider-connections/microsoft365/service";
import { ComplianceEvaluationService } from "../compliance/service";
import { RecommendationApiService } from "../recommendations/service";
import { EvidenceApiService } from "../evidence/service";
import { DashboardApiService } from "../dashboards/service";
import { ReportApiService } from "../reports/service";
import { InMemoryPureSocRepository } from "./memory-repository";

export interface ApiServices {
  repository: InMemoryPureSocRepository;
  auditSink: InMemoryAuditSink;
  auditWriter: AuditWriter;
  localAuth: LocalAuthService;
  organizations: OrganizationService;
  providerConnections: ProviderConnectionsService;
  microsoft365ProviderConnections: Microsoft365ProviderConnectionService;
  compliance: ComplianceEvaluationService;
  recommendations: RecommendationApiService;
  evidence: EvidenceApiService;
  reports: ReportApiService;
  dashboards: DashboardApiService;
}

export const createApiServices = (options: { now?: () => Date } = {}): ApiServices => {
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
  const organizations = new OrganizationService({
    repository,
    auditWriter,
    now: options.now
  });
  const providerStore = new InMemoryProviderResourceStore({ now: options.now });
  const complianceResultRepository = new InMemoryComplianceResultRepository<RecommendationContract>();
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
  const evidence = new EvidenceApiService({
    repository,
    auditWriter,
    now: options.now
  });
  const reports = new ReportApiService({
    repository,
    now: options.now
  });
  const dashboards = new DashboardApiService({
    repository,
    now: options.now
  });

  return {
    repository,
    auditSink,
    auditWriter,
    localAuth,
    organizations,
    providerConnections,
    microsoft365ProviderConnections,
    compliance,
    recommendations,
    evidence,
    reports,
    dashboards
  };
};
