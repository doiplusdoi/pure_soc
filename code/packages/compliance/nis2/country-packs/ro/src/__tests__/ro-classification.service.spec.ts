import { describe, expect, it } from "vitest";

import { classifyRoNis2Entity } from "../classification.service";

describe("ro classification service", () => {
  it("classifies qualified trust providers as essential when established in Romania", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["108008"],
      sizeCategory: "small_micro"
    });

    expect(result.result).toBe("essential_entity");
    expect(result.notificationRecommended).toBe(true);
    expect(result.matchedRules).toContain("Algoritm clasificare!K3:M3");
  });

  it("requires Article 9 answers for small cloud/data-centre/CDN/managed-service entities", () => {
    const result = classifyRoNis2Entity({
      relationship: {
        mainOfficeInRomania: true
      },
      selectedServiceTypeCodes: ["108004"],
      sizeCategory: "small_micro"
    });

    expect(result.result).toBe("insufficient_data");
    expect(result.article9Required).toBe(true);
    expect(result.missingRequiredFields).toEqual(["article9"]);
  });

  it("uses Article 9 answers to classify small high-criticality entities", () => {
    const result = classifyRoNis2Entity({
      article9: {
        publicSafetySecurityOrHealthImpact: "medium"
      },
      relationship: {
        establishedInRomania: true
      },
      selectedServiceTypeCodes: ["101101"],
      sizeCategory: "small_micro"
    });

    expect(result.result).toBe("important_entity");
    expect(result.article9Required).toBe(true);
    expect(result.matchedRules).toEqual(
      expect.arrayContaining(["Algoritm clasificare!F9", "Algoritm clasificare!K14:E16"])
    );
  });

  it("keeps the none-of-the-listed-services path out of automatic legal activation", () => {
    const result = classifyRoNis2Entity({
      selectedServiceTypeCodes: ["none_of_oug_155_2024_services"],
      sizeCategory: "large"
    });

    expect(result.result).toBe("voluntary_registration_possible");
    expect(result.notificationRecommended).toBe(false);
  });
});
