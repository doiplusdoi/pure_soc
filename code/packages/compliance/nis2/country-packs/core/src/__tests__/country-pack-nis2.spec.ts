import { describe, expect, it } from "vitest";

import { EU_MEMBER_STATE_COUNT, euMemberStates } from "@puresoc/database";
import {
  buildCountryPackNotificationDraftEnvelope,
  buildCountryPackStatuses,
  parseCountryPackNotificationDraftEnvelope,
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
    const plannedFullPack = statuses.find((status) => status.countryCode === "RO");
    const baselineOnlyStatuses = statuses.filter((status) => status.countryCode !== "RO");

    expect(plannedFullPack?.countryPackStatus).toBe("planned_full_pack");
    expect(plannedFullPack?.completeness).toBe("official_sources_identified");
    expect(plannedFullPack?.unsupportedFeatures.map((feature) => feature.featureKey)).toEqual(["full_pack_pending"]);
    expect(baselineOnlyStatuses.every((status) => status.countryPackStatus === "baseline_only")).toBe(true);
    expect(baselineOnlyStatuses.every((status) => status.unsupportedFeatures.length > 0)).toBe(true);
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
      legalCaveatLocale: "en",
      legalCaveatFallbackUsed: true,
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
