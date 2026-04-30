import {
  createHash,
  createPublicKey,
  createVerify,
  randomBytes,
  randomUUID,
  timingSafeEqual,
  type JsonWebKey
} from "node:crypto";

import {
  AuthError,
  normalizeEmail,
  publicUserView,
  type AuthProviderKey,
  type AuthenticatedSession
} from "@puresoc/auth-core";
import {
  createExpiringSecretToken,
  type IdentityAccountRecord,
  type LocalAuthAuditWriter,
  type LocalAuthUserRecord,
  type RequestSecurityContext,
  type SessionRecord
} from "@puresoc/auth-local";

export const oidcLoginBoundary = "user-login-not-managed-provider-connection";

export type OidcSocialProviderKey = Extract<AuthProviderKey, "microsoft_entra" | "google" | "github">;

export const oidcSocialProviderKeys = ["microsoft_entra", "google", "github"] as const satisfies readonly OidcSocialProviderKey[];

export const oidcCallbacksImplemented = true;

export type OidcProviderMode = "oidc" | "oauth_profile";

export interface OidcProviderConfig {
  providerKey: OidcSocialProviderKey;
  enabled: boolean;
  mode: OidcProviderMode;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri?: string | null;
  profileEndpoint?: string | null;
  emailEndpoint?: string | null;
  clientId: string;
  clientSecret?: string | null;
  redirectUri: string;
  scopes: string[];
  pkceRequired: boolean;
  nonceRequired: boolean;
}

export interface OidcAuthorizationStateRecord {
  id: string;
  providerKey: OidcSocialProviderKey;
  stateHash: string;
  nonceHash?: string | null;
  codeVerifier: string;
  redirectUri: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date | null;
}

export interface OidcAuthorizationStateStore {
  saveAuthorizationState(input: OidcAuthorizationStateRecord): Promise<OidcAuthorizationStateRecord>;
  consumeAuthorizationState(input: {
    providerKey: OidcSocialProviderKey;
    stateHash: string;
    consumedAt: Date;
  }): Promise<OidcAuthorizationStateRecord | null>;
}

export class InMemoryOidcAuthorizationStateStore implements OidcAuthorizationStateStore {
  private readonly records = new Map<string, OidcAuthorizationStateRecord>();

  async saveAuthorizationState(input: OidcAuthorizationStateRecord): Promise<OidcAuthorizationStateRecord> {
    this.records.set(input.id, input);
    return input;
  }

  async consumeAuthorizationState(input: {
    providerKey: OidcSocialProviderKey;
    stateHash: string;
    consumedAt: Date;
  }): Promise<OidcAuthorizationStateRecord | null> {
    const record = [...this.records.values()].find(
      (candidate) =>
        candidate.providerKey === input.providerKey &&
        secureStringEquals(candidate.stateHash, input.stateHash) &&
        !candidate.consumedAt
    );

    if (!record) {
      return null;
    }

    const consumed = {
      ...record,
      consumedAt: input.consumedAt
    };
    this.records.set(record.id, consumed);
    return consumed;
  }
}

export interface OidcTokenResponse {
  idToken?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenType?: string | null;
  expiresIn?: number | null;
}

