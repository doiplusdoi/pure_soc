import { describe, expect, it } from "vitest";

import {
  LEGAL_CAVEAT_MESSAGE_KEY,
  PURESOC_LEGAL_CAVEAT,
  resolveLegalCaveatMessage,
  resolvePureSocLocale
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
      fallbackUsed: true,
      messageKey: LEGAL_CAVEAT_MESSAGE_KEY,
      normalizedLocale: "ro",
      requestedLocale: "ro-RO",
      resolvedLocale: "en",
      text: PURESOC_LEGAL_CAVEAT
    });
    expect(caveat.text).toContain("not a legal opinion");
    expect(caveat.text).not.toContain("Certified compliant");
  });

});
