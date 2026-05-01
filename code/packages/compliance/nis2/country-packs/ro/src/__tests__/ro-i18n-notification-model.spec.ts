import { describe, expect, it } from "vitest";

import {
  buildCountryPackNotificationDraftEnvelope,
  countryPackNotificationPayloadSchemaKey,
  LEGAL_CAVEAT_MESSAGE_KEY
} from "@puresoc/country-packs-core";
import { classifyRoNis2Entity } from "../classification.service";
import { buildRoNis2NotificationDraft } from "../notification-draft.types";

describe("Romania i18n notification model contract", () => {
  it("builds generic notification envelopes with schema keys and caveat metadata", () => {
    const payloadSchemaKey = countryPackNotificationPayloadSchemaKey({
      countryCode: "RO",
      frameworkKey: "nis2",
      majorVersion: 1,
      notificationKind: "registration notification"
    });
    const envelope = buildCountryPackNotificationDraftEnvelope({
      jurisdiction: "RO",
      locale: "ro",
      notificationType: "country_registration",
      payload: {
        entityName: "Example SA"
      },
      payloadSchemaKey,
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
      sourceReferences: [{ sourceRecordId: "ro-workbook-notification-form" }]
    });

    expect(envelope.payloadSchemaKey).toBe("ro.nis2.registration_notification.v1");
    expect(envelope.legalCaveatMessageKey).toBe(LEGAL_CAVEAT_MESSAGE_KEY);
    expect(envelope.legalCaveatLocale).toBe("en");
    expect(envelope.legalCaveatFallbackUsed).toBe(true);
    expect(envelope.sourceMappedFields[0]?.label.messageKey).toContain("country_pack.ro.nis2.notification");
  });

  it("keeps Romania notification labels source-mapped and locale-tagged", () => {
    const classification = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "medium"
    });
    const draft = buildRoNis2NotificationDraft({
      answers: {
        entity: {
          cui: "12345678",
          legalName: "Example SA",
          nationalRegistrationNumber: "J40/1/2026"
        }
      },
      classification,
      locale: "ro-RO"
    });
    const entityNameField = draft.fields.find((field) => field.key === "notification_c9");

    expect(draft.locale).toBe("ro");
    expect(draft.legalCaveatLocale).toBe("en");
    expect(draft.legalCaveatFallbackUsed).toBe(true);
    expect(draft.payloadSchemaKey).toBe("ro.nis2.registration_notification.v1");
    expect(entityNameField).toMatchObject({
      labelLocale: "en",
      labelMessageKey: "country_pack.ro.nis2.notification.notification_c9.label",
      sourceMapId: "ro-nis2-notification_draft_mapping-notification_c9"
    });
  });
});