export interface OidcTokenClient {
  exchangeAuthorizationCode(input: {
    provider: OidcProviderConfig;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<OidcTokenResponse>;
}

export interface VerifiedOidcIdentity {
  providerKey: OidcSocialProviderKey;
  issuer: string;
  audience: string | string[];
  subject: string;
  expiresAt: Date;
  signatureVerified: boolean;
  nonce?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  displayName?: string | null;
}

export interface OidcTokenVerifier {
  verifyIdToken(input: {
    provider: OidcProviderConfig;
    idToken: string;
  }): Promise<VerifiedOidcIdentity>;
}

export interface OauthProfileClient {
  loadProfile(input: {
    provider: OidcProviderConfig;
    accessToken: string;
  }): Promise<VerifiedOidcIdentity>;
}

export interface OidcIdentityRepository {
  findUserById(userId: string): Promise<LocalAuthUserRecord | null>;
  findUsersByEmail(email: string): Promise<LocalAuthUserRecord[]>;
  findIdentityAccountByProviderSubject(
    providerKey: OidcSocialProviderKey,
    providerSubject: string
  ): Promise<(IdentityAccountRecord & { user: LocalAuthUserRecord }) | null>;
  createExternalIdentityAccount(input: {
    user: LocalAuthUserRecord;
    identityAccount: IdentityAccountRecord;
  }): Promise<LocalAuthUserRecord>;
  createIdentityAccount(input: IdentityAccountRecord): Promise<IdentityAccountRecord>;
  updateIdentityLastLogin(providerKey: AuthProviderKey, providerSubject: string, lastLoginAt: Date): Promise<void>;
  createSession(input: SessionRecord): Promise<SessionRecord>;
}

export interface BeginOidcAuthorizationInput {
  providerKey: OidcSocialProviderKey;
}

export interface CompleteOidcCallbackInput {
  providerKey: OidcSocialProviderKey;
  state: string;
  code: string;
  linkAccount?: boolean;
  authenticatedUserId?: string | null;
  activeOrganizationId?: string | null;
}

export interface OidcSocialLoginServiceOptions {
  repository: OidcIdentityRepository;
  auditWriter: LocalAuthAuditWriter;
  stateStore: OidcAuthorizationStateStore;
  providers: OidcProviderConfig[];
  tokenClient?: OidcTokenClient;
  tokenVerifier?: OidcTokenVerifier;
  profileClient?: OauthProfileClient;
  now?: () => Date;
  stateTtlMs?: number;
  sessionTtlMs?: number;
}

export class OidcConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OidcConfigurationError";
  }
}

export class FetchOidcTokenClient implements OidcTokenClient {
  async exchangeAuthorizationCode(input: {
    provider: OidcProviderConfig;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<OidcTokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: input.provider.clientId,
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier
    });

    if (input.provider.clientSecret) {
      body.set("client_secret", input.provider.clientSecret);
    }

    const response = await fetch(input.provider.tokenEndpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (!response.ok) {
      throw new AuthError("oidc_callback_invalid", "OIDC authorization code exchange failed.", 401);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    return {
      idToken: stringOrNull(payload.id_token),
      accessToken: stringOrNull(payload.access_token),
      refreshToken: stringOrNull(payload.refresh_token),
      tokenType: stringOrNull(payload.token_type),
      expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : null
    };
  }
}

export class JwksOidcTokenVerifier implements OidcTokenVerifier {
  async verifyIdToken(input: { provider: OidcProviderConfig; idToken: string }): Promise<VerifiedOidcIdentity> {
    const decoded = decodeJwt(input.idToken);

    if (!decoded.header.alg || decoded.header.alg === "none" || !input.provider.jwksUri) {
      return identityFromJwtPayload(input.provider, decoded.payload, false);
    }

    const jwksResponse = await fetch(input.provider.jwksUri, {
      headers: {
        accept: "application/json"
      }
    });

    if (!jwksResponse.ok) {
      return identityFromJwtPayload(input.provider, decoded.payload, false);
    }

    const jwks = (await jwksResponse.json()) as { keys?: JsonWebKey[] };
    const key = (jwks.keys ?? []).find(
      (candidate) => candidate.kid === decoded.header.kid && candidate.alg === decoded.header.alg
    );

    if (!key || decoded.header.alg !== "RS256") {
      return identityFromJwtPayload(input.provider, decoded.payload, false);
    }

    const verifier = createVerify("RSA-SHA256");
    verifier.update(decoded.signingInput);
    verifier.end();
    const publicKey = createPublicKey({ key, format: "jwk" });
    const signatureVerified = verifier.verify(publicKey, decoded.signature);
    return identityFromJwtPayload(input.provider, decoded.payload, signatureVerified);
  }
}

export class FetchOauthProfileClient implements OauthProfileClient {
  async loadProfile(input: { provider: OidcProviderConfig; accessToken: string }): Promise<VerifiedOidcIdentity> {
    if (!input.provider.profileEndpoint) {
      throw new AuthError("oidc_callback_invalid", "OAuth profile endpoint is not configured.", 500);
    }

    const profileResponse = await fetch(input.provider.profileEndpoint, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${input.accessToken}`
      }
    });

    if (!profileResponse.ok) {
      throw new AuthError("oidc_callback_invalid", "OAuth profile lookup failed.", 401);
    }

    const profile = (await profileResponse.json()) as Record<string, unknown>;
    const githubEmail = input.provider.providerKey === "github" ? await this.loadGithubEmail(input) : null;
    const subject = String(profile.sub ?? profile.id ?? "");
    const email = stringOrNull(profile.email) ?? githubEmail?.email ?? null;

    return {
      providerKey: input.provider.providerKey,
      issuer: input.provider.issuer,
      audience: input.provider.clientId,
      subject,
      expiresAt: new Date(Date.now() + 1000 * 60 * 5),
      signatureVerified: true,
      nonce: null,
      email,
      emailVerified: booleanOrNull(profile.email_verified) ?? githubEmail?.verified ?? null,
      displayName: stringOrNull(profile.name) ?? stringOrNull(profile.login)
    };
  }

  private async loadGithubEmail(input: { provider: OidcProviderConfig; accessToken: string }) {
    if (!input.provider.emailEndpoint) {
      return null;
    }

    const emailResponse = await fetch(input.provider.emailEndpoint, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${input.accessToken}`
      }
    });

