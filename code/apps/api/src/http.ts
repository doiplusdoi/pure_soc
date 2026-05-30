import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

import { AuditExportError, assertNoSensitiveResponseFields } from "@puresoc/audit";
import { AuthError } from "@puresoc/auth-core";
import { BillingError } from "@puresoc/billing-core";
import { EvidenceAccessError } from "@puresoc/evidence";
import { RegulatorySourceReviewError } from "@puresoc/regulatory-sources";
import { RemediationActionError } from "@puresoc/recommendations";
import { ReportExportError } from "@puresoc/reports";

export interface RequestContext {
  ipAddress: string | null;
  clientIpSource?: "socket" | "x_forwarded_for" | "forwarded";
  forwardedHeadersTrusted?: boolean;
  userAgent: string | null;
}

export interface TrustedProxyConfig {
  trustForwardedHeaders: boolean;
  trustedProxyIpAddresses: string[];
  trustedProxyHops: number;
}

export interface JsonResult {
  statusCode: number;
  body: unknown;
  headers?: Record<string, string | string[]>;
}

export interface BodyParserLimitOptions {
  maxBytes?: number;
}

export class PayloadTooLargeError extends Error {
  readonly code = "payload_too_large";
  readonly statusCode = 413;

  constructor() {
    super("Request body exceeds the configured size limit.");
  }
}

const defaultBodyMaxBytes = 1_048_576;

export const parseJsonBody = async (
  request: IncomingMessage,
  options: BodyParserLimitOptions = {}
): Promise<Record<string, unknown>> => {
  const rawBody = await readLimitedBody(request, options.maxBytes ?? defaultBodyMaxBytes);

  if (rawBody.byteLength === 0) {
    return {};
  }

  return JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
};

export const parseRawBody = async (
  request: IncomingMessage,
  options: BodyParserLimitOptions = {}
): Promise<Buffer> => readLimitedBody(request, options.maxBytes ?? defaultBodyMaxBytes);

const readLimitedBody = async (request: IncomingMessage, maxBytes: number): Promise<Buffer> => {
  assertValidBodyLimit(maxBytes);
  assertContentLengthWithinLimit(request, maxBytes);

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > maxBytes) {
      throw new PayloadTooLargeError();
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks, totalBytes);
};

const assertValidBodyLimit = (maxBytes: number): void => {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("Body parser maxBytes must be a positive safe integer.");
  }
};

const assertContentLengthWithinLimit = (request: IncomingMessage, maxBytes: number): void => {
  const declaredLength = parseContentLength(request.headers["content-length"]);

  if (declaredLength !== null && declaredLength > maxBytes) {
    throw new PayloadTooLargeError();
  }
};

