import { describe, expect, it } from "vitest";

import type { ProviderNormalizedResource } from "@puresoc/providers-core";
import {
  buildMicrosoft365ZeroBlastOutput,
  microsoft365ZeroBlastActionKeys,
  microsoft365ZeroBlastActionsForGap
} from "../zero-blast-actions";

const resource = (
  id: string,
  resourceType: ProviderNormalizedResource["resourceType"],
  normalizedJson: Record<string, unknown>
): ProviderNormalizedResource => ({
  id,
  organizationId: "org_1",
  providerConnectionId: "connection_1",
  providerKey: "microsoft365",
  externalId: `external_${id}`,
  externalResourceType: resourceType,
  resourceType,
  sourceModule: "fixture",
  normalizedJson,
  contentHash: `hash_${id}`,
  firstSeenAt: "2026-09-01T00:00:00.000Z",
  lastSeenAt: "2026-09-03T00:00:00.000Z"
});

describe("Microsoft 365 zero-blast action catalog", () => {
  it("offers all four safe actions for an open identity, supplier, and incident baseline gap", () => {
    const actions = microsoft365ZeroBlastActionsForGap({
      controlId: "product.missing-security-baseline",
      summary: "Identity, supplier, logging, and incident declarations are incomplete.",
      recommendedActions: ["Complete identity and application access controls."],
      providerSignals: ["mfa_registration_gap"]
    });

    expect(actions.map((action) => action.actionKey)).toEqual(microsoft365ZeroBlastActionKeys);
    expect(actions.every((action) => action.expectedChange.includes("unchanged"))).toBe(true);
  });

  it("builds useful local reports from stored resources without a provider mutation", () => {
    const resources = [
      resource("user_registered", "cloud_user", {
        displayName: "Registered User",
        mfaRegistered: true,
        userType: "member"
      }),
      resource("user_guest", "cloud_user", {
        displayName: "External Reviewer",
        mfaRegistered: false,
        userType: "guest"
      }),
      resource("app_expiring", "cloud_application", {
        displayName: "Invoice integration",
        credentialExpiryAt: "2026-10-01T00:00:00.000Z"
      }),
      resource("audit_event", "cloud_audit_event", {
        eventType: "role_assignment",
        occurredAt: "2026-09-03T00:00:00.000Z"
      })
    ];

    const mfa = buildMicrosoft365ZeroBlastOutput({
      actionKey: "MFA_COVERAGE_REPORT",
      generatedAt: "2026-09-04T00:00:00.000Z",
      resources
    });
    const guests = buildMicrosoft365ZeroBlastOutput({
      actionKey: "GUEST_USER_REVIEW_TASK",
      generatedAt: "2026-09-04T00:00:00.000Z",
      resources
    });
    const applications = buildMicrosoft365ZeroBlastOutput({
      actionKey: "APP_REGISTRATION_CREDENTIAL_EXPIRY_REPORT",
      generatedAt: "2026-09-04T00:00:00.000Z",
      resources
    });

    expect(mfa).toMatchObject({
      providerMutation: false,
      outputType: "coverage_report",
      summary: {
        evaluatedUsers: 2,
        registeredUsers: 1,
        unregisteredUsers: 1,
        coveragePercent: 50
      }
    });
    expect(guests).toMatchObject({
      providerMutation: false,
      outputType: "review_task",
      summary: { guestUsers: 1 }
    });
    expect(applications).toMatchObject({
      providerMutation: false,
      outputType: "expiry_report",
      summary: {
        evaluatedApplications: 1,
        credentialsExpiringWithin90Days: 1
      }
    });
  });
});