    if (!emailResponse.ok) {
      return null;
    }

    const emails = (await emailResponse.json()) as Array<Record<string, unknown>>;
    const primary = emails.find((candidate) => candidate.primary === true && candidate.verified === true);
    return primary && typeof primary.email === "string"
      ? {
          email: primary.email,
          verified: true
        }
      : null;
  }
}

export class OidcSocialLoginService {
  private readonly repository: OidcIdentityRepository;
  private readonly auditWriter: LocalAuthAuditWriter;
  private readonly stateStore: OidcAuthorizationStateStore;
  private readonly providers: Map<OidcSocialProviderKey, OidcProviderConfig>;
  private readonly tokenClient: OidcTokenClient;
  private readonly tokenVerifier: OidcTokenVerifier;
  private readonly profileClient: OauthProfileClient;
  private readonly now: () => Date;
  private readonly stateTtlMs: number;
  private readonly sessionTtlMs: number;

  constructor(options: OidcSocialLoginServiceOptions) {
    this.repository = options.repository;
    this.auditWriter = options.auditWriter;
    this.stateStore = options.stateStore;
    this.providers = new Map(options.providers.map((provider) => [provider.providerKey, provider]));
    this.tokenClient = options.tokenClient ?? new FetchOidcTokenClient();
    this.tokenVerifier = options.tokenVerifier ?? new JwksOidcTokenVerifier();
    this.profileClient = options.profileClient ?? new FetchOauthProfileClient();
    this.now = options.now ?? (() => new Date());
    this.stateTtlMs = options.stateTtlMs ?? 1000 * 60 * 10;
    this.sessionTtlMs = options.sessionTtlMs ?? 1000 * 60 * 60 * 12;

    for (const provider of options.providers) {
      validateOidcProviderConfig(provider);
    }
  }

  async beginAuthorization(input: BeginOidcAuthorizationInput) {
    const provider = this.requireEnabledProvider(input.providerKey);
    const now = this.now();
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const codeVerifier = randomBytes(48).toString("base64url");
    const codeChallenge = base64urlSha256(codeVerifier);

    await this.stateStore.saveAuthorizationState({
      id: randomUUID(),
      providerKey: provider.providerKey,
      stateHash: hashOidcValue(state),
      nonceHash: provider.nonceRequired ? hashOidcValue(nonce) : null,
      codeVerifier,
      redirectUri: provider.redirectUri,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.stateTtlMs),
      consumedAt: null
    });

    const redirectUrl = new URL(provider.authorizationEndpoint);
    redirectUrl.searchParams.set("response_type", "code");
    redirectUrl.searchParams.set("client_id", provider.clientId);
    redirectUrl.searchParams.set("redirect_uri", provider.redirectUri);
    redirectUrl.searchParams.set("scope", provider.scopes.join(" "));
    redirectUrl.searchParams.set("state", state);

    if (provider.nonceRequired) {
      redirectUrl.searchParams.set("nonce", nonce);
    }

