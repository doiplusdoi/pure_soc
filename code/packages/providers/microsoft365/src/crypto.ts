import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface Microsoft365TokenCipher {
  encrypt(payload: object): string;
  decrypt<TPayload extends object>(encryptedPayload: string): TPayload;
}

export interface Microsoft365TokenCipherKey {
  keyId: string;
  masterKey: string;
}

export const microsoft365LocalTokenKeyProviderKind = "local-env-key-ring" as const;
export const microsoft365FakeSecretManagerTokenKeyProviderKind = "fake-secret-manager-test" as const;
export const microsoft365TokenKeyCustodySummarySchemaVersion =
  "puresoc.microsoft365.provider-token.custody.v1" as const;

export const microsoft365SupportedTokenKeyProviderKinds = [
  microsoft365LocalTokenKeyProviderKind,
  microsoft365FakeSecretManagerTokenKeyProviderKind
] as const;

export type Microsoft365TokenKeyProviderKind = (typeof microsoft365SupportedTokenKeyProviderKinds)[number];

export type Microsoft365TokenKeyCustodyBoundary =
  | "local-process-key-ring"
  | "deterministic-fake-secret-manager";

export interface Microsoft365TokenKeyCustodyCapabilities {
  activeKeyLookup: true;
  previousKeyLookup: boolean;
  keyVersionMetadata: boolean;
  rotationReadinessMetadata: true;
  ciphertextBackfillPlanning: true;
  ciphertextBackfillExecution: false;
  liveSecretManagerCalls: false;
  liveKmsCalls: false;
  liveMicrosoftGraphCalls: false;
  providerWrites: false;
}

export interface Microsoft365TokenKeyVersionMetadata {
  keyId: string;
  versionId: string;
  role: "active" | "previous";
  custodyProviderKind: Microsoft365TokenKeyProviderKind;
  source: "environment" | "deterministic-fake-secret-manager";
}

export interface Microsoft365TokenRotationReadinessSummary {
  stagedPreviousKeyCount: number;
  activeKeyLookupReady: boolean;
  previousKeyLookupReady: boolean;
  missingKeyIds: string[];
  operatorSecretInjectionRequired: true;
  ciphertextBackfillStatus: "metadata_only_deferred";
  rollbackExpectation: "restore_previous_key_window_and_redeploy";
}

export interface Microsoft365TokenKeyCustodySummary {
  schemaVersion: typeof microsoft365TokenKeyCustodySummarySchemaVersion;
  providerKind: Microsoft365TokenKeyProviderKind;
  status: "ready";
  custodyBoundary: Microsoft365TokenKeyCustodyBoundary;
  activeKeyId: string;
  previousKeyIds: string[];
  keyCount: number;
  plaintextKeyMaterialAccessibleToProcess: true;
  externalKmsBacked: false;
  externalSecretManagerBacked: false;
  testOnly: boolean;
  capabilities: Microsoft365TokenKeyCustodyCapabilities;
  keyVersions: Microsoft365TokenKeyVersionMetadata[];
  rotationReadiness: Microsoft365TokenRotationReadinessSummary;
  ciphertextBackfillSupported: false;
}

export interface Microsoft365TokenKeyProvider {
  readonly providerKind: Microsoft365TokenKeyProviderKind;
  activeKey(): Microsoft365TokenCipherKey;
  decryptionKeysForEnvelope(keyId?: string): Microsoft365TokenCipherKey[];
  describe(): Microsoft365TokenKeyCustodySummary;
}

export interface CreateLocalMicrosoft365TokenCipherOptions {
  masterKey?: string;
  keyId?: string;
  activeKeyId?: string;
  keys?: Microsoft365TokenCipherKey[];
  keyProvider?: Microsoft365TokenKeyProvider;
}

export interface CreateLocalMicrosoft365TokenKeyProviderOptions {
  masterKey?: string;
  keyId?: string;
  activeKeyId?: string;
  keys?: Microsoft365TokenCipherKey[];
}

export interface Microsoft365FakeSecretManagerTokenCipherKey extends Microsoft365TokenCipherKey {
  versionId?: string;
}

export interface CreateFakeMicrosoft365SecretManagerTokenKeyProviderOptions {
  activeKeyId: string;
  keys: Microsoft365FakeSecretManagerTokenCipherKey[];
}

export interface CreateMicrosoft365TokenKeyProviderFromConfigOptions {
  providerKind?: string;
  activeKeyId?: string;
  activeKeyMaterial?: string;
  previousKeys?: Microsoft365TokenCipherKey[];
}

export const localDevMicrosoft365TokenKeyId = "local-dev" as const;
export const localDevMicrosoft365TokenMasterKey = "local-dev-provider-token-key-change-me" as const;

