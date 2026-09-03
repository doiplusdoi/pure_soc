import { randomUUID } from "node:crypto";

import { AuthError, normalizeEmail } from "@puresoc/auth-core";
import {
  Argon2idPasswordHasher,
  LocalAuthService,
  type LocalAuthAuditWriter,
  type LocalAuthRepository,
  type PasswordHasher
} from "@puresoc/auth-local";

import {
  normalizePartnerSlug,
  type PartnerMemberRecord,
  type PartnerService
} from "../partners/service";

export interface ProvisionPartnerAccountInput {
  email: string;
  password: string;
  displayName: string;
  partnerName?: string | null;
  partnerSlug?: string | null;
  existingPartnerSlug?: string | null;
}

export interface ProvisionPartnerAccountResult {
  status: "created";
  account: {
    id: string;
    email: string;
    displayName: string | null;
    emailVerified: true;
  };
  partner: {
    id: string;
    name: string;
    slug: string;
    role: "owner";
  };
  loginPath: "/login";
  landingPath: "/partners";
  passwordIncluded: false;
}

export interface PartnerAccountProvisioningServiceOptions {
  repository: LocalAuthRepository;
  auditWriter: LocalAuthAuditWriter;
  partners: Pick<PartnerService, "createPartner">;
  partnerSlugExists: (slug: string) => Promise<boolean>;
  findPartnerBySlug?: (slug: string) => Promise<{ id: string; name: string; slug: string } | null>;
  attachPartnerMember?: (member: PartnerMemberRecord) => Promise<unknown>;
  passwordHasher?: PasswordHasher;
  now?: () => Date;
}

export class PartnerAccountProvisioningService {
  private readonly repository: LocalAuthRepository;
  private readonly auditWriter: LocalAuthAuditWriter;
  private readonly partners: Pick<PartnerService, "createPartner">;
  private readonly partnerSlugExists: (slug: string) => Promise<boolean>;
  private readonly findPartnerBySlug?: PartnerAccountProvisioningServiceOptions["findPartnerBySlug"];
  private readonly attachPartnerMember?: PartnerAccountProvisioningServiceOptions["attachPartnerMember"];
  private readonly passwordHasher: PasswordHasher;
  private readonly now: () => Date;

  constructor(options: PartnerAccountProvisioningServiceOptions) {
    this.repository = options.repository;
    this.auditWriter = options.auditWriter;
    this.partners = options.partners;
    this.partnerSlugExists = options.partnerSlugExists;
    this.findPartnerBySlug = options.findPartnerBySlug;
    this.attachPartnerMember = options.attachPartnerMember;
    this.passwordHasher = options.passwordHasher ?? new Argon2idPasswordHasher();
    this.now = options.now ?? (() => new Date());
  }

  async provision(input: ProvisionPartnerAccountInput): Promise<ProvisionPartnerAccountResult> {
    const email = normalizeEmail(input.email);
    const displayName = requiredLabel(input.displayName, "Display name");
    const requestedExistingPartnerSlug = input.existingPartnerSlug?.trim() || null;
    if (requestedExistingPartnerSlug && (input.partnerName?.trim() || input.partnerSlug?.trim())) {
      throw new AuthError(
        "invalid_request",
        "Choose either an existing partner slug or a new partner name; no account was created.",
        400
      );
    }

    const existingPartnerSlug = requestedExistingPartnerSlug
      ? normalizePartnerSlug(requestedExistingPartnerSlug)
      : null;
    const partnerName = existingPartnerSlug ? null : requiredLabel(input.partnerName ?? "", "Partner name");
    const partnerSlug = existingPartnerSlug ?? normalizePartnerSlug(input.partnerSlug ?? partnerName ?? "");

    if (!isValidEmail(email)) {
      throw new AuthError("invalid_request", "Enter a valid partner email address.", 400);
    }

    if (await this.repository.findLocalCredentialByEmail(email)) {
      throw new AuthError("email_already_registered", "Email is already registered; no account was changed.", 409);
    }

    const existingPartner = existingPartnerSlug
      ? await this.findPartnerBySlug?.(existingPartnerSlug)
      : null;
    if (existingPartnerSlug && (!this.findPartnerBySlug || !this.attachPartnerMember)) {
      throw new AuthError("invalid_request", "Existing partner attachment is not configured.", 503);
    }
    if (existingPartnerSlug && !existingPartner) {
      throw new AuthError("invalid_request", "Existing partner was not found; no account was created.", 404);
    }
    if (!existingPartnerSlug && (await this.partnerSlugExists(partnerSlug))) {
      throw new AuthError("invalid_request", "Partner slug is already in use; no account was created.", 409);
    }

    const localAuth = new LocalAuthService({
      repository: this.repository,
      auditWriter: this.auditWriter,
      passwordHasher: this.passwordHasher,
      requireEmailVerification: false,
      now: this.now
    });
    const registration = await localAuth.register({
      email,
      password: input.password,
      displayName
    });

    let provisionedPartner: { id: string; name: string; slug: string };
    try {
      if (existingPartner && this.attachPartnerMember) {
        const now = this.now();
        await this.attachPartnerMember({
          id: randomUUID(),
          partnerId: existingPartner.id,
          userId: registration.user.id,
          role: "owner",
          status: "active",
          createdAt: now,
          updatedAt: now
        });
        provisionedPartner = existingPartner;
      } else {
        const createdPartner = await this.partners.createPartner({
          actorUserId: registration.user.id,
          name: partnerName ?? "",
          slug: partnerSlug,
          context: {
            ipAddress: null,
            userAgent: "puresoc-operator-cli"
          }
        });
        provisionedPartner = createdPartner.partner;
      }
    } catch (error) {
      await this.auditWriter.write({
        actorUserId: null,
        organizationId: null,
        targetType: "user",
        targetId: registration.user.id,
        action: "operator.partner_account.provisioning_failed",
        afterJson: {
          status: "account_created_partner_failed",
          partnerSlug
        }
      });
      throw new AuthError(
        "auth_service_unavailable",
        "The login account was created, but partner setup failed. Inspect the account before retrying.",
        503
      );
    }

    await this.auditWriter.write({
      actorUserId: null,
      organizationId: null,
      targetType: "partner",
      targetId: provisionedPartner.id,
      action: "operator.partner_account.provisioned",
      afterJson: {
        email,
        emailVerified: true,
        partnerRole: "owner",
        partnerSlug,
        portfolioMode: existingPartner ? "existing_populated_portfolio" : "new_empty_portfolio",
        provisioningMode: "controlled_operator_cli"
      }
    });

    return {
      status: "created",
      account: {
        id: registration.user.id,
        email: registration.user.email,
        displayName: registration.user.displayName,
        emailVerified: true
      },
      partner: {
        id: provisionedPartner.id,
        name: provisionedPartner.name,
        slug: provisionedPartner.slug,
        role: "owner"
      },
      loginPath: "/login",
      landingPath: "/partners",
      passwordIncluded: false
    };
  }
}

const requiredLabel = (value: string, label: string): string => {
  const normalized = value.trim();
  if (normalized.length < 2 || normalized.length > 160) {
    throw new AuthError("invalid_request", `${label} must be between 2 and 160 characters.`, 400);
  }
  return normalized;
};

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
