import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface Microsoft365TokenCipher {
  encrypt(payload: object): string;
  decrypt<TPayload extends object>(encryptedPayload: string): TPayload;
}

export interface CreateLocalMicrosoft365TokenCipherOptions {
  masterKey: string;
}

const keyFromMasterKey = (masterKey: string): Buffer => createHash("sha256").update(masterKey).digest();

export const createLocalMicrosoft365TokenCipher = (
  options: CreateLocalMicrosoft365TokenCipherOptions
): Microsoft365TokenCipher => {
  const key = keyFromMasterKey(options.masterKey);

  return {
    encrypt: (payload) => {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(payload), "utf8"),
        cipher.final()
      ]);

      return JSON.stringify({
        version: 1,
        algorithm: "aes-256-gcm",
        iv: iv.toString("base64url"),
        tag: cipher.getAuthTag().toString("base64url"),
        ciphertext: ciphertext.toString("base64url")
      });
    },
    decrypt: <TPayload extends object>(encryptedPayload: string): TPayload => {
      const envelope = JSON.parse(encryptedPayload) as {
        version: number;
        algorithm: string;
        iv: string;
        tag: string;
        ciphertext: string;
      };

      if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") {
        throw new Error("Unsupported Microsoft 365 credential envelope.");
      }

      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64url"));
      decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
        decipher.final()
      ]).toString("utf8");

      return JSON.parse(plaintext) as TPayload;
    }
  };
};
