import { describe, expect, it } from "vitest";

import {
  canAutoActivateRegulatoryChange,
  changedLegalLogicDefaultStatus,
  createRegulatoryReviewTaskSkeleton,
  determineSourceActivationStatus,
  regulatorySourceActivationLifecycle
} from "../index";

describe("regulatory source activation lifecycle", () => {
  it("declares the Phase D activation lifecycle states", () => {
    expect(regulatorySourceActivationLifecycle).toEqual([
      "draft",
      "validated",
      "review_required",
      "active",
      "superseded"
    ]);
  });

  it("defaults changed legal logic to review_required and never auto-activates it", () => {
    const changedLegalLogic = {
      validationPassed: true,
      containsLegalLogicChange: true
    };

    expect(changedLegalLogicDefaultStatus).toBe("review_required");
    expect(determineSourceActivationStatus(changedLegalLogic)).toBe("review_required");
    expect(canAutoActivateRegulatoryChange(changedLegalLogic)).toBe(false);
    expect(createRegulatoryReviewTaskSkeleton("source_1")).toMatchObject({
      assignedRoleKey: "regulatory_admin",
      status: "open",
      sourceRecordId: "source_1",
      createdForStatus: "review_required"
    });
  });
});
