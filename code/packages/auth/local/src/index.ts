import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { Algorithm, hash, verify } from "@node-rs/argon2";

import {
  AuthError,
  normalizeEmail,
  publicUserView,
  type AuthenticatedSession,
  type AuthenticatedUser,
  type AuthProviderKey
} from "@puresoc/auth-core";

export const localAuthProviderKey: AuthProviderKey = "local";
export const passwordHashAlgorithm = "argon2id" as const;

export interface PasswordPolicy {
  minLength: number;
}

export const defaultPasswordPolicy: PasswordPolicy = {
  minLength: 12
};

export interface PasswordHasher {
  hashPassword(password: string): Promise<string>;
  verifyPassword(passwordHash: string, password: string): Promise<boolean>;
}

export interface Argon2idPasswordHasherOptions {
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
  outputLen?: number;
}

export class Argon2idPasswordHasher implements PasswordHasher {
  private readonly options: Required<Argon2idPasswordHasherOptions>;

  constructor(options: Argon2idPasswordHasherOptions = {}) {
    this.options = {
      memoryCost: options.memoryCost ?? 19_456,
      timeCost: options.timeCost ?? 2,
      parallelism: options.parallelism ?? 1,
      outputLen: options.outputLen ?? 32
    };
  }

  async hashPassword(password: string): Promise<string> {
    return hash(password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: this.options.memoryCost,
      timeCost: this.options.timeCost,
      parallelism: this.options.parallelism,
      outputLen: this.options.outputLen
    });
  }

  async verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}

export interface ExpiringSecretToken {
  plaintextToken: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}

export const hashSecretToken = (plaintextToken: string): string =>
  createHash("sha256").update(plaintextToken, "utf8").digest("hex");

export const createExpiringSecretToken = (options: {
  now?: Date;
  ttlMs: number;
  byteLength?: number;
}): ExpiringSecretToken => {
  const createdAt = options.now ?? new Date();
  const plaintextToken = randomBytes(options.byteLength ?? 32).toString("base64url");

  return {
    plaintextToken,
    tokenHash: hashSecretToken(plaintextToken),
    createdAt,
    expiresAt: new Date(createdAt.getTime() + options.ttlMs)
  };
};

export interface ExpiringTokenRecord {
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}

export const isTokenExpired = (token: ExpiringTokenRecord, now = new Date()): boolean =>
  token.usedAt !== null && token.usedAt !== undefined ? true : token.expiresAt.getTime() <= now.getTime();

