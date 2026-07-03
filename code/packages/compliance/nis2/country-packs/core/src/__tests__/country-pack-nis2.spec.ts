import { describe, expect, it } from "vitest";

import { EU_MEMBER_STATE_COUNT, euMemberStates } from "@puresoc/database";
import {
  buildCommonNis2OnboardingCountryPack,
  buildCountryPackNotificationDraftEnvelope,
  buildNis2CountryPackOnboardingRegistry,
  buildCountryPackStatuses,
  classifyWithNis2CountryPack,
  demoCountryPackDefinitions,
  germanyNis2DemoCountryPack,
  polandNis2DemoCountryPack,
  parseCountryPackNotificationDraftEnvelope,
  validateNis2CountryPackDefinition,
  validateCountryPackNotificationDraftEnvelope
} from "../index";

describe("nis2 country-pack status", () => {
  it("returns a status record for every EU Member State", () => {
    const statuses = buildCountryPackStatuses(euMemberStates);

    expect(statuses).toHaveLength(EU_MEMBER_STATE_COUNT);
    expect(new Set(statuses.map((status) => status.countryCode)).size).toBe(EU_MEMBER_STATE_COUNT);
    expect(statuses.every((status) => status.sourceActivationDefault === "review_required")).toBe(true);
  });

  it("keeps the planned full pack state data-driven and distinct from baseline-only countries", () => {
    const statuses = buildCountryPackStatuses(euMemberStates);
    const plannedFullPacks = statuses.filter((status) => ["DE", "PL", "RO"].includes(status.countryCode));
    const baselineOnlyStatuses = statuses.filter((status) => !["DE", "PL", "RO"].includes(status.countryCode));

    expect(plannedFullPacks.map((status) => status.countryCode).sort()).toEqual(["DE", "PL", "RO"]);
    expect(plannedFullPacks.every((status) => status.countryPackStatus === "planned_full_pack")).toBe(true);
    expect(plannedFullPacks.every((status) => status.completeness === "official_sources_identified")).toBe(true);
    expect(plannedFullPacks.every((status) => status.unsupportedFeatures.map((feature) => feature.featureKey).includes("full_pack_pending"))).toBe(true);
    expect(baselineOnlyStatuses.every((status) => status.countryPackStatus === "baseline_only")).toBe(true);
    expect(baselineOnlyStatuses.every((status) => status.unsupportedFeatures.length > 0)).toBe(true);
  });

  it("validates EU, Poland, and Germany demo country-pack definitions", () => {
    for (const pack of demoCountryPackDefinitions) {
      expect(validateNis2CountryPackDefinition(pack)).toEqual({
        valid: true,
        issues: []
      });
    }

    expect(polandNis2DemoCountryPack.status).toBe("demo");
    expect(germanyNis2DemoCountryPack.status).toBe("demo");
    expect(polandNis2DemoCountryPack.officialSources.map((source) => source.url)).toEqual(
      expect.arrayContaining([
        "https://www.gov.pl/web/baza-wiedzy/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa",
        "https://www.gov.pl/web/baza-wiedzy/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa-ksc---jak-dokonac-samoidentyfikacji",
        "https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20180001560/U/D20181560Lj.pdf"
      ])
    );
    expect(germanyNis2DemoCountryPack.officialSources.map((source) => source.url)).toEqual(
      expect.arrayContaining([
        "https://mip2.bsi.bund.de/en/info-nis2-registrierung/",
        "https://mip2.bsi.bund.de/en/faq/",
        "https://www.bsi.bund.de/DE/Themen/Regulierte-Wirtschaft/NIS-2-regulierte-Unternehmen/NIS-2-Anleitung-Registrierung/Anleitung-Registrierung_node.html"
      ])
    );
    expect(polandNis2DemoCountryPack.operationalDifferences.map((difference) => difference.key)).toEqual(
      expect.arrayContaining([
        "pl.ksc.wykaz_registration_window",
        "pl.ksc.ex_officio_registration",
        "pl.ksc.telecom_all_sizes"
      ])
    );
    expect(germanyNis2DemoCountryPack.operationalDifferences.map((difference) => difference.key)).toEqual(
      expect.arrayContaining(["de.bsi.portal_exclusive_registration", "de.mip2.kritis_federal_transition"])
    );
    expect(
      [...polandNis2DemoCountryPack.operationalDifferences, ...germanyNis2DemoCountryPack.operationalDifferences].every(
        (difference) => difference.reviewStatus !== "active"
      )
    ).toBe(true);
  });

  it("returns structured demo classification with source references and legal-review caveats", () => {
    const poland = classifyWithNis2CountryPack(polandNis2DemoCountryPack, {
      employeeCount: 42,
      sector: "food"
    });
    const germany = classifyWithNis2CountryPack(germanyNis2DemoCountryPack, {
      employeeCount: 180,
      publicAdministration: true,
      sector: "public_administration"
    });

    expect(poland).toMatchObject({
      result: "possibly_in_scope",
      legalReviewRequired: true,
      confidence: "low"
    });
    expect(poland.matchedRules).toContain("pl-demo-food-or-manufacturing");
    expect(poland.legalBasisReferences.length).toBeGreaterThan(0);
    expect(germany).toMatchObject({
      result: "possibly_in_scope",
      legalReviewRequired: true
    });
    expect(germany.matchedRules).toContain("de-demo-public-administration");
    expect(germany.explanation).not.toMatch(/certified|guaranteed|binding legal determination/i);
  });

  it("builds a common onboarding registry for Romania, Poland, and Germany", () => {
    const registry = buildNis2CountryPackOnboardingRegistry([
      buildCommonNis2OnboardingCountryPack({
        ...polandNis2DemoCountryPack,
        countryCode: "RO",
        displayName: "Romania",
        packVersion: "2026.06.review-required"
      }),
      buildCommonNis2OnboardingCountryPack(polandNis2DemoCountryPack),
      buildCommonNis2OnboardingCountryPack(germanyNis2DemoCountryPack)
    ]);

    expect(registry.list().map((pack) => pack.countryCode)).toEqual(["DE", "PL", "RO"]);
    expect(registry.require("ro")).toMatchObject({
      countryCode: "RO",
      onboardingScreens: expect.arrayContaining([
        expect.objectContaining({ key: "company" }),
        expect.objectContaining({ key: "review" })
      ]),
      sourceReviewStatus: "review_required"
    });
  });
});

