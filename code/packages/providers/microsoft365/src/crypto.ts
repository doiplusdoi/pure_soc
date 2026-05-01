import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface Microsoft365TokenCipher {
  encrypt(payload: object): string;
  decrypt<TPayload extends object>(encryptedPayload: string): TPayload;
}

export interface Microsoft365TokenCipherKey {
  keyId: string;
  masterKey: string;
}

export interface CreateLocalMicrosoft365TokenCipherOptions {
  masterKey?: string;
  keyId?: string;
  activeKeyId?: string;
  keys?: Microsoft365TokenCipherKey[];
}

export const localDevMicrosoft365TokenKeyId = "local-dev" as const;
export const localDevMicrosoft365TokenMasterKey = "local-dev-provider-token-key-change-me" as const;

const keyFromMasterKey = (masterKey: string): Buffer => createHash("sha256").update(masterKey).digest();

const normalizeCipherKeys = (
  options: CreateLocalMicrosoft365TokenCipherOptions
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

export const createLocalMicrosoft365TokenCipher = (
  options: CreateLocalMicrosoft365TokenCipherOptions
): Microsoft365TokenCipher => {
  const { activeKey, keysById } = normalizeCipherKeys(options);

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

      const candidateKeys = envelope.keyId
        ? [keysById.get(envelope.keyId)].filter((key): key is Microsoft365TokenCipherKey => Boolean(key))
        : [activeKey, ...[...keysById.values()].filter((key) => key.keyId !== activeKey.keyId)];

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
  const activeKey = env.PURESOC_PROVIDER_TOKEN_KEY ?? env.PROVIDER_TOKEN_KEY ?? localDevMicrosoft365TokenMasterKey;
  const activeKeyId = env.PURESOC_PROVIDER_TOKEN_KEY_ID ?? localDevMicrosoft365TokenKeyId;
  const previousKeys = parseMicrosoft365TokenPreviousKeys(env.PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS);
  const isProduction = env.PURESOC_APP_ENV === "production" || env.NODE_ENV === "production";

  if (isProduction && activeKey === localDevMicrosoft365TokenMasterKey) {
    throw new Error("Production Microsoft 365 credential encryption requires a non-default provider token key.");
  }

  if (isProduction && previousKeys.some((key) => key.masterKey === localDevMicrosoft365TokenMasterKey)) {
    throw new Error("Production Microsoft 365 credential encryption cannot include the local-dev key in the key ring.");
  }

  return createLocalMicrosoft365TokenCipher({
    activeKeyId,
    keys: [
      {
        keyId: activeKeyId,
        masterKey: activeKey
      },
      ...previousKeys
    ]
  });
};