const keyFromMasterKey = (masterKey: string): Buffer => createHash("sha256").update(masterKey).digest();

const sanitizeKeyIdForVersion = (keyId: string): string =>
  keyId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "key";

const custodyCapabilities = (input: {
  previousKeyCount: number;
  keyVersionMetadata: boolean;
}): Microsoft365TokenKeyCustodyCapabilities => ({
  activeKeyLookup: true,
  previousKeyLookup: input.previousKeyCount > 0,
  keyVersionMetadata: input.keyVersionMetadata,
  rotationReadinessMetadata: true,
  ciphertextBackfillPlanning: true,
  ciphertextBackfillExecution: false,
  liveSecretManagerCalls: false,
  liveKmsCalls: false,
  liveMicrosoftGraphCalls: false,
  providerWrites: false
});

const rotationReadinessSummary = (input: {
  previousKeyCount: number;
  missingKeyIds?: string[];
}): Microsoft365TokenRotationReadinessSummary => ({
  stagedPreviousKeyCount: input.previousKeyCount,
  activeKeyLookupReady: true,
  previousKeyLookupReady: input.previousKeyCount > 0,
  missingKeyIds: input.missingKeyIds ?? [],
  operatorSecretInjectionRequired: true,
  ciphertextBackfillStatus: "metadata_only_deferred",
  rollbackExpectation: "restore_previous_key_window_and_redeploy"
});

const localKeyVersionMetadata = (
  providerKind: Microsoft365TokenKeyProviderKind,
  activeKeyId: string,
  keys: Microsoft365TokenCipherKey[],
  source: Microsoft365TokenKeyVersionMetadata["source"]
): Microsoft365TokenKeyVersionMetadata[] =>
  keys.map((key) => ({
    keyId: key.keyId,
    versionId: `${source}:${sanitizeKeyIdForVersion(key.keyId)}:operator-supplied`,
    role: key.keyId === activeKeyId ? "active" : "previous",
    custodyProviderKind: providerKind,
    source
  }));

const normalizeCipherKeys = (
  options: CreateLocalMicrosoft365TokenKeyProviderOptions
): { activeKey: Microsoft365TokenCipherKey; keysById: Map<string, Microsoft365TokenCipherKey> } => {
  const keys =
    options.keys && options.keys.length > 0
      ? options.keys
      : [
          {
            keyId: options.keyId ?? localDevMicrosoft365TokenKeyId,
            masterKey: options.masterKey ?? localDevMicrosoft365TokenMasterKey
          }
        ];
  const keysById = new Map<string, Microsoft365TokenCipherKey>();

  for (const key of keys) {
    if (!key.keyId.trim() || !key.masterKey.trim()) {
      throw new Error("Microsoft 365 credential key ring contains an empty key ID or key.");
    }

    if (keysById.has(key.keyId)) {
      throw new Error(`Microsoft 365 credential key ring contains duplicate key ID: ${key.keyId}`);
    }

    keysById.set(key.keyId, key);
  }

  const activeKeyId = options.activeKeyId ?? keys[0]?.keyId;
  const activeKey = activeKeyId ? keysById.get(activeKeyId) : undefined;
  if (!activeKey) {
    throw new Error("Microsoft 365 credential active key ID is not present in the key ring.");
  }

  return { activeKey, keysById };
};

export const createLocalMicrosoft365TokenKeyProvider = (
  options: CreateLocalMicrosoft365TokenKeyProviderOptions
): Microsoft365TokenKeyProvider => {
  const { activeKey, keysById } = normalizeCipherKeys(options);
  const configuredKeys = [...keysById.values()];
  const previousKeyIds = configuredKeys
    .filter((key) => key.keyId !== activeKey.keyId)
    .map((key) => key.keyId);

  return {
    providerKind: microsoft365LocalTokenKeyProviderKind,
    activeKey: () => activeKey,
    decryptionKeysForEnvelope: (keyId?: string): Microsoft365TokenCipherKey[] => {
      if (keyId) {
        const configuredKey = keysById.get(keyId);
        return configuredKey ? [configuredKey] : [];
      }

      return [activeKey, ...configuredKeys.filter((key) => key.keyId !== activeKey.keyId)];
    },
    describe: () => ({
      schemaVersion: microsoft365TokenKeyCustodySummarySchemaVersion,
      providerKind: microsoft365LocalTokenKeyProviderKind,
      status: "ready",
      custodyBoundary: "local-process-key-ring",
      activeKeyId: activeKey.keyId,
      previousKeyIds,
      keyCount: configuredKeys.length,
      plaintextKeyMaterialAccessibleToProcess: true,
      externalKmsBacked: false,
      externalSecretManagerBacked: false,
      testOnly: false,
      capabilities: custodyCapabilities({
        previousKeyCount: previousKeyIds.length,
        keyVersionMetadata: true
      }),
      keyVersions: localKeyVersionMetadata(
        microsoft365LocalTokenKeyProviderKind,
        activeKey.keyId,
        configuredKeys,
        "environment"
      ),
      rotationReadiness: rotationReadinessSummary({
        previousKeyCount: previousKeyIds.length
      }),
      ciphertextBackfillSupported: false
    })
  };
};