describe("country-pack notification draft envelopes", () => {
  it("parses valid generic notification envelopes with keyed caveat metadata", () => {
    const envelope = buildCountryPackNotificationDraftEnvelope({
      jurisdiction: "RO",
      locale: "ro-RO",
      notificationType: "country_registration",
      payload: {
        entityName: "Example SA"
      },
      payloadSchemaKey: "ro.nis2.registration_notification.v1",
      payloadSchemaVersion: "1.0.0",
      sourceMappedFields: [
        {
          fieldKey: "entityName",
          label: {
            locale: "en",
            messageKey: "country_pack.ro.nis2.notification.entity_name.label",
            sourceMapId: "ro-nis2-notification_draft_mapping-entity_name",
            text: "Name of the entity"
          },
          sourceMapId: "ro-nis2-notification_draft_mapping-entity_name",
          sourceReferences: [{ cell: "D12", sheet: "Entity data" }],
          value: "Example SA"
        }
      ],
      sourceReferences: [{ cell: "D12", sheet: "Entity data" }]
    });

    const result = validateCountryPackNotificationDraftEnvelope(envelope);

    expect(result).toMatchObject({
      valid: true,
      issues: []
    });
    expect(parseCountryPackNotificationDraftEnvelope(envelope)).toMatchObject({
      legalCaveatFallbackReason: "missing_translation",
      legalCaveatLocale: "en",
      legalCaveatFallbackUsed: true,
      legalCaveatRequestedLocale: "ro-RO",
      legalCaveatReviewStatus: "source_approved",
      locale: "ro",
      notificationType: "country_registration",
      payloadSchemaKey: "ro.nis2.registration_notification.v1"
    });
  });

  it("rejects malformed envelopes without source maps or the keyed legal caveat", () => {
    const result = validateCountryPackNotificationDraftEnvelope({
      frameworkKey: "nis2",
      jurisdiction: "RO",
      legalCaveat: "Certified compliant.",
      legalCaveatFallbackUsed: false,
      legalCaveatLocale: "ro",
      legalCaveatMessageKey: "wrong.key",
      locale: "ro",
      notificationType: "country_registration",
      payload: {},
      payloadSchemaKey: "ro-nis2-registration",
      payloadSchemaVersion: "1",
      sourceMappedFields: [],
      sourceReferences: []
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["invalid_legal_caveat", "invalid_schema_key", "invalid_schema_version", "empty_array"])
    );
  });
});
