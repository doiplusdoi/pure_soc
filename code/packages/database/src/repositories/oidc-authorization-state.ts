import { createCipheriv, createDecipheriv, createHash, randomBytes as nodeRandomBytes } from "node:crypto";

type OidcSocialProviderKey = "microsoft_entra" | "google" | "github";

export interface PrismaOidcAuthorizationStateRecord {
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

interface OidcAuthorizationStateDelegate {
  create(args: { data: Record<string, unknown> }): Promise<OidcAuthorizationStateRow>;
  findFirst(args: {
    orderBy?: Record<string, "asc" | "desc">;
    where: Record<string, unknown>;
  }): Promise<OidcAuthorizationStateRow | null>;
  updateMany(args: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<{ count: number }>;
}

export interface PrismaOidcAuthorizationStateClient {
  oidcAuthorizationState: OidcAuthorizationStateDelegate;
}

export interface PrismaOidcAuthorizationStateStoreOptions {
  codeVerifierEncryptionKey: string;
  randomBytes?: (size: number) => Buffer;
}

interface OidcAuthorizationStateRow {
  id: string;
  providerKey: OidcSocialProviderKey;
  stateHash: string;
  nonceHash?: string | null;
  codeVerifierEnvelope: string;
  redirectUri: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  consumedAt?: Date | string | null;
}

interface CodeVerifierEnvelope {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
}

export class PrismaOidcAuthorizationStateStore {
  private readonly randomBytes: (size: number) => Buffer;
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly client: PrismaOidcAuthorizationStateClient,
    options: PrismaOidcAuthorizationStateStoreOptions
  ) {
    if (!options.codeVerifierEncryptionKey.trim()) {
      throw new Error("OIDC authorization state verifier encryption key is required.");
    }

    this.encryptionKey = createHash("sha256").update(options.codeVerifierEncryptionKey, "utf8").digest();
    this.randomBytes = options.randomBytes ?? nodeRandomBytes;
  }

  async saveAuthorizationState(
    input: PrismaOidcAuthorizationStateRecord
  ): Promise<PrismaOidcAuthorizationStateRecord> {
    const row = await this.client.oidcAuthorizationState.create({
      data: {
        id: input.id,
        providerKey: input.providerKey,
        stateHash: input.stateHash,
        nonceHash: input.nonceHash ?? null,
        codeVerifierEnvelope: this.protectCodeVerifier(input.codeVerifier),
        redirectUri: input.redirectUri,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
        consumedAt: input.consumedAt ?? null
      }
    });

    return this.fromRow(row);
  }

  async consumeAuthorizationState(input: {
    providerKey: OidcSocialProviderKey;
    stateHash: string;
    consumedAt: Date;
  }): Promise<PrismaOidcAuthorizationStateRecord | null> {
    const existing = await this.client.oidcAuthorizationState.findFirst({
      where: {
        providerKey: input.providerKey,
        stateHash: input.stateHash,
        consumedAt: null
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!existing || toDate(existing.expiresAt).getTime() <= input.consumedAt.getTime()) {
      return null;
    }

    const result = await this.client.oidcAuthorizationState.updateMany({
      where: {
        id: existing.id,
        consumedAt: null
      },
      data: {
        consumedAt: input.consumedAt
      }
    });

    if (result.count !== 1) {
      return null;
    }

    const consumed = await this.client.oidcAuthorizationState.findFirst({
      where: {
        id: existing.id
      }
    });

    try {
      return consumed ? this.fromRow(consumed) : null;
    } catch {
      return null;
    }
  }

  private protectCodeVerifier(codeVerifier: string): string {
    const iv = this.randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(codeVerifier, "utf8"), cipher.final()]);

    return JSON.stringify({
      version: 1,
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64url"),
      tag: cipher.getAuthTag().toString("base64url"),
      ciphertext: ciphertext.toString("base64url")
    } satisfies CodeVerifierEnvelope);
  }

  private revealCodeVerifier(envelopeJson: string): string {
    const envelope = JSON.parse(envelopeJson) as Partial<CodeVerifierEnvelope>;
    if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") {
      throw new Error("Unsupported OIDC authorization state verifier envelope.");
    }

    const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey, Buffer.from(envelope.iv ?? "", "base64url"));
    decipher.setAuthTag(Buffer.from(envelope.tag ?? "", "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext ?? "", "base64url")),
      decipher.final()
    ]).toString("utf8");
  }

  private fromRow(row: OidcAuthorizationStateRow): PrismaOidcAuthorizationStateRecord {
    return {
      id: row.id,
      providerKey: row.providerKey,
      stateHash: row.stateHash,
      nonceHash: row.nonceHash ?? null,
      codeVerifier: this.revealCodeVerifier(row.codeVerifierEnvelope),
      redirectUri: row.redirectUri,
      createdAt: toDate(row.createdAt),
      expiresAt: toDate(row.expiresAt),
      consumedAt: toNullableDate(row.consumedAt)
    };
  }
}

const toDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

const toNullableDate = (value: Date | string | null | undefined): Date | null =>
  value === null || value === undefined ? null : toDate(value);
