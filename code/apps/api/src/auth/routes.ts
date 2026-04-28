import {
  clearSessionCookie,
  createSessionCookie,
  parseCookies,
  sessionCookieName,
  type JsonResult,
  type RequestContext
} from "../http";
import { AuthError } from "../../../../packages/auth/core/src/index";
import type { ApiServices } from "./services";

const requireString = (body: Record<string, unknown>, field: string): string => {
  const value = body[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new AuthError("invalid_request", `Missing required string field: ${field}`, 400);
  }

  return value;
};

const optionalString = (body: Record<string, unknown>, field: string): string | null => {
  const value = body[field];
  return typeof value === "string" && value.length > 0 ? value : null;
};

export const registerRoute = async (
  body: Record<string, unknown>,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => ({
  statusCode: 201,
  body: await services.localAuth.register(
    {
      email: requireString(body, "email"),
      password: requireString(body, "password"),
      displayName: optionalString(body, "displayName")
    },
    context
  )
});

export const loginRoute = async (
  body: Record<string, unknown>,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const login = await services.localAuth.login(
    {
      email: requireString(body, "email"),
      password: requireString(body, "password"),
      activeOrganizationId: optionalString(body, "activeOrganizationId")
    },
    context
  );
  const { sessionToken, ...safeBody } = login;

  return {
    statusCode: 200,
    headers: {
      "set-cookie": createSessionCookie(sessionToken, login.session.expiresAt)
    },
    body: safeBody
  };
};

export const sessionRoute = async (cookieHeader: string | undefined, services: ApiServices): Promise<JsonResult> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];

  return {
    statusCode: 200,
    body: await services.localAuth.getSession(sessionToken ?? "")
  };
};

export const logoutRoute = async (
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];

  return {
    statusCode: 200,
    headers: {
      "set-cookie": clearSessionCookie()
    },
    body: await services.localAuth.logout(sessionToken ?? "", context)
  };
};