    if (provider.pkceRequired) {
      redirectUrl.searchParams.set("code_challenge", codeChallenge);
      redirectUrl.searchParams.set("code_challenge_method", "S256");
    }

    return {
      providerKey: provider.providerKey,
      redirectUrl: redirectUrl.toString(),
      expiresAt: new Date(now.getTime() + this.stateTtlMs).toISOString()
    };
  }

  async completeCallback(input: CompleteOidcCallbackInput, context: RequestSecurityContext = {}) {
    const provider = this.requireEnabledProvider(input.providerKey);
    const now = this.now();
    const stateRecord = await this.stateStore.consumeAuthorizationState({
      providerKey: provider.providerKey,
      stateHash: hashOidcValue(input.state),
      consumedAt: now
    });

    if (!stateRecord || stateRecord.expiresAt.getTime() <= now.getTime()) {
      await this.auditFailedCallback(provider.providerKey, "invalid_state", context);
      throw new AuthError("oidc_callback_invalid", "OIDC callback state is invalid or expired.", 400);
    }

    let identity: VerifiedOidcIdentity;
    let providerEmail: string;
    try {
      const tokenResponse = await this.tokenClient.exchangeAuthorizationCode({
        provider,
        code: input.code,
        redirectUri: stateRecord.redirectUri,
        codeVerifier: stateRecord.codeVerifier
      });
      identity = await this.loadAndValidateIdentity(provider, tokenResponse, stateRecord, now);
      providerEmail = normalizeRequiredEmail(identity.email);
    } catch (error) {
      await this.auditFailedCallback(
        provider.providerKey,
        error instanceof AuthError ? error.code : "oidc_callback_invalid",
        context
      );
      throw error;
    }

    const existingAccount = await this.repository.findIdentityAccountByProviderSubject(provider.providerKey, identity.subject);
    if (existingAccount) {
      if (existingAccount.user.disabledAt) {
        await this.auditFailedCallback(provider.providerKey, "user_disabled", context, existingAccount.user.id);
        throw new AuthError("invalid_credentials", "OIDC sign-in is not available for this account.", 401);
      }

      await this.repository.updateIdentityLastLogin(provider.providerKey, identity.subject, now);
      return this.createLoginSession({
        user: existingAccount.user,
        providerKey: provider.providerKey,
        providerSubject: identity.subject,
        providerEmail,
        activeOrganizationId: input.activeOrganizationId ?? null,
        context
      });
    }

    const usersWithEmail = await this.repository.findUsersByEmail(providerEmail);
    if (usersWithEmail.length > 0) {
      return this.linkExistingAccount({
        input,
        context,
        provider,
        providerEmail,
        identity,
        usersWithEmail
      });
    }

    const user = await this.createExternalUser(provider, identity, providerEmail, now);
    return this.createLoginSession({
      user,
      providerKey: provider.providerKey,
      providerSubject: identity.subject,
      providerEmail,
      activeOrganizationId: null,
      context
    });
  }

  private async linkExistingAccount(input: {
    input: CompleteOidcCallbackInput;
    context: RequestSecurityContext;
    provider: OidcProviderConfig;
    providerEmail: string;
    identity: VerifiedOidcIdentity;
    usersWithEmail: LocalAuthUserRecord[];
  }) {
    const approvedUserId = input.input.authenticatedUserId ?? null;

    if (!input.input.linkAccount || !approvedUserId) {
      await this.auditAccountLinkRejected(input.provider, input.providerEmail, "explicit_approval_required", input.context);
      await this.auditFailedCallback(input.provider.providerKey, "account_link_required", input.context);
      throw new AuthError(
        "account_link_required",
        "An existing PureSOC account uses this email. Sign in and explicitly approve account linking.",
        409
      );
    }

    if (!input.usersWithEmail.some((user) => user.id === approvedUserId)) {
      await this.auditAccountLinkRejected(input.provider, input.providerEmail, "authenticated_user_mismatch", input.context);
      await this.auditFailedCallback(input.provider.providerKey, "account_link_rejected", input.context, approvedUserId);
      throw new AuthError("account_link_rejected", "OIDC account link approval does not match the signed-in user.", 403);
    }

    const user = await this.repository.findUserById(approvedUserId);
    if (!user || user.disabledAt) {
      await this.auditAccountLinkRejected(input.provider, input.providerEmail, "user_unavailable", input.context);
      throw new AuthError("account_link_rejected", "OIDC account link approval does not match an active user.", 403);
    }

    const now = this.now();
    const identityAccount = await this.repository.createIdentityAccount({
      id: randomUUID(),
      userId: user.id,
      providerKey: input.provider.providerKey,
      providerSubject: input.identity.subject,
      providerEmail: input.providerEmail,
      displayName: input.identity.displayName ?? null,
      createdAt: now,
      lastLoginAt: now
    });

    await this.auditWriter.write({
      actorUserId: user.id,
      organizationId: input.input.activeOrganizationId ?? input.context.organizationId ?? null,
      targetType: "identity_account",
      targetId: identityAccount.id,
      action: "account_linked",
      ipAddress: input.context.ipAddress ?? null,
      userAgent: input.context.userAgent ?? null,
      afterJson: {
        providerKey: input.provider.providerKey,
        providerEmail: input.providerEmail
      }
    });

    return this.createLoginSession({
      user,
      providerKey: input.provider.providerKey,
      providerSubject: input.identity.subject,
      providerEmail: input.providerEmail,
      activeOrganizationId: input.input.activeOrganizationId ?? null,
      context: input.context
    });
  }

  private async createExternalUser(
    provider: OidcProviderConfig,
    identity: VerifiedOidcIdentity,
    providerEmail: string,
    now: Date
  ) {
    const userId = randomUUID();
    const identityAccount = {
      id: randomUUID(),
      userId,
      providerKey: provider.providerKey,
      providerSubject: identity.subject,
      providerEmail,
      displayName: identity.displayName ?? null,
      createdAt: now,
      lastLoginAt: now
    };
    const user = await this.repository.createExternalIdentityAccount({
      user: {
        id: userId,
        email: providerEmail,
        displayName: identity.displayName ?? null,
        emailVerifiedAt: now,
        disabledAt: null,
        createdAt: now,
        updatedAt: now
      },
      identityAccount
    });

    await this.auditWriter.write({
      actorUserId: user.id,
      organizationId: null,
      targetType: "identity_account",
      targetId: identityAccount.id,
      action: "identity_account_created",
      afterJson: {
        providerKey: provider.providerKey,
        providerEmail
      }
    });

    return user;
  }

  private async createLoginSession(input: {
    user: LocalAuthUserRecord;
    providerKey: OidcSocialProviderKey;
    providerSubject: string;
    providerEmail: string;
    activeOrganizationId?: string | null;
    context: RequestSecurityContext;
  }) {
    const now = this.now();
    const sessionSecret = createExpiringSecretToken({
      now,
      ttlMs: this.sessionTtlMs
    });
    const session = await this.repository.createSession({
      id: randomUUID(),
      userId: input.user.id,
      activeOrganizationId: input.activeOrganizationId ?? null,
      sessionHash: sessionSecret.tokenHash,
      ipAddress: input.context.ipAddress ?? null,
      userAgent: input.context.userAgent ?? null,
      expiresAt: sessionSecret.expiresAt,
      revokedAt: null,
      createdAt: now
    });

    await this.auditWriter.write({
      actorUserId: input.user.id,
      organizationId: input.activeOrganizationId ?? null,
      targetType: "session",
      targetId: session.id,
      action: "login",
      ipAddress: input.context.ipAddress ?? null,
      userAgent: input.context.userAgent ?? null,
      afterJson: {
        providerKey: input.providerKey,
        providerEmail: input.providerEmail
      }
    });

    await this.auditWriter.write({
      actorUserId: input.user.id,
      organizationId: input.activeOrganizationId ?? null,
      targetType: "session",
      targetId: session.id,
      action: "session_created",
      ipAddress: input.context.ipAddress ?? null,
      userAgent: input.context.userAgent ?? null,
      afterJson: {
        expiresAt: session.expiresAt.toISOString()
      }
    });

    return {
      user: publicUserView(input.user),
      session: safeSessionView(session),
      sessionToken: sessionSecret.plaintextToken
    };
  }

  private async loadAndValidateIdentity(
    provider: OidcProviderConfig,
    tokenResponse: OidcTokenResponse,
    stateRecord: OidcAuthorizationStateRecord,
    now: Date
  ) {
    const identity =
      provider.mode === "oauth_profile"
        ? await this.loadOauthProfile(provider, tokenResponse)
        : await this.loadOidcIdentity(provider, tokenResponse);

    if (!identity.signatureVerified) {
      throw new AuthError("oidc_callback_invalid", "OIDC ID token signature could not be verified.", 401);
    }

    if (identity.issuer !== provider.issuer) {
      throw new AuthError("oidc_callback_invalid", "OIDC issuer is not trusted.", 401);
    }

    if (!audienceIncludes(identity.audience, provider.clientId)) {
      throw new AuthError("oidc_callback_invalid", "OIDC audience does not match this PureSOC client.", 401);
    }

    if (identity.expiresAt.getTime() <= now.getTime()) {
      throw new AuthError("oidc_callback_invalid", "OIDC identity token is expired.", 401);
    }

    if (provider.nonceRequired) {
      const nonce = identity.nonce ?? "";
      if (!stateRecord.nonceHash || !secureStringEquals(stateRecord.nonceHash, hashOidcValue(nonce))) {
        throw new AuthError("oidc_callback_invalid", "OIDC nonce is invalid.", 401);
      }
    }

    if (!identity.subject) {
      throw new AuthError("oidc_callback_invalid", "OIDC subject claim is missing.", 401);
    }

    if (identity.emailVerified !== true) {
      throw new AuthError("oidc_callback_invalid", "OIDC provider email must be verified before sign-in.", 401);
    }

    return identity;
  }

  private async loadOidcIdentity(provider: OidcProviderConfig, tokenResponse: OidcTokenResponse) {
    if (!tokenResponse.idToken) {
      throw new AuthError("oidc_callback_invalid", "OIDC ID token is missing.", 401);
    }

    return this.tokenVerifier.verifyIdToken({
      provider,
      idToken: tokenResponse.idToken
    });
  }

  private async loadOauthProfile(provider: OidcProviderConfig, tokenResponse: OidcTokenResponse) {
    if (!tokenResponse.accessToken) {
      throw new AuthError("oidc_callback_invalid", "OAuth access token is missing for profile lookup.", 401);
    }

    return this.profileClient.loadProfile({
      provider,
      accessToken: tokenResponse.accessToken
    });
  }

  private requireEnabledProvider(providerKey: OidcSocialProviderKey) {
    const provider = this.providers.get(providerKey);
    if (!provider || !provider.enabled) {
      throw new AuthError("provider_disabled", "OIDC provider is disabled.", 404);
    }

    return provider;
  }

  private async auditFailedCallback(
    providerKey: OidcSocialProviderKey,
    reason: string,
    context: RequestSecurityContext,
    actorUserId?: string | null
  ) {
    await this.auditWriter.write({
      actorUserId: actorUserId ?? null,
      organizationId: context.organizationId ?? null,
      targetType: "identity_account",
      targetId: actorUserId ?? null,
      action: "failed_login",
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      afterJson: {
        providerKey,
        reason
      }
    });
  }

  private async auditAccountLinkRejected(
    provider: OidcProviderConfig,
    providerEmail: string,
    reason: string,
    context: RequestSecurityContext
  ) {
    await this.auditWriter.write({
      actorUserId: null,
      organizationId: context.organizationId ?? null,
      targetType: "identity_account",
      targetId: null,
      action: "account_link_rejected",
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      afterJson: {
        providerKey: provider.providerKey,
        providerEmail,
        reason
      }
    });
  }
}