export const createFakeMicrosoft365SecretManagerTokenKeyProvider = (
  options: CreateFakeMicrosoft365SecretManagerTokenKeyProviderOptions
): Microsoft365TokenKeyProvider => {
  const { activeKey, keysById } = normalizeCipherKeys({
    activeKeyId: options.activeKeyId,
    keys: options.keys
  });
  const configuredKeys = [...keysById.values()];
  const versionIdsByKeyId = new Map(
    options.keys.map((key) => [
      key.keyId,
      key.versionId ?? `fake-secret-version:${sanitizeKeyIdForVersion(key.keyId)}:v1`
    ])
  );
  const previousKeyIds = configuredKeys
    .filter((key) => key.keyId !== activeKey.keyId)
    .map((key) => key.keyId);
  const keyVersions: Microsoft365TokenKeyVersionMetadata[] = configuredKeys.map((key) => ({
    keyId: key.keyId,
    versionId: versionIdsByKeyId.get(key.keyId) ?? `fake-secret-version:${sanitizeKeyIdForVersion(key.keyId)}:v1`,
    role: key.keyId === activeKey.keyId ? "active" : "previous",
    custodyProviderKind: microsoft365FakeSecretManagerTokenKeyProviderKind,
    source: "deterministic-fake-secret-manager"
  }));

  return {
    providerKind: microsoft365FakeSecretManagerTokenKeyProviderKind,
    activeKey: () => activeKey,
    decryptionKeysForEnvelope: (keyId?: string): Microsoft365TokenCipherKey[] => {
      if (keyId) {
        const configuredKey = keysById.get(keyId);
        return configuredKey ? [configuredKey] : [];
      }

      return [activeKey, ...configuredKeys.filter((key) => key.keyId !== activeKey.keyId)];
    },
    describe: () => ({
      schemaVersion: microsoft365TokenKeyCustodySummarySchemaVersion,
      providerKind: microsoft365FakeSecretManagerTokenKeyProviderKind,
      status: "ready",
      custodyBoundary: "deterministic-fake-secret-manager",
      activeKeyId: activeKey.keyId,
      previousKeyIds,
      keyCount: configuredKeys.length,
      plaintextKeyMaterialAccessibleToProcess: true,
      externalKmsBacked: false,
      externalSecretManagerBacked: false,
      testOnly: true,
      capabilities: custodyCapabilities({
        previousKeyCount: previousKeyIds.length,
        keyVersionMetadata: true
      }),
      keyVersions,
      rotationReadiness: rotationReadinessSummary({
        previousKeyCount: previousKeyIds.length
      }),
      ciphertextBackfillSupported: false
    })
  };
};

export const createMicrosoft365TokenKeyProviderFromConfig = (
  options: CreateMicrosoft365TokenKeyProviderFromConfigOptions
): Microsoft365TokenKeyProvider => {
  const providerKind = options.providerKind ?? microsoft365LocalTokenKeyProviderKind;
  const activeKeyId = options.activeKeyId ?? localDevMicrosoft365TokenKeyId;
  const activeKeyMaterial = options.activeKeyMaterial ?? localDevMicrosoft365TokenMasterKey;
  const keys = [
    {
      keyId: activeKeyId,
      masterKey: activeKeyMaterial
    },
    ...(options.previousKeys ?? [])
  ];

  if (providerKind === microsoft365LocalTokenKeyProviderKind) {
    return createLocalMicrosoft365TokenKeyProvider({
      activeKeyId,
      keys
    });
  }

  if (providerKind === microsoft365FakeSecretManagerTokenKeyProviderKind) {
    return createFakeMicrosoft365SecretManagerTokenKeyProvider({
      activeKeyId,
      keys: keys.map((key) => ({
        ...key,
        versionId: `fake-secret-version:${sanitizeKeyIdForVersion(key.keyId)}:configured`
      }))
    });
  }

  throw new Error(
    `Unsupported Microsoft 365 provider token key custody provider: ${providerKind}.`
  );
};

export const describeMicrosoft365TokenKeyProvider = (
  keyProvider: Microsoft365TokenKeyProvider
): Microsoft365TokenKeyCustodySummary => keyProvider.describe();

