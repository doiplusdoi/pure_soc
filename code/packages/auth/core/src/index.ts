export type AuthProviderKey = "local" | "microsoft_entra" | "google" | "github" | "keycloak_broker";

export interface IdentityAccountShell {
  userId: string;
  providerKey: AuthProviderKey;
  providerSubject: string;
}