const parseContentLength = (contentLength: string | string[] | undefined): number | null => {
  const value = Array.isArray(contentLength) ? contentLength[0] : contentLength;
  if (value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const readRequestContext = (
  request: IncomingMessage,
  trustedProxy: TrustedProxyConfig = {
    trustForwardedHeaders: false,
    trustedProxyIpAddresses: [],
    trustedProxyHops: 1
  }
): RequestContext => {
  const socketAddress = normalizeIpAddress(request.socket.remoteAddress ?? null);
  const forwardedTrusted = shouldTrustForwardedHeaders(socketAddress, trustedProxy);
  const forwardedIp = forwardedTrusted ? readForwardedClientIp(request.headers, trustedProxy.trustedProxyHops) : null;

  return {
    ipAddress: forwardedIp?.ipAddress ?? socketAddress,
    clientIpSource: forwardedIp?.source ?? "socket",
    forwardedHeadersTrusted: forwardedTrusted,
    userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null
  };
};

const shouldTrustForwardedHeaders = (remoteAddress: string | null, trustedProxy: TrustedProxyConfig): boolean => {
  if (!trustedProxy.trustForwardedHeaders || !remoteAddress) {
    return false;
  }

  const trustedAddresses = new Set(trustedProxy.trustedProxyIpAddresses.map((address) => normalizeIpAddress(address)));
  return trustedAddresses.has(remoteAddress);
};

const readForwardedClientIp = (
  headers: IncomingHttpHeaders,
  trustedProxyHops: number
): { ipAddress: string; source: RequestContext["clientIpSource"] } | null => {
  const xForwardedFor = headerValue(headers["x-forwarded-for"]);
  if (xForwardedFor) {
    const chain = xForwardedFor
      .split(",")
      .map((entry) => normalizeIpAddress(entry))
      .filter((entry): entry is string => entry !== null);
    const ipAddress = selectForwardedClientIp(chain, trustedProxyHops);
    return ipAddress ? { ipAddress, source: "x_forwarded_for" } : null;
  }

  const forwarded = headerValue(headers.forwarded);
  if (!forwarded) {
    return null;
  }

  const chain = forwarded
    .split(",")
    .map((entry) => forwardedForValue(entry))
    .filter((entry): entry is string => entry !== null);
  const ipAddress = selectForwardedClientIp(chain, trustedProxyHops);
  return ipAddress ? { ipAddress, source: "forwarded" } : null;
};

const selectForwardedClientIp = (chain: string[], trustedProxyHops: number): string | null => {
  if (chain.length === 0) {
    return null;
  }

  const trustedHops = Number.isSafeInteger(trustedProxyHops) && trustedProxyHops > 0 ? trustedProxyHops : 1;
  const clientIndex = Math.max(0, chain.length - trustedHops - 1);
  return chain[clientIndex] ?? chain[0] ?? null;
};

const forwardedForValue = (entry: string): string | null => {
  const match = entry.match(/(?:^|;)\s*for=(?:"?)([^";,]+)(?:"?)/i);
  return match?.[1] ? normalizeIpAddress(match[1]) : null;
};

const headerValue = (value: string | string[] | undefined): string | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

const normalizeIpAddress = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const withoutBrackets = trimmed.startsWith("[") && trimmed.includes("]")
    ? trimmed.slice(1, trimmed.indexOf("]"))
    : trimmed;
  const withoutIpv4MappedPrefix = withoutBrackets.startsWith("::ffff:")
    ? withoutBrackets.slice("::ffff:".length)
    : withoutBrackets;

  return withoutIpv4MappedPrefix.length > 0 ? withoutIpv4MappedPrefix : null;
};

export const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [name, ...value] = cookie.split("=");
        return [name, decodeURIComponent(value.join("="))];
      })
  );
};

export const sessionCookieName = "puresoc_session";

export interface SessionCookieOptions {
  secure?: boolean;
}

export const createSessionCookie = (
  sessionToken: string,
  expiresAt: string,
  options: SessionCookieOptions = {}
): string =>
  [
    `${sessionCookieName}=${encodeURIComponent(sessionToken)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Expires=${new Date(expiresAt).toUTCString()}`,
    options.secure ? "Secure" : null
  ]
    .filter((part): part is string => part !== null)
    .join("; ");

export const clearSessionCookie = (options: SessionCookieOptions = {}): string =>
  [
    `${sessionCookieName}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
    options.secure ? "Secure" : null
  ]
    .filter((part): part is string => part !== null)
    .join("; ");

export const toJsonResultError = (error: unknown): JsonResult => {
  if (error instanceof AuthError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof EvidenceAccessError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof BillingError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof RegulatorySourceReviewError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof RemediationActionError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof PayloadTooLargeError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof ReportExportError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof AuditExportError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof SyntaxError) {
    return {
      statusCode: 400,
      body: {
        error: {
          code: "invalid_json",
          message: "Request body must be valid JSON."
        }
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: "internal_error",
        message: "Internal server error."
      }
    }
  };
};

export const sendJson = (response: ServerResponse, result: JsonResult): void => {
  assertNoSensitiveResponseFields(result.body);
  response.statusCode = result.statusCode;
  response.setHeader("content-type", "application/json");

  for (const [name, value] of Object.entries(result.headers ?? {})) {
    response.setHeader(name, value);
  }

  response.end(JSON.stringify(result.body));
};
