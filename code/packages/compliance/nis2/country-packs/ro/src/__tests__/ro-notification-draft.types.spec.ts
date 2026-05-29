import { describe, expect, it } from "vitest";

import { classifyRoNis2Entity } from "../classification.service";
import {
  backfillRoNis2NotificationDraftPayload,
  buildRoNis2NotificationDraftEnvelope,
  buildRoNis2NotificationDraft,
  notificationDraftHasSourceMappedFields,
  RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY
} from "../notification-draft.types";
import { parseCountryPackNotificationDraftEnvelope } from "@puresoc/country-packs-core";

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
    expect(draft.legalCaveatReviewStatus).toBe("source_approved");
    expect(draft.legalCaveatFallbackUsed).toBe(false);
    expect(draft.legalCaveat).toContain("not a legal opinion");
    expect(draft.submission).toMatchObject({
      noticeFallbackUsed: false,
      noticeLocale: "en",
      noticeMessageKey: "country_pack.ro.nis2.notification.submission.notice.v1",
      noticeReviewStatus: "source_approved"
    });
    expect(notificationDraftHasSourceMappedFields(draft)).toBe(true);
    expect(draft.fields).toHaveLength(74);
    expect(draft.sourceMapLinks).toHaveLength(74);
    expect(draft.submission.notice).not.toMatch(/workbook|sheet|cell/i);
    expect(draft.fields.find((field) => field.key === "notification_c10")).toMatchObject({
      labelMessageKey: "country_pack.ro.nis2.notification.notification_c10.label",
      labelFallbackUsed: false,
      labelLocale: "en",
      labelReviewStatus: "source_approved",
      sourceMapId: "ro-nis2-notification_draft_mapping-notification_c10",
      targetCell: "C10",
      value: "12345678"
    });
    expect(draft.sourceMapLinks.every((link) => link.workbookRange?.startsWith("Notification form!"))).toBe(true);
  });

  it("builds a generic payload envelope for canonical NotificationDraft persistence", () => {
    const classification = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "medium"
    });
    const envelope = buildRoNis2NotificationDraftEnvelope({
      answers: {
        entity: {
          cui: "12345678",
          legalName: "Example SA"
        }
      },
      classification,
      generatedAt: "2026-04-28T00:00:00.000Z",
      locale: "ro-RO",
      status: "ready_for_review"
    });

    expect(parseCountryPackNotificationDraftEnvelope(envelope)).toMatchObject({
      jurisdiction: "RO",
      legalCaveatFallbackReason: "missing_translation",
      legalCaveatRequestedLocale: "ro-RO",
      legalCaveatReviewStatus: "source_approved",
      legalCaveatLocale: "en",
      locale: "ro",
      notificationType: "country_registration",
      payloadSchemaKey: RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY
    });
    expect(envelope.payload).toMatchObject({
      legacyNotificationType: "ro_nis2_registration_notification",
      status: "ready_for_review"
    });
    expect(envelope.sourceMappedFields.find((field) => field.fieldKey === "notification_c9")).toMatchObject({
      label: {
        fallbackReason: "missing_translation",
        fallbackUsed: true,
        locale: "en",
        messageKey: "country_pack.ro.nis2.notification.notification_c9.label"
      },
      value: "Example SA"
    });
  });

  it("backfills readable legacy Romania draft payloads into the generic envelope", () => {
    const classification = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "medium"
    });
    const legacyDraft = buildRoNis2NotificationDraft({
      answers: {
        entity: {
          legalName: "Example SA"
        }
      },
      classification,
      generatedAt: "2026-04-28T00:00:00.000Z",
      locale: "ro-RO"
    });

    const backfill = backfillRoNis2NotificationDraftPayload(legacyDraft);

    expect(backfill.status).toBe("converted");
    if (backfill.status !== "converted") {
      throw new Error("Expected converted backfill result.");
    }
    expect(backfill.envelope).toMatchObject({
      jurisdiction: "RO",
      legalCaveatLocale: "en",
      locale: "ro",
      notificationType: "country_registration",
      payloadSchemaKey: RO_NIS2_NOTIFICATION_PAYLOAD_SCHEMA_KEY
    });
    expect(parseCountryPackNotificationDraftEnvelope(backfill.envelope)).toMatchObject({
      sourceMappedFields: expect.arrayContaining([
        expect.objectContaining({
          fieldKey: "notification_c9"
        })
      ])
    });
  });

  it("returns already_generic for valid generic Romania envelopes", () => {
    const classification = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "medium"
    });
    const envelope = buildRoNis2NotificationDraftEnvelope({
      answers: {
        entity: {
          legalName: "Example SA"
        }
      },
      classification,
      generatedAt: "2026-04-28T00:00:00.000Z"
    });

    const backfill = backfillRoNis2NotificationDraftPayload(envelope);

    expect(backfill.status).toBe("already_generic");
    if (backfill.status !== "already_generic") {
      throw new Error("Expected already_generic backfill result.");
    }
    expect(backfill.envelope).toEqual(envelope);
  });

  it("leaves unverifiable legacy payloads for manual review", () => {
    const classification = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "medium"
    });
    const legacyDraft = buildRoNis2NotificationDraft({
      answers: {
        entity: {
          legalName: "Example SA"
        }
      },
      classification,
      generatedAt: "2026-04-28T00:00:00.000Z"
    });

    const backfill = backfillRoNis2NotificationDraftPayload({
      ...legacyDraft,
      legalCaveat: "Certified compliant.",
      sourceMapLinks: []
    });

    expect(backfill).toMatchObject({
      status: "manual_review_required",
      reasons: expect.arrayContaining([
        "legacy payload legal caveat must match the keyed PureSOC legal caveat text.",
        "legacy payload sourceMapLinks must include notification mapping provenance."
      ])
    });
  });
});