export const isOidcSocialProviderKey = (value: string): value is OidcSocialProviderKey =>
  oidcSocialProviderKeys.some((providerKey) => providerKey === value);

export const validateOidcProviderConfig = (provider: OidcProviderConfig): void => {
  if (!isOidcSocialProviderKey(provider.providerKey)) {
    throw new OidcConfigurationError(`Unsupported OIDC social provider: ${provider.providerKey}`);
  }

  if (!provider.enabled) {
    return;
  }

  for (const [name, value] of [
    ["issuer", provider.issuer],
    ["authorizationEndpoint", provider.authorizationEndpoint],
    ["tokenEndpoint", provider.tokenEndpoint],
    ["clientId", provider.clientId],
    ["redirectUri", provider.redirectUri]
  ] as const) {
    if (!value) {
      throw new OidcConfigurationError(`${provider.providerKey} requires ${name}.`);
    }
  }

  assertValidUrl(provider.issuer, `${provider.providerKey} issuer`);
  assertValidUrl(provider.authorizationEndpoint, `${provider.providerKey} authorization endpoint`);
  assertValidUrl(provider.tokenEndpoint, `${provider.providerKey} token endpoint`);
  assertValidUrl(provider.redirectUri, `${provider.providerKey} redirect URI`);

  if (provider.mode === "oidc") {
    if (!provider.scopes.includes("openid")) {
      throw new OidcConfigurationError(`${provider.providerKey} OIDC scope must include openid.`);
    }

    if (!provider.nonceRequired) {
      throw new OidcConfigurationError(`${provider.providerKey} OIDC flow must require a nonce.`);
    }

    if (!provider.jwksUri) {
      throw new OidcConfigurationError(`${provider.providerKey} requires jwksUri for signature validation.`);
    }

    assertValidUrl(provider.jwksUri, `${provider.providerKey} JWKS URI`);
  }

  if (provider.mode === "oauth_profile") {
    if (!provider.profileEndpoint) {
      throw new OidcConfigurationError(`${provider.providerKey} requires profileEndpoint for social login.`);
    }

    assertValidUrl(provider.profileEndpoint, `${provider.providerKey} profile endpoint`);
    if (provider.emailEndpoint) {
      assertValidUrl(provider.emailEndpoint, `${provider.providerKey} email endpoint`);
    }
  }
};

