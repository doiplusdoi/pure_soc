import {
  clearSessionCookie,
  createSessionCookie,
  parseCookies,
  sessionCookieName,
  type JsonResult,
  type RequestContext
} from "../http";
import { AuthError } from "@puresoc/auth-core";
import { isOidcSocialProviderKey } from "@puresoc/auth-oidc";
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
      displayName: optionalString(body, "displayName"),
      deliverEmailVerificationToken: (delivery) => services.emailVerificationDelivery.deliver(delivery)
    },
    context
  )
});

export const verifyEmailRoute = async (
  body: Record<string, unknown>,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => ({
  statusCode: 200,
  body: await services.localAuth.verifyEmail(
    {
      plaintextToken: requireString(body, "token")
    },
    context
  )
});

export const loginRoute = async (
  body: Record<string, unknown>,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const activeOrganizationId = optionalString(body, "activeOrganizationId");
  const login = await services.localAuth.login(
    {
      email: requireString(body, "email"),
      password: requireString(body, "password")
    },
    context
  );

  let session = login.session;
  if (activeOrganizationId) {
    const membership = await services.rbacRepository.findMembership(activeOrganizationId, login.user.id);

    if (!membership || membership.status !== "active") {
      await services.localAuth.logout(login.sessionToken, context);
      throw new AuthError("forbidden", "The selected workspace is not available for this account.", 403);
    }

    const selected = await services.localAuth.selectActiveOrganization(login.sessionToken, activeOrganizationId, context);
    session = selected.session;
  }

  return {
    statusCode: 200,
    headers: {
      "set-cookie": createSessionCookie(login.sessionToken, session.expiresAt, {
        secure: services.config.auth.sessionCookieSecure
      })
    },
    body: {
      user: login.user,
      session
    }
  };
};

export const sessionRoute = async (cookieHeader: string | undefined, services: ApiServices): Promise<JsonResult> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];

  return {
    statusCode: 200,
    body: await services.localAuth.getSession(sessionToken ?? "")
  };
};

export const selectActiveOrganizationRoute = async (
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  const session = await services.localAuth.getSession(sessionToken ?? "");
  const organizationId = optionalString(body, "organizationId");

  if (organizationId) {
    const membership = await services.rbacRepository.findMembership(organizationId, session.user.id);

    if (!membership || membership.status !== "active") {
      throw new AuthError("forbidden", "The authenticated user is not an active member of this organization.", 403);
    }
  }

  return {
    statusCode: 200,
    body: await services.localAuth.selectActiveOrganization(sessionToken ?? "", organizationId, context)
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
      "set-cookie": clearSessionCookie({
        secure: services.config.auth.sessionCookieSecure
      })
    },
    body: await services.localAuth.logout(sessionToken ?? "", context)
  };
};

export const beginOidcAuthorizationRoute = async (
  providerKey: string,
  services: ApiServices
): Promise<JsonResult> => {
  if (!isOidcSocialProviderKey(providerKey)) {
    throw new AuthError("invalid_request", "Unsupported OIDC provider.", 400);
  }

  return {
    statusCode: 200,
    body: await services.oidcAuth.beginAuthorization({
      providerKey
    })
  };
};

export const completeOidcCallbackRoute = async (
  providerKey: string,
  body: Record<string, unknown>,
  cookieHeader: string | undefined,
  context: RequestContext,
  services: ApiServices
): Promise<JsonResult> => {
  if (!isOidcSocialProviderKey(providerKey)) {
    throw new AuthError("invalid_request", "Unsupported OIDC provider.", 400);
  }

  const linkAccount = optionalBoolean(body, "linkAccount");
  const currentSession = linkAccount ? await getOptionalCurrentSession(cookieHeader, services) : null;
  const callback = await services.oidcAuth.completeCallback(
    {
      providerKey,
      state: requireString(body, "state"),
      code: requireString(body, "code"),
      linkAccount,
      authenticatedUserId: currentSession?.user.id ?? null,
      activeOrganizationId: currentSession?.session.activeOrganizationId ?? null
    },
    context
  );
  const { sessionToken, ...safeBody } = callback;

  return {
    statusCode: 200,
    headers: {
      "set-cookie": createSessionCookie(sessionToken, callback.session.expiresAt, {
        secure: services.config.auth.sessionCookieSecure
      })
    },
    body: safeBody
  };
};

const optionalBoolean = (body: Record<string, unknown>, field: string): boolean => {
  const value = body[field];
  return value === true || value === "true";
};

const getOptionalCurrentSession = async (cookieHeader: string | undefined, services: ApiServices) => {
  const sessionToken = parseCookies(cookieHeader)[sessionCookieName];
  if (!sessionToken) {
    return null;
  }

  try {
    return await services.localAuth.getSession(sessionToken);
  } catch {
    return null;
  }
};
