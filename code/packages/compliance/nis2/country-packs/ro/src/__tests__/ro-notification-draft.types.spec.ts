import { describe, expect, it } from "vitest";

import { classifyRoNis2Entity } from "../classification.service";
import {
  buildRoNis2NotificationDraft,
  notificationDraftHasSourceMappedFields,
  RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY
} from "../notification-draft.types";

describe("ro notification draft data contract", () => {
  it("builds source-mapped notification draft fields without DNSC submission", () => {
    const classification = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "medium"
    });
    const draft = buildRoNis2NotificationDraft({
      answers: {
        activity: {
          mainNaceCode: "6201"
        },
        address: {
          city: "Bucharest",
          country: "Romania",
          county: "Bucharest",
          street: "Example Street"
        },
        contact: {
          email: "security@example.test"
        },
        entity: {
          cui: "12345678",
          legalName: "Example SA",
          nationalRegistrationNumber: "J40/1/2026"
        },
        relationship: {
          criticalEntityInRomaniaLaw294: false
        },
        size: {
          employeeCount: 70,
          sizeCategory: "medium"
        }
      },
      classification,
      generatedAt: "2026-04-28T00:00:00.000Z"
    });

    expect(draft.jurisdiction).toBe("RO");
    expect(draft.notificationType).toBe("ro_nis2_registration_notification");
    expect(draft.submission).toMatchObject({
      submittedAt: null,
      submittedToDnsc: false
    });
    expect(draft.payloadSchemaKey).toBe(RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY);
    expect(draft.payloadSchemaVersion).toBe("1.0.0");
    expect(draft.locale).toBe("en");
    expect(draft.legalCaveatMessageKey).toBe("puresoc.legal_caveat.internal_readiness.v1");
    expect(draft.legalCaveat).toContain("not a legal opinion");
    expect(notificationDraftHasSourceMappedFields(draft)).toBe(true);
    expect(draft.fields.find((field) => field.key === "notification_c10")).toMatchObject({
      labelMessageKey: "country_pack.ro.nis2.notification.notification_c10.label",
      labelLocale: "en",
      sourceMapId: "ro-nis2-notification_draft_mapping-notification_c10",
      targetCell: "C10",
      value: "12345678"
    });
    expect(draft.sourceMapLinks.every((link) => link.workbookRange?.startsWith("Notification form!"))).toBe(true);
  });
});
