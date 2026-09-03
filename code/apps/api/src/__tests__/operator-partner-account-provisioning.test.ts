import { beforeEach, describe, expect, it } from "vitest";

import { AuthError } from "@puresoc/auth-core";
import { loadConfig } from "@puresoc/config";

import { createApiServices, type ApiServices } from "../auth/services";
import { PartnerAccountProvisioningService } from "../operators/partner-account-provisioning";

describe("controlled partner account provisioning", () => {
  let services: ApiServices;

  beforeEach(() => {
    services = createApiServices({
      config: loadConfig({
        env: {
          PURESOC_AUTH_REQUIRE_EMAIL_VERIFICATION: "true"
        }
      }),
      now: () => new Date("2026-08-21T09:00:00.000Z")
    });
  });

  it("creates a verified local account and owner-level partner membership without returning the password", async () => {
    const provisioner = new PartnerAccountProvisioningService({
      repository: services.identityRepository,
      auditWriter: services.auditWriter,
      partners: services.partners,
      partnerSlugExists: async () => false,
      now: () => new Date("2026-08-21T09:00:00.000Z")
    });

    const result = await provisioner.provision({
      email: " PARTNER@Example.test ",
      password: "CorrectHorseBatteryStaple42!",
      displayName: " Partner Owner ",
      partnerName: " Demo Advisory SRL "
    });

    const credential = await services.identityRepository.findLocalCredentialByEmail("partner@example.test");
    const memberships = await services.partnerRepository.listPartnersForUser(result.account.id);

    expect(result).toMatchObject({
      status: "created",
      account: {
        email: "partner@example.test",
        displayName: "Partner Owner",
        emailVerified: true
      },
      partner: {
        name: "Demo Advisory SRL",
        slug: "demo-advisory-srl",
        role: "owner"
      },
      loginPath: "/login",
      landingPath: "/partners",
      passwordIncluded: false
    });
    expect(credential?.emailVerifiedAt?.toISOString()).toBe("2026-08-21T09:00:00.000Z");
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.membership.role).toBe("owner");
    expect(JSON.stringify(result)).not.toContain("CorrectHorseBatteryStaple42!");
    expect(services.auditSink.records.map((record) => record.action)).toEqual(
      expect.arrayContaining([
        "local_account_created",
        "partner.created",
        "operator.partner_account.provisioned"
      ])
    );
  });

  it("rejects existing emails before creating another partner", async () => {
    const provisioner = new PartnerAccountProvisioningService({
      repository: services.identityRepository,
      auditWriter: services.auditWriter,
      partners: services.partners,
      partnerSlugExists: async () => false
    });
    const input = {
      email: "partner@example.test",
      password: "CorrectHorseBatteryStaple42!",
      displayName: "Partner Owner",
      partnerName: "Demo Advisory"
    };

    await provisioner.provision(input);
    await expect(provisioner.provision({ ...input, partnerName: "Another Partner" })).rejects.toMatchObject({
      code: "email_already_registered",
      statusCode: 409
    } satisfies Partial<AuthError>);

    expect(await services.partnerRepository.listPartnersForUser(services.auditSink.records[0]?.actorUserId ?? "")).toHaveLength(1);
  });

  it("attaches a unique verified owner account to an existing populated partner portfolio", async () => {
    const createProvisioner = new PartnerAccountProvisioningService({
      repository: services.identityRepository,
      auditWriter: services.auditWriter,
      partners: services.partners,
      partnerSlugExists: async () => false,
      now: () => new Date("2026-08-21T09:00:00.000Z")
    });
    const seededOwner = await createProvisioner.provision({
      email: "seed-owner@example.test",
      password: "CorrectHorseBatteryStaple42!",
      displayName: "Seed Owner",
      partnerName: "Asterion Cloud Partners"
    });

    const attachProvisioner = new PartnerAccountProvisioningService({
      repository: services.identityRepository,
      auditWriter: services.auditWriter,
      partners: services.partners,
      partnerSlugExists: async () => true,
      findPartnerBySlug: async (slug) => {
        const partner = await services.partnerRepository.findPartnerById(seededOwner.partner.id);
        return partner?.slug === slug ? partner : null;
      },
      attachPartnerMember: (member) => services.partnerRepository.createPartnerMember(member),
      now: () => new Date("2026-08-21T09:00:00.000Z")
    });

    const result = await attachProvisioner.provision({
      email: "prospect@example.test",
      password: "AnotherCorrectHorseBatteryStaple42!",
      displayName: "Prospective Partner",
      existingPartnerSlug: "asterion-cloud-partners"
    });
    const memberships = await services.partnerRepository.listPartnersForUser(result.account.id);

    expect(result.partner).toMatchObject({
      id: seededOwner.partner.id,
      name: "Asterion Cloud Partners",
      slug: "asterion-cloud-partners",
      role: "owner"
    });
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.membership.role).toBe("owner");
    expect(
      services.auditSink.records.find(
        (record) =>
          record.action === "operator.partner_account.provisioned" &&
          record.targetId === seededOwner.partner.id &&
          (record.afterJson as Record<string, unknown> | undefined)?.portfolioMode === "existing_populated_portfolio"
      )?.afterJson
    ).toMatchObject({ portfolioMode: "existing_populated_portfolio" });
  });

  it("rejects a partner slug conflict before creating the login account", async () => {
    const provisioner = new PartnerAccountProvisioningService({
      repository: services.identityRepository,
      auditWriter: services.auditWriter,
      partners: services.partners,
      partnerSlugExists: async (slug) => slug === "existing-partner"
    });

    await expect(
      provisioner.provision({
        email: "new@example.test",
        password: "CorrectHorseBatteryStaple42!",
        displayName: "New Owner",
        partnerName: "Existing Partner"
      })
    ).rejects.toMatchObject({
      code: "invalid_request",
      statusCode: 409
    } satisfies Partial<AuthError>);

    expect(await services.identityRepository.findLocalCredentialByEmail("new@example.test")).toBeNull();
  });
});
