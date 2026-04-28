const sensitiveKeyFragments = [
  "password",
  "token",
  "oauthcode",
  "authorization",
  "clientsecret",
  "secret",
  "apikey",
  "cookie",
  "codeverifier",
  "refresh",
  "access"
] as const;

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

export const isSensitiveProviderKey = (key: string): boolean => {
  const normalized = normalizeKey(key);
  return sensitiveKeyFragments.some((fragment) => normalized.includes(fragment));
};

export const redactProviderSecrets = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactProviderSecrets(entry));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const redacted: Record<string, unknown> = {};
  let redactedFieldCount = 0;

  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveProviderKey(key)) {
      redacted[key] = "[REDACTED]";
      redactedFieldCount += 1;
      continue;
    }

    redacted[key] = redactProviderSecrets(entry);
  }

  if (redactedFieldCount > 0) {
    redacted.redactedFieldCount = redactedFieldCount;
  }

  return redacted;
};

export class ProviderConnectorError extends Error {
  readonly code: string;
  readonly details: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ProviderConnectorError";
    this.code = code;
    this.details = redactProviderSecrets(details ?? {});
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

export const assertReadOnlyProviderOperation = (input: {
  operation: string;
  allowProviderWrites?: boolean;
  providerKey?: string;
}): void => {
  if (input.allowProviderWrites === true) {
    throw new ProviderConnectorError("provider_writes_disabled", "Provider write operations are disabled for this phase.", {
      operation: input.operation,
      providerKey: input.providerKey
    });
  }
};
