import type { IncomingMessage, ServerResponse } from "node:http";

import { assertNoSensitiveResponseFields } from "../../../packages/audit/src/index";
import { AuthError } from "../../../packages/auth/core/src/index";

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface JsonResult {
  statusCode: number;
  body: unknown;
  headers?: Record<string, string | string[]>;
}

export const parseJsonBody = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(rawBody) as Record<string, unknown>;
};

export const readRequestContext = (request: IncomingMessage): RequestContext => ({
  ipAddress:
    typeof request.headers["x-forwarded-for"] === "string"
      ? request.headers["x-forwarded-for"].split(",")[0]?.trim() ?? null
      : request.socket.remoteAddress ?? null,
  userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null
});

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

export const createSessionCookie = (sessionToken: string, expiresAt: string): string =>
  `${sessionCookieName}=${encodeURIComponent(sessionToken)}; HttpOnly; SameSite=Lax; Path=/; Expires=${new Date(
    expiresAt
  ).toUTCString()}`;

export const clearSessionCookie = (): string =>
  `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

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
