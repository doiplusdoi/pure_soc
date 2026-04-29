import { AuditWriter, InMemoryAuditSink } from "../../../../packages/audit/src/index";
import {
  Argon2idPasswordHasher,
  FailedLoginRateLimiter,
  LocalAuthService
} from "../../../../packages/auth/local/src/index";
import { OrganizationService } from "../organizations/service";
import { ProviderConnectionsService } from "../provider-connections/service";
import { InMemoryProviderResourceStore } from "../../../../packages/providers/core/src/index";
import { Microsoft365ProviderConnectionService } from "../provider-connections/microsoft365/service";
import { InMemoryPureSocRepository } from "./memory-repository";

export interface ApiServices {
  repository: InMemoryPureSocRepository;
  auditSink: InMemoryAuditSink;
  auditWriter: AuditWriter;
  localAuth: LocalAuthService;
  organizations: OrganizationService;
  providerConnections: ProviderConnectionsService;
  microsoft365ProviderConnections: Microsoft365ProviderConnectionService;
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

  return {
    repository,
    auditSink,
    auditWriter,
    localAuth,
    organizations,
    providerConnections,
    microsoft365ProviderConnections
  };
};
