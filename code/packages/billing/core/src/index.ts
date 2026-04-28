export type BillingProviderKey = "none" | "stripe" | "offline_license";

export interface BillingProviderShell {
  providerKey: BillingProviderKey;
  entitlementsReplaceRbac: false;
}