export const hashOidcValue = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");

export const base64urlSha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("base64url");

export const decodeJwt = (jwt: string) => {
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new AuthError("oidc_callback_invalid", "OIDC ID token must be a signed JWT.", 401);
  }

  const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Record<string, unknown>;

  return {
    header,
    payload,
    signingInput: `${encodedHeader}.${encodedPayload}`,
    signature: Buffer.from(encodedSignature, "base64url")
  };
};

const identityFromJwtPayload = (
  provider: OidcProviderConfig,
  payload: Record<string, unknown>,
  signatureVerified: boolean
): VerifiedOidcIdentity => ({
  providerKey: provider.providerKey,
  issuer: String(payload.iss ?? ""),
  audience: Array.isArray(payload.aud) ? payload.aud.map(String) : String(payload.aud ?? ""),
  subject: String(payload.sub ?? ""),
  expiresAt: new Date(typeof payload.exp === "number" ? payload.exp * 1000 : 0),
  signatureVerified,
  nonce: stringOrNull(payload.nonce),
  email: stringOrNull(payload.email) ?? stringOrNull(payload.preferred_username),
  emailVerified: booleanOrNull(payload.email_verified),
  displayName: stringOrNull(payload.name)
});

const assertValidUrl = (value: string, label: string): void => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      throw new Error("OIDC endpoints must use HTTPS outside local development.");
    }
  } catch {
    throw new OidcConfigurationError(`${label} must be a valid URL.`);
  }
};

const normalizeRequiredEmail = (email: string | null | undefined): string => {
  if (!email) {
    throw new AuthError("oidc_callback_invalid", "OIDC provider did not return a verified email address.", 401);
  }

  return normalizeEmail(email);
};

const audienceIncludes = (audience: string | string[], expectedAudience: string): boolean =>
  Array.isArray(audience) ? audience.includes(expectedAudience) : audience === expectedAudience;

const secureStringEquals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const safeSessionView = (session: AuthenticatedSession) => ({
  id: session.id,
  userId: session.userId,
  activeOrganizationId: session.activeOrganizationId ?? null,
  expiresAt: session.expiresAt.toISOString()
});

const stringOrNull = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

const booleanOrNull = (value: unknown): boolean | null => (typeof value === "boolean" ? value : null);