export const tokenHashMatches = (tokenHash: string, plaintextToken: string): boolean => {
  const expected = Buffer.from(tokenHash, "hex");
  const actual = Buffer.from(hashSecretToken(plaintextToken), "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export interface LocalAuthUserRecord extends AuthenticatedUser {
  createdAt: Date;
  updatedAt: Date;
  disabledAt?: Date | null;
}

export interface LocalCredentialRecord {
  id: string;
  userId: string;
  email: string;
  passwordHash: string;
  passwordHashAlgorithm: typeof passwordHashAlgorithm;
  passwordUpdatedAt: Date;
  emailVerifiedAt?: Date | null;
  failedLoginCount: number;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IdentityAccountRecord {
  id: string;
  userId: string;
  providerKey: AuthProviderKey;
  providerSubject: string;
  providerEmail?: string | null;
  displayName?: string | null;
  createdAt: Date;
  lastLoginAt?: Date | null;
}

export interface SessionRecord extends AuthenticatedSession {
  sessionHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  revokedAt?: Date | null;
  createdAt: Date;
}

export interface EmailVerificationTokenRecord extends ExpiringTokenRecord {
  id: string;
  userId: string;
  email: string;
  createdAt: Date;
}

export interface PasswordResetTokenRecord extends ExpiringTokenRecord {
  id: string;
  userId: string;
  createdAt: Date;
}

export interface CreateLocalAccountInput {
  user: LocalAuthUserRecord;
  identityAccount: IdentityAccountRecord;
  credential: LocalCredentialRecord;
  emailVerificationToken: EmailVerificationTokenRecord;
}

export interface LocalAuthRepository {
  findUserById(userId: string): Promise<LocalAuthUserRecord | null>;
  findLocalCredentialByEmail(email: string): Promise<LocalCredentialRecord | null>;
  findLocalCredentialByUserId(userId: string): Promise<LocalCredentialRecord | null>;
  createLocalAccount(input: CreateLocalAccountInput): Promise<LocalAuthUserRecord>;
  updateLocalCredential(
    credentialId: string,
    patch: Partial<
      Pick<
        LocalCredentialRecord,
        "failedLoginCount" | "lockedUntil" | "passwordHash" | "passwordUpdatedAt" | "emailVerifiedAt"
      >
    >
  ): Promise<LocalCredentialRecord>;
  updateIdentityLastLogin(providerKey: AuthProviderKey, providerSubject: string, lastLoginAt: Date): Promise<void>;
  createSession(input: SessionRecord): Promise<SessionRecord>;
  findSessionByHash(sessionHash: string): Promise<(SessionRecord & { user: LocalAuthUserRecord }) | null>;
  updateSessionActiveOrganization(sessionId: string, activeOrganizationId: string | null): Promise<SessionRecord>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<SessionRecord | null>;
  createPasswordResetToken(input: PasswordResetTokenRecord): Promise<PasswordResetTokenRecord>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  markPasswordResetTokenUsed(tokenId: string, usedAt: Date): Promise<void>;
  findEmailVerificationTokenByHash(tokenHash: string): Promise<EmailVerificationTokenRecord | null>;
  markEmailVerificationTokenUsed(tokenId: string, usedAt: Date): Promise<void>;
}

export interface LocalAuthAuditWriter {
  write(input: {
    actorUserId?: string | null;
    organizationId?: string | null;
    targetType: string;
    targetId?: string | null;
    action: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    beforeJson?: unknown;
    afterJson?: unknown;
  }): Promise<unknown>;
}

export interface RequestSecurityContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  organizationId?: string | null;
}

export interface FailedLoginRateLimiterOptions {
  maxAttempts: number;
  windowMs: number;
  now?: () => Date;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export class FailedLoginRateLimiter {
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly now: () => Date;
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(options: FailedLoginRateLimiterOptions) {
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.now = options.now ?? (() => new Date());
  }

  assertAllowed(input: { email: string; ipAddress?: string | null; organizationId?: string | null }): void {
    for (const key of this.keysFor(input)) {
      const bucket = this.currentBucket(key);
      if (bucket.count >= this.maxAttempts) {
        throw new AuthError("rate_limited", "Too many failed login attempts.", 429);
      }
    }
  }

  recordFailure(input: { email: string; ipAddress?: string | null; organizationId?: string | null }): void {
    for (const key of this.keysFor(input)) {
      const bucket = this.currentBucket(key);
      bucket.count += 1;
      this.buckets.set(key, bucket);
    }
  }

  reset(input: { email: string; ipAddress?: string | null; organizationId?: string | null }): void {
    for (const key of this.keysFor(input)) {
      this.buckets.delete(key);
    }
  }

  private currentBucket(key: string): RateLimitBucket {
    const nowMs = this.now().getTime();
    const existing = this.buckets.get(key);

    if (existing && existing.resetAt > nowMs) {
      return existing;
    }

    return {
      count: 0,
      resetAt: nowMs + this.windowMs
    };
  }

  private keysFor(input: { email: string; ipAddress?: string | null; organizationId?: string | null }) {
    return [
      `email:${normalizeEmail(input.email)}`,
      input.ipAddress ? `ip:${input.ipAddress}` : null,
      input.organizationId ? `org:${input.organizationId}` : null
    ].filter((value): value is string => value !== null);
  }
}

export interface LocalAuthServiceOptions {
  repository: LocalAuthRepository;
  auditWriter: LocalAuthAuditWriter;
  passwordHasher?: PasswordHasher;
  passwordPolicy?: PasswordPolicy;
  rateLimiter?: FailedLoginRateLimiter;
  now?: () => Date;
  sessionTtlMs?: number;
  emailVerificationTtlMs?: number;
  passwordResetTtlMs?: number;
  lockoutMs?: number;
  failedAttemptsBeforeLock?: number;
}

export interface RegisterLocalAccountInput {
  email: string;
  password: string;
  displayName?: string | null;
  deliverEmailVerificationToken?: (input: { userId: string; email: string; plaintextToken: string; expiresAt: Date }) => void;
}

export interface LoginLocalAccountInput {
  email: string;
  password: string;
  activeOrganizationId?: string | null;
}

export class LocalAuthService {
  private readonly repository: LocalAuthRepository;
  private readonly auditWriter: LocalAuthAuditWriter;
  private readonly passwordHasher: PasswordHasher;
  private readonly passwordPolicy: PasswordPolicy;
  private readonly rateLimiter: FailedLoginRateLimiter;
  private readonly now: () => Date;
  private readonly sessionTtlMs: number;
  private readonly emailVerificationTtlMs: number;
  private readonly passwordResetTtlMs: number;
  private readonly lockoutMs: number;
  private readonly failedAttemptsBeforeLock: number;

  constructor(options: LocalAuthServiceOptions) {
    this.repository = options.repository;
    this.auditWriter = options.auditWriter;
    this.passwordHasher = options.passwordHasher ?? new Argon2idPasswordHasher();
    this.passwordPolicy = options.passwordPolicy ?? defaultPasswordPolicy;
    this.rateLimiter =
      options.rateLimiter ??
      new FailedLoginRateLimiter({
        maxAttempts: 5,
        windowMs: 60_000,
        now: options.now
      });
    this.now = options.now ?? (() => new Date());
    this.sessionTtlMs = options.sessionTtlMs ?? 1000 * 60 * 60 * 12;
    this.emailVerificationTtlMs = options.emailVerificationTtlMs ?? 1000 * 60 * 60 * 24;
    this.passwordResetTtlMs = options.passwordResetTtlMs ?? 1000 * 60 * 30;
    this.lockoutMs = options.lockoutMs ?? 1000 * 60 * 15;
    this.failedAttemptsBeforeLock = options.failedAttemptsBeforeLock ?? 5;
  }

  async register(input: RegisterLocalAccountInput, context: RequestSecurityContext = {}) {
    const email = normalizeEmail(input.email);
    this.assertPasswordPolicy(input.password);

    const existingCredential = await this.repository.findLocalCredentialByEmail(email);
    if (existingCredential) {
      throw new AuthError("email_already_registered", "Email is already registered.", 409);
    }

    const now = this.now();
    const userId = randomUUID();
    const passwordHash = await this.passwordHasher.hashPassword(input.password);
    const verificationToken = createExpiringSecretToken({
      now,
      ttlMs: this.emailVerificationTtlMs
    });

    const user = await this.repository.createLocalAccount({
      user: {
        id: userId,
        email,
        displayName: input.displayName ?? null,
        emailVerifiedAt: null,
        disabledAt: null,
        createdAt: now,
        updatedAt: now
      },
      identityAccount: {
        id: randomUUID(),
        userId,
        providerKey: localAuthProviderKey,
        providerSubject: email,
        providerEmail: email,
        displayName: input.displayName ?? null,
        createdAt: now,
        lastLoginAt: null
      },
      credential: {
        id: randomUUID(),
        userId,
        email,
        passwordHash,
        passwordHashAlgorithm,
        passwordUpdatedAt: now,
        emailVerifiedAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now
      },
      emailVerificationToken: {
        id: randomUUID(),
        userId,
        email,
        tokenHash: verificationToken.tokenHash,
        expiresAt: verificationToken.expiresAt,
        usedAt: null,
        createdAt: verificationToken.createdAt
      }
    });

    input.deliverEmailVerificationToken?.({
      userId,
      email,
      plaintextToken: verificationToken.plaintextToken,
      expiresAt: verificationToken.expiresAt
    });

    await this.auditWriter.write({
      actorUserId: user.id,
      organizationId: context.organizationId ?? null,
      targetType: "user",
      targetId: user.id,
      action: "local_account_created",
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      afterJson: {
        email,
        providerKey: localAuthProviderKey
      }
    });

    return {
      user: publicUserView(user),
      emailVerificationRequired: true
    };
  }

  async login(input: LoginLocalAccountInput, context: RequestSecurityContext = {}) {
    const email = normalizeEmail(input.email);
    const limiterInput = {
      email,
      ipAddress: context.ipAddress ?? null,
      organizationId: input.activeOrganizationId ?? context.organizationId ?? null
    };

    try {
      this.rateLimiter.assertAllowed(limiterInput);
    } catch (error) {
      await this.auditFailedLogin(email, "rate_limited", context, input.activeOrganizationId ?? null);
      throw error;
    }

    const credential = await this.repository.findLocalCredentialByEmail(email);
    if (!credential) {
      this.rateLimiter.recordFailure(limiterInput);
      await this.auditFailedLogin(email, "invalid_credentials", context, input.activeOrganizationId ?? null);
      throw new AuthError("invalid_credentials", "Invalid email or password.", 401);
    }

    const now = this.now();
    if (credential.lockedUntil && credential.lockedUntil.getTime() > now.getTime()) {
      this.rateLimiter.recordFailure(limiterInput);
      await this.auditFailedLogin(email, "account_locked", context, input.activeOrganizationId ?? null, credential.userId);
      throw new AuthError("account_locked", "Account is temporarily locked.", 423);
    }

    const passwordMatches = await this.passwordHasher.verifyPassword(credential.passwordHash, input.password);
    if (!passwordMatches) {
      const failedLoginCount = credential.failedLoginCount + 1;
      const lockedUntil =
        failedLoginCount >= this.failedAttemptsBeforeLock ? new Date(now.getTime() + this.lockoutMs) : credential.lockedUntil;

      await this.repository.updateLocalCredential(credential.id, {
        failedLoginCount,
        lockedUntil
      });
      this.rateLimiter.recordFailure(limiterInput);
      await this.auditFailedLogin(
        email,
        lockedUntil ? "account_locked" : "invalid_credentials",
        context,
        input.activeOrganizationId ?? null,
        credential.userId
      );
      throw new AuthError("invalid_credentials", "Invalid email or password.", 401);
    }

    const user = await this.repository.findUserById(credential.userId);
    if (!user || user.disabledAt) {
      this.rateLimiter.recordFailure(limiterInput);
      await this.auditFailedLogin(email, "invalid_credentials", context, input.activeOrganizationId ?? null, credential.userId);
      throw new AuthError("invalid_credentials", "Invalid email or password.", 401);
    }

    const sessionSecret = createExpiringSecretToken({
      now,
      ttlMs: this.sessionTtlMs
    });
    const session = await this.repository.createSession({
      id: randomUUID(),
      userId: user.id,
      activeOrganizationId: input.activeOrganizationId ?? null,
      sessionHash: sessionSecret.tokenHash,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      expiresAt: sessionSecret.expiresAt,
      revokedAt: null,
      createdAt: now
    });

    await this.repository.updateLocalCredential(credential.id, {
      failedLoginCount: 0,
      lockedUntil: null
    });
    await this.repository.updateIdentityLastLogin(localAuthProviderKey, email, now);
    this.rateLimiter.reset(limiterInput);

    await this.auditWriter.write({
      actorUserId: user.id,
      organizationId: input.activeOrganizationId ?? null,
      targetType: "session",
      targetId: session.id,
      action: "login",
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      afterJson: {
        providerKey: localAuthProviderKey,
        email
      }
    });

    await this.auditWriter.write({
      actorUserId: user.id,
      organizationId: input.activeOrganizationId ?? null,
      targetType: "session",
      targetId: session.id,
      action: "session_created",
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      afterJson: {
        expiresAt: session.expiresAt.toISOString()
      }
    });

    return {
      user: publicUserView(user),
      session: this.safeSessionView(session),
      sessionToken: sessionSecret.plaintextToken
    };
  }

  async getSession(plaintextSessionToken: string) {
    const session = await this.getValidSessionRecord(plaintextSessionToken);

    return {
      user: publicUserView(session.user),
      session: this.safeSessionView(session)
    };
  }

  async selectActiveOrganization(
    plaintextSessionToken: string,
    activeOrganizationId: string | null,
    context: RequestSecurityContext = {}
  ) {
    const session = await this.getValidSessionRecord(plaintextSessionToken);
    const updatedSession = await this.repository.updateSessionActiveOrganization(session.id, activeOrganizationId);

    await this.auditWriter.write({
      actorUserId: session.userId,
      organizationId: activeOrganizationId ?? null,
      targetType: "session",
      targetId: session.id,
      action: "session_active_organization_changed",
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      beforeJson: {
        activeOrganizationId: session.activeOrganizationId ?? null
      },
      afterJson: {
        activeOrganizationId: updatedSession.activeOrganizationId ?? null
      }
    });

    return {
      user: publicUserView(session.user),
      session: this.safeSessionView(updatedSession)
    };
  }

  async logout(plaintextSessionToken: string, context: RequestSecurityContext = {}) {
    const session = await this.getValidSessionRecord(plaintextSessionToken);
    const revoked = await this.repository.revokeSession(session.id, this.now());

    await this.auditWriter.write({
      actorUserId: session.userId,
      organizationId: session.activeOrganizationId ?? null,
      targetType: "session",
      targetId: session.id,
      action: "logout",
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      afterJson: {
        revokedAt: revoked?.revokedAt?.toISOString() ?? null
      }
    });

    return {
      revoked: true
    };
  }

  async requestPasswordReset(
    input: {
      email: string;
      deliverPasswordResetToken?: (delivery: { userId: string; email: string; plaintextToken: string; expiresAt: Date }) => void;
    },
    context: RequestSecurityContext = {}
  ) {
    const email = normalizeEmail(input.email);
    const credential = await this.repository.findLocalCredentialByEmail(email);

    if (credential) {
      const resetToken = createExpiringSecretToken({
        now: this.now(),
        ttlMs: this.passwordResetTtlMs
      });
      await this.repository.createPasswordResetToken({
        id: randomUUID(),
        userId: credential.userId,
        tokenHash: resetToken.tokenHash,
        expiresAt: resetToken.expiresAt,
        usedAt: null,
        createdAt: resetToken.createdAt
      });
      input.deliverPasswordResetToken?.({
        userId: credential.userId,
        email,
        plaintextToken: resetToken.plaintextToken,
        expiresAt: resetToken.expiresAt
      });
      await this.auditWriter.write({
        actorUserId: credential.userId,
        organizationId: context.organizationId ?? null,
        targetType: "user",
        targetId: credential.userId,
        action: "password_reset_requested",
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        afterJson: { email }
      });
    }

    return {
      accepted: true
    };
  }

  async resetPassword(input: { plaintextToken: string; newPassword: string }, context: RequestSecurityContext = {}) {
    this.assertPasswordPolicy(input.newPassword);
    const token = await this.repository.findPasswordResetTokenByHash(hashSecretToken(input.plaintextToken));
    const now = this.now();

    if (!token || isTokenExpired(token, now)) {
      throw new AuthError("invalid_request", "Password reset token is invalid or expired.", 400);
    }

    const credential = await this.repository.findLocalCredentialByUserId(token.userId);
    if (!credential) {
      throw new AuthError("invalid_request", "Password reset token is invalid or expired.", 400);
    }

    await this.repository.updateLocalCredential(credential.id, {
      passwordHash: await this.passwordHasher.hashPassword(input.newPassword),
      passwordUpdatedAt: now,
      failedLoginCount: 0,
      lockedUntil: null
    });
    await this.repository.markPasswordResetTokenUsed(token.id, now);
    await this.auditWriter.write({
      actorUserId: token.userId,
      organizationId: context.organizationId ?? null,
      targetType: "user",
      targetId: token.userId,
      action: "password_changed",
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      afterJson: { method: "password_reset" }
    });

    return {
      changed: true
    };
  }

  async verifyEmail(input: { plaintextToken: string }, context: RequestSecurityContext = {}) {
    const token = await this.repository.findEmailVerificationTokenByHash(hashSecretToken(input.plaintextToken));
    const now = this.now();

    if (!token || isTokenExpired(token, now)) {
      throw new AuthError("invalid_request", "Email verification token is invalid or expired.", 400);
    }

    const credential = await this.repository.findLocalCredentialByUserId(token.userId);
    if (!credential || credential.email !== token.email) {
      throw new AuthError("invalid_request", "Email verification token is invalid or expired.", 400);
    }

    await this.repository.updateLocalCredential(credential.id, {
      emailVerifiedAt: now
    });
    await this.repository.markEmailVerificationTokenUsed(token.id, now);
    await this.auditWriter.write({
      actorUserId: token.userId,
      organizationId: context.organizationId ?? null,
      targetType: "user",
      targetId: token.userId,
      action: "email_verified",
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      afterJson: { email: token.email }
    });

    return {
      verified: true
    };
  }

  private assertPasswordPolicy(password: string): void {
    if (password.length < this.passwordPolicy.minLength) {
      throw new AuthError(
        "invalid_request",
        `Password must be at least ${this.passwordPolicy.minLength} characters long.`,
        400
      );
    }
  }

  private async getValidSessionRecord(plaintextSessionToken: string) {
    const session = await this.repository.findSessionByHash(hashSecretToken(plaintextSessionToken));
    const now = this.now();

    if (!session || session.revokedAt || session.expiresAt.getTime() <= now.getTime()) {
      throw new AuthError("session_invalid", "Session is invalid or expired.", 401);
    }

    return session;
  }

  private safeSessionView(session: AuthenticatedSession) {
    return {
      id: session.id,
      userId: session.userId,
      activeOrganizationId: session.activeOrganizationId ?? null,
      expiresAt: session.expiresAt.toISOString()
    };
  }

  private async auditFailedLogin(
    email: string,
    reason: string,
    context: RequestSecurityContext,
    organizationId?: string | null,
    actorUserId?: string | null
  ) {
    await this.auditWriter.write({
      actorUserId: actorUserId ?? null,
      organizationId: organizationId ?? context.organizationId ?? null,
      targetType: "local_credential",
      targetId: actorUserId ?? null,
      action: "failed_login",
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      afterJson: {
        email,
        reason
      }
    });
  }
}
