export type AuthProviderKey = "local" | "microsoft_entra" | "google" | "github" | "keycloak_broker";

export const authProviderKeys = [
  "local",
  "microsoft_entra",
  "google",
  "github",
  "keycloak_broker"
] as const satisfies readonly AuthProviderKey[];

export type OrganizationMemberStatus = "invited" | "active" | "suspended" | "removed";

export type PureSocRoleKey =
  | "owner"
  | "org_admin"
  | "compliance_manager"
  | "security_operator"
  | "remediation_approver"
  | "auditor"
  | "billing_admin"
  | "regulatory_admin";

export interface DefaultRoleDefinition {
  key: PureSocRoleKey;
  name: string;
  description: string;
}

export const defaultRoleDefinitions = [
  {
    key: "owner",
    name: "Owner",
    description: "Full organization control."
  },
  {
    key: "org_admin",
    name: "Organization admin",
    description: "Manage organization users and provider connections."
  },
  {
    key: "compliance_manager",
    name: "Compliance manager",
    description: "Manage NIS2 assessments, evidence, and readiness plans."
  },
  {
    key: "security_operator",
    name: "Security operator",
    description: "View findings, run scans, and prepare remediation."
  },
  {
    key: "remediation_approver",
    name: "Remediation approver",
    description: "Approve future safety-gated write actions."
  },
  {
    key: "auditor",
    name: "Auditor",
    description: "Read-only access to compliance evidence and reports."
  },
  {
    key: "billing_admin",
    name: "Billing admin",
    description: "Manage billing and customer portal access."
  },
  {
    key: "regulatory_admin",
    name: "Regulatory admin",
    description: "Manage country-pack source review and regulatory seed activation."
  }
] as const satisfies readonly DefaultRoleDefinition[];

export interface IdentityAccountShell {
  userId: string;
  providerKey: AuthProviderKey;
  providerSubject: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName?: string | null;
  emailVerifiedAt?: Date | null;
}

export interface AuthenticatedSession {
  id: string;
  userId: string;
  activeOrganizationId?: string | null;
  expiresAt: Date;
}

export interface AuthContext {
  userId: string;
  activeOrganizationId?: string | null;
  rolesByOrganization: Record<string, PureSocRoleKey[]>;
}

export type AuthErrorCode =
  | "invalid_request"
  | "invalid_credentials"
  | "email_already_registered"
  | "email_not_verified"
  | "account_locked"
  | "rate_limited"
  | "auth_service_unavailable"
  | "session_invalid"
  | "forbidden"
  | "provider_disabled"
  | "provider_not_configured"
  | "oidc_callback_invalid"
  | "account_link_required"
  | "account_link_rejected"
  | "not_found"
  | "invalid_relationship_transition"
  | "retention_delete_blocked"
  | "report_format_blocked";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly statusCode: number;

  constructor(code: AuthErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const isPureSocRoleKey = (roleKey: string): roleKey is PureSocRoleKey =>
  defaultRoleDefinitions.some((role) => role.key === roleKey);

export const publicUserView = (user: AuthenticatedUser) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName ?? null,
  emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null
});