export const createLocalMicrosoft365TokenCipher = (
  options: CreateLocalMicrosoft365TokenCipherOptions
): Microsoft365TokenCipher => {
  const keyProvider = options.keyProvider ?? createLocalMicrosoft365TokenKeyProvider(options);

  const decryptWithKey = <TPayload extends object>(
    envelope: {
      iv: string;
      tag: string;
      ciphertext: string;
    },
    keyConfig: Microsoft365TokenCipherKey
  ): TPayload => {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyFromMasterKey(keyConfig.masterKey),
      Buffer.from(envelope.iv, "base64url")
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
      decipher.final()
    ]).toString("utf8");

    return JSON.parse(plaintext) as TPayload;
  };

  return {
    encrypt: (payload) => {
      const activeKey = keyProvider.activeKey();
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", keyFromMasterKey(activeKey.masterKey), iv);
      const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(payload), "utf8"),
        cipher.final()
      ]);

      return JSON.stringify({
        version: 2,
        algorithm: "aes-256-gcm",
        keyId: activeKey.keyId,
        iv: iv.toString("base64url"),
        tag: cipher.getAuthTag().toString("base64url"),
        ciphertext: ciphertext.toString("base64url")
      });
    },
    decrypt: <TPayload extends object>(encryptedPayload: string): TPayload => {
      const envelope = JSON.parse(encryptedPayload) as {
        version: number;
        algorithm: string;
        keyId?: string;
        iv: string;
        tag: string;
        ciphertext: string;
      };

      if ((envelope.version !== 1 && envelope.version !== 2) || envelope.algorithm !== "aes-256-gcm") {
        throw new Error("Unsupported Microsoft 365 credential envelope.");
      }

      const candidateKeys = keyProvider.decryptionKeysForEnvelope(envelope.keyId);

      if (candidateKeys.length === 0) {
        throw new Error("Microsoft 365 credential key ID is not configured.");
      }

      let lastError: unknown;
      for (const keyConfig of candidateKeys) {
        try {
          return decryptWithKey<TPayload>(envelope, keyConfig);
        } catch (error) {
          lastError = error;
        }
      }

      throw new Error("Microsoft 365 credential could not be decrypted with configured keys.", {
        cause: lastError
      });
    }
  };
};

export const parseMicrosoft365TokenPreviousKeys = (value: string | undefined): Microsoft365TokenCipherKey[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex < 0) {
        return {
          keyId: entry,
          masterKey: ""
        };
      }

      return {
        keyId: entry.slice(0, separatorIndex).trim(),
        masterKey: entry.slice(separatorIndex + 1).trim()
      };
    });
};

export const createMicrosoft365TokenCipherFromEnv = (
  env: Record<string, string | undefined> = process.env
): Microsoft365TokenCipher => {
  const providerKind = env.PURESOC_PROVIDER_TOKEN_KEY_PROVIDER ?? microsoft365LocalTokenKeyProviderKind;
  const activeKey = env.PURESOC_PROVIDER_TOKEN_KEY ?? env.PROVIDER_TOKEN_KEY ?? localDevMicrosoft365TokenMasterKey;
  const activeKeyId = env.PURESOC_PROVIDER_TOKEN_KEY_ID ?? localDevMicrosoft365TokenKeyId;
  const previousKeys = parseMicrosoft365TokenPreviousKeys(env.PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS);
  const isProduction = env.PURESOC_APP_ENV === "production" || env.NODE_ENV === "production";

  if (
    providerKind !== microsoft365LocalTokenKeyProviderKind &&
    providerKind !== microsoft365FakeSecretManagerTokenKeyProviderKind
  ) {
    throw new Error(`Unsupported Microsoft 365 provider token key custody provider: ${providerKind}.`);
  }

  if (isProduction && providerKind === microsoft365FakeSecretManagerTokenKeyProviderKind) {
    throw new Error("The fake Microsoft 365 secret-manager token key provider cannot be used in production.");
  }

  if (isProduction && activeKey === localDevMicrosoft365TokenMasterKey) {
    throw new Error("Production Microsoft 365 credential encryption requires a non-default provider token key.");
  }

  if (isProduction && previousKeys.some((key) => key.masterKey === localDevMicrosoft365TokenMasterKey)) {
    throw new Error("Production Microsoft 365 credential encryption cannot include the local-dev key in the key ring.");
  }

  return createLocalMicrosoft365TokenCipher({
    keyProvider: createMicrosoft365TokenKeyProviderFromConfig({
      providerKind,
      activeKeyId,
      activeKeyMaterial: activeKey,
      previousKeys
    })
  });
};
