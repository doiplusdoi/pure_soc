import { describe, expect, it } from "vitest";

import {
  LEGAL_CAVEAT_MESSAGE_KEY,
  PURESOC_MESSAGE_KEYS,
  PURESOC_LEGAL_CAVEAT,
  resolveLegalCaveatMessage,
  resolvePureSocLocale,
  resolvePureSocMessage
} from "@puresoc/shared";

describe("i18n and country-pack notification model contracts", () => {
  it("normalizes supported locales and falls back for unknown locale tags", () => {
    expect(resolvePureSocLocale("ro-RO")).toMatchObject({
      fallbackUsed: false,
      locale: "ro",
      requestedLocale: "ro-RO"
    });
    expect(resolvePureSocLocale("fr-FR")).toMatchObject({
      fallbackUsed: true,
      locale: "en",
      requestedLocale: "fr-FR"
    });
  });

  it("uses a keyed legal caveat with English fallback until Romanian copy is approved", () => {
    const caveat = resolveLegalCaveatMessage("ro-RO");

    expect(caveat).toMatchObject({
      fallbackReason: "missing_translation",
      fallbackUsed: true,
      messageKey: LEGAL_CAVEAT_MESSAGE_KEY,
      messageKind: "legal",
      normalizedLocale: "ro",
      requestedLocale: "ro-RO",
      reviewStatus: "source_approved",
      resolvedLocale: "en",
      text: PURESOC_LEGAL_CAVEAT
    });
    expect(caveat.text).toContain("not a legal opinion");
    expect(caveat.text).not.toContain("Certified compliant");
  });

  it("resolves demo-safe Romanian product copy without legal caveat approval claims", () => {
    const message = resolvePureSocMessage({
      locale: "ro-RO",
      messageKey: PURESOC_MESSAGE_KEYS.internalReadinessLabel
    });

    expect(message).toMatchObject({
      fallbackUsed: false,
      messageKind: "product",
      normalizedLocale: "ro",
      requestedLocale: "ro-RO",
      resolvedLocale: "ro",
      reviewStatus: "demo_safe",
      text: "Pregătire internă"
    });
    expect(message.text).not.toMatch(/certificat|legal/i);
  });

  it("records unsupported-locale fallback separately from missing translations", () => {
    const message = resolvePureSocMessage({
      locale: "fr-FR",
      messageKey: PURESOC_MESSAGE_KEYS.dashboardLabel
    });

    expect(message).toMatchObject({
      fallbackReason: "unsupported_locale",
      fallbackUsed: true,
      normalizedLocale: "en",
      requestedLocale: "fr-FR",
      resolvedLocale: "en",
      text: "Dashboard"
    });
  });
});
