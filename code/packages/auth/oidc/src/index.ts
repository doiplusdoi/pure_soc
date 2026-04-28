import type { AuthProviderKey } from "../../core/src/index";

export const oidcLoginBoundary = "user-login-not-managed-provider-connection";

export type OidcSocialProviderKey = Extract<AuthProviderKey, "microsoft_entra" | "google" | "github">;

export interface OidcProviderPlaceholder {
  providerKey: OidcSocialProviderKey;
  enabled: boolean;
  issuer: string;
  clientId: string;
}

export interface OidcAccountLinkPlaceholder {
  userId: string;
  providerKey: OidcSocialProviderKey;
  providerSubject: string;
  providerEmail?: string | null;
  explicitUserApproval: boolean;
}

export const oidcCallbacksImplemented = false;

export const ensureExplicitAccountLinking = (input: OidcAccountLinkPlaceholder): void => {
  if (!input.explicitUserApproval) {
    throw new Error("OIDC account linking requires explicit user approval; email alone is not trusted.");
  }
};

export const throwOidcCallbackDeferred = (): never => {
  throw new Error("OIDC callbacks are deferred; this phase only defines the user-login/provider-connection boundary.");
};
