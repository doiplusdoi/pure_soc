import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  OauthProfileClient,
  OidcProviderConfig,
  OidcTokenClient,
  OidcTokenResponse,
  OidcTokenVerifier,
  VerifiedOidcIdentity
} from "@puresoc/auth-oidc";
import { loadConfig, type PureSocConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

const now = new Date("2026-04-30T12:00:00.000Z");
const password = "CorrectHorseBatteryStaple42!";

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

class FakeOidcTokenClient implements OidcTokenClient {
  readonly exchanges: Array<{ providerKey: string; code: string; codeVerifier: string }> = [];
  readonly responses = new Map<string, OidcTokenResponse>();

  async exchangeAuthorizationCode(input: {
    provider: OidcProviderConfig;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<OidcTokenResponse> {
    this.exchanges.push({
      providerKey: input.provider.providerKey,
      code: input.code,
      codeVerifier: input.codeVerifier
    });
    return this.responses.get(input.code) ?? { idToken: input.code };
  }
}

class FakeOidcTokenVerifier implements OidcTokenVerifier {
  readonly identities = new Map<string, VerifiedOidcIdentity>();

  async verifyIdToken(input: { provider: OidcProviderConfig; idToken: string }): Promise<VerifiedOidcIdentity> {
    const identity = this.identities.get(input.idToken);
    if (!identity) {
      throw new Error(`Missing fake identity for ${input.idToken}`);
    }

    return identity;
  }
}

class FakeOauthProfileClient implements OauthProfileClient {
  readonly profiles = new Map<string, VerifiedOidcIdentity>();

  async loadProfile(input: { provider: OidcProviderConfig; accessToken: string }): Promise<VerifiedOidcIdentity> {
    const profile = this.profiles.get(input.accessToken);
    if (!profile) {
      throw new Error(`Missing fake profile for ${input.accessToken}`);
    }

    return profile;
  }
}

const makeTestConfig = (): PureSocConfig => {
  const config = loadConfig();

  return {
    ...config,
    auth: {
      ...config.auth,
      socialLogin: {
        ...config.auth.socialLogin,
        providers: {
          microsoft_entra: {
            ...config.auth.socialLogin.providers.microsoft_entra,
            enabled: true,
            clientId: "microsoft-client-id",
            redirectUri: "http://127.0.0.1/auth/oidc/microsoft_entra/callback"
          },
          google: {
            ...config.auth.socialLogin.providers.google,
            enabled: true,
            clientId: "google-client-id",
            redirectUri: "http://127.0.0.1/auth/oidc/google/callback"
          },
          github: {
            ...config.auth.socialLogin.providers.github,
            enabled: true,
            clientId: "github-client-id",
            redirectUri: "http://127.0.0.1/auth/oidc/github/callback"
          }
        }
      }
    }
  };
};

const identityFor = (input: {
  providerKey?: "microsoft_entra" | "google" | "github";
  issuer?: string;
  audience?: string | string[];
  subject?: string;
  nonce?: string | null;
  email?: string;
  emailVerified?: boolean | null;
  signatureVerified?: boolean;
  expiresAt?: Date;
}): VerifiedOidcIdentity => ({
  providerKey: input.providerKey ?? "google",
  issuer: input.issuer ?? "https://accounts.google.com",
  audience: input.audience ?? "google-client-id",
  subject: input.subject ?? "google-subject-1",
  expiresAt: input.expiresAt ?? new Date(now.getTime() + 1000 * 60),
  signatureVerified: input.signatureVerified ?? true,
  nonce: input.nonce ?? null,
  email: input.email ?? "oidc-user@example.test",
  emailVerified: input.emailVerified ?? true,
  displayName: "OIDC User"
});

describe("auth oidc social-login callbacks", () => {
  let server: ReturnType<typeof startApiServer>;
  let baseUrl: string;
  let services: ReturnType<typeof createApiServices>;
  let tokenClient: FakeOidcTokenClient;
  let tokenVerifier: FakeOidcTokenVerifier;
  let profileClient: FakeOauthProfileClient;

  beforeEach(() => {
    tokenClient = new FakeOidcTokenClient();
    tokenVerifier = new FakeOidcTokenVerifier();
    profileClient = new FakeOauthProfileClient();
    services = createApiServices({
      now: () => now,
      config: makeTestConfig(),
      oidcTokenClient: tokenClient,
      oidcTokenVerifier: tokenVerifier,
      oauthProfileClient: profileClient
    });
    server = startApiServer(0, services);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const postJson = (path: string, body: unknown, cookie?: string) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {})
      },
      body: JSON.stringify(body)
    });

  const begin = async (providerKey: "microsoft_entra" | "google" | "github" = "google") => {
    const response = await postJson(`/auth/oidc/${providerKey}/begin`, {});
    expect(response.status).toBe(200);
    const body = await readJson<{ redirectUrl: string; providerKey: string }>(response);
    const authorizationUrl = new URL(body.redirectUrl);
    return {
      providerKey: body.providerKey,
      authorizationUrl,
      state: authorizationUrl.searchParams.get("state") ?? "",
      nonce: authorizationUrl.searchParams.get("nonce")
    };
  };

  const registerAndLogin = async (email: string) => {
    const registerResponse = await postJson("/auth/register", {
      email,
      password,
      displayName: "Existing User"
    });
    expect(registerResponse.status).toBe(201);

    const loginResponse = await postJson("/auth/login", {
      email,
      password
    });
    expect(loginResponse.status).toBe(200);

    return {
      loginBody: await readJson<{ user: { id: string; email: string }; session: { id: string } }>(loginResponse),
      cookie: loginResponse.headers.get("set-cookie") ?? ""
    };
  };

  it("validates state, nonce, and PKCE before creating a social-login session", async () => {
    const authorization = await begin("google");
    tokenClient.responses.set("oauth-code", { idToken: "id-token" });
    tokenVerifier.identities.set(
      "id-token",
      identityFor({
        nonce: authorization.nonce,
        email: "Social.User@Example.test"
      })
    );

    const callbackResponse = await postJson("/auth/oidc/google/callback", {
      state: authorization.state,
      code: "oauth-code"
    });

    expect(callbackResponse.status).toBe(200);
    const callbackBody = await readJson<{ user: { id: string; email: string }; session: { id: string } }>(
      callbackResponse
    );
    const cookie = callbackResponse.headers.get("set-cookie") ?? "";
    expect(callbackBody.user.email).toBe("social.user@example.test");
    expect(cookie).toContain("puresoc_session=");
    expect(tokenClient.exchanges[0]?.codeVerifier).toMatch(/^[A-Za-z0-9_-]{64}$/);

    const sessionResponse = await fetch(`${baseUrl}/auth/session`, {
      headers: { cookie }
    });
    expect(sessionResponse.status).toBe(200);
    await expect(readJson<{ session: { id: string } }>(sessionResponse)).resolves.toMatchObject({
      session: {
        id: callbackBody.session.id
      }
    });

    expect(services.auditSink.findByAction("login")).toHaveLength(1);
    expect(services.auditSink.findByAction("session_created")).toHaveLength(1);
  });

  it("rejects callback state replay or mismatch and audits a failed login", async () => {
    await begin("google");

    const callbackResponse = await postJson("/auth/oidc/google/callback", {
      state: "tampered-state",
      code: "oauth-code"
    });

    expect(callbackResponse.status).toBe(400);
    expect(tokenClient.exchanges).toHaveLength(0);
    expect(services.auditSink.findByAction("failed_login")).toHaveLength(1);
  });

  it.each([
    ["issuer", { issuer: "https://evil.example.test" }],
    ["audience", { audience: "other-client-id" }],
    ["expiry", { expiresAt: new Date(now.getTime() - 1000) }],
    ["signature", { signatureVerified: false }],
    ["nonce", { nonce: "wrong-nonce" }],
    ["email verification", { emailVerified: false }]
  ])("rejects invalid OIDC %s claims", async (_caseName, patch) => {
    const authorization = await begin("google");
    tokenClient.responses.set("oauth-code", { idToken: "id-token" });
    tokenVerifier.identities.set(
      "id-token",
      identityFor({
        nonce: authorization.nonce,
        ...patch
      })
    );

    const callbackResponse = await postJson("/auth/oidc/google/callback", {
      state: authorization.state,
      code: "oauth-code"
    });

    expect(callbackResponse.status).toBe(401);
    expect(services.auditSink.findByAction("failed_login")).toHaveLength(1);
  });

  it("requires explicit signed-in approval before linking an email collision", async () => {
    const existing = await registerAndLogin("collision@example.test");
    const firstAttempt = await begin("google");
    tokenClient.responses.set("collision-code", { idToken: "collision-token" });
    tokenVerifier.identities.set(
      "collision-token",
      identityFor({
        nonce: firstAttempt.nonce,
        subject: "new-google-subject",
        email: "collision@example.test"
      })
    );

    const collisionResponse = await postJson("/auth/oidc/google/callback", {
      state: firstAttempt.state,
      code: "collision-code"
    });
    expect(collisionResponse.status).toBe(409);
    expect(services.auditSink.findByAction("account_link_rejected")).toHaveLength(1);

    const approvedAttempt = await begin("google");
    tokenClient.responses.set("approved-link-code", { idToken: "approved-link-token" });
    tokenVerifier.identities.set(
      "approved-link-token",
      identityFor({
        nonce: approvedAttempt.nonce,
        subject: "new-google-subject",
        email: "collision@example.test"
      })
    );

    const approvedResponse = await postJson(
      "/auth/oidc/google/callback",
      {
        state: approvedAttempt.state,
        code: "approved-link-code",
        linkAccount: true
      },
      existing.cookie
    );
    expect(approvedResponse.status).toBe(200);
    const approvedBody = await readJson<{ user: { id: string } }>(approvedResponse);
    expect(approvedBody.user.id).toBe(existing.loginBody.user.id);
    expect(services.auditSink.findByAction("account_linked")).toHaveLength(1);
  });

  it("signs in an existing provider-subject account without requiring a Microsoft 365 tenant connection", async () => {
    const firstAttempt = await begin("microsoft_entra");
    tokenClient.responses.set("first-code", { idToken: "first-token" });
    tokenVerifier.identities.set(
      "first-token",
      identityFor({
        providerKey: "microsoft_entra",
        issuer: "https://login.microsoftonline.com/common/v2.0",
        audience: "microsoft-client-id",
        nonce: firstAttempt.nonce,
        subject: "entra-user-subject",
        email: "entra-user@example.test"
      })
    );

    const firstResponse = await postJson("/auth/oidc/microsoft_entra/callback", {
      state: firstAttempt.state,
      code: "first-code"
    });
    expect(firstResponse.status).toBe(200);
    const firstBody = await readJson<{ user: { id: string } }>(firstResponse);

    const secondAttempt = await begin("microsoft_entra");
    tokenClient.responses.set("second-code", { idToken: "second-token" });
    tokenVerifier.identities.set(
      "second-token",
      identityFor({
        providerKey: "microsoft_entra",
        issuer: "https://login.microsoftonline.com/common/v2.0",
        audience: "microsoft-client-id",
        nonce: secondAttempt.nonce,
        subject: "entra-user-subject",
        email: "entra-user@example.test"
      })
    );

    const secondResponse = await postJson("/auth/oidc/microsoft_entra/callback", {
      state: secondAttempt.state,
      code: "second-code"
    });
    expect(secondResponse.status).toBe(200);
    const secondBody = await readJson<{ user: { id: string } }>(secondResponse);
    expect(secondBody.user.id).toBe(firstBody.user.id);
    expect(services.auditSink.findByAction("provider_connected")).toHaveLength(0);
  });

  it("supports GitHub social callback profiles and keeps OAuth secrets out of audit logs", async () => {
    const authorization = await begin("github");
    tokenClient.responses.set("super-secret-oauth-code", {
      accessToken: "secret-access-token",
      refreshToken: "secret-refresh-token"
    });
    profileClient.profiles.set(
      "secret-access-token",
      identityFor({
        providerKey: "github",
        issuer: "https://github.com",
        audience: "github-client-id",
        subject: "12345",
        email: "github-user@example.test",
        nonce: null
      })
    );

    const callbackResponse = await postJson("/auth/oidc/github/callback", {
      state: authorization.state,
      code: "super-secret-oauth-code"
    });

    expect(callbackResponse.status).toBe(200);
    const responseText = JSON.stringify(await readJson<unknown>(callbackResponse));
    const serializedAudit = JSON.stringify(services.auditSink.records);
    expect(responseText).not.toContain("super-secret-oauth-code");
    expect(responseText).not.toContain("secret-access-token");
    expect(serializedAudit).not.toContain("super-secret-oauth-code");
    expect(serializedAudit).not.toContain("secret-access-token");
    expect(serializedAudit).not.toContain("secret-refresh-token");
  });
});
