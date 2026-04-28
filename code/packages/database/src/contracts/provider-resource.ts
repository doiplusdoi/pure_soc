export interface ProviderResourceIdentity {
  organizationId: string;
  providerConnectionId: string;
  providerKey: string;
  externalResourceType: string;
  externalId: string;
}

export const providerResourceIdempotencyKey = (identity: ProviderResourceIdentity) =>
  [
    identity.organizationId,
    identity.providerConnectionId,
    identity.providerKey,
    identity.externalResourceType,
    identity.externalId
  ].join(":");

export interface ProviderRawResourceContract extends ProviderResourceIdentity {
  id: string;
  sourceModule: string;
  syncRunId: string;
  rawJson: Record<string, unknown>;
  contentHash: string;
  firstSeenAt: string;
  lastSeenAt: string;
  deletedAt?: string;
}

export interface ProviderNormalizedResourceContract extends ProviderResourceIdentity {
  id: string;
  rawResourceId?: string;
  resourceType: string;
  sourceModule: string;
  normalizedJson: Record<string, unknown>;
  contentHash: string;
  firstSeenAt: string;
  lastSeenAt: string;
  deletedAt?: string;
}

export const providerResourceIdentityFields = [
  "organizationId",
  "providerConnectionId",
  "providerKey",
  "externalResourceType",
  "externalId"
] as const;
