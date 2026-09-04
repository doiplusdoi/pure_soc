import type { ProviderNormalizedResource } from "@puresoc/providers-core";

export const microsoft365ZeroBlastActionKeys = [
  "AUDIT_LOG_EXPORT_SETUP",
  "MFA_COVERAGE_REPORT",
  "GUEST_USER_REVIEW_TASK",
  "APP_REGISTRATION_CREDENTIAL_EXPIRY_REPORT"
] as const;

export type Microsoft365ZeroBlastActionKey = (typeof microsoft365ZeroBlastActionKeys)[number];

export interface Microsoft365ZeroBlastActionDefinition {
  actionKey: Microsoft365ZeroBlastActionKey;
  actionType: "process" | "technical";
  description: string;
  expectedChange: string;
  gapSignals: string[];
  manualFallback: string;
  moduleKey: string;
  outputType: "setup_guide" | "coverage_report" | "review_task" | "expiry_report";
  permissionsRequired: string[];
  title: string;
}

export interface Microsoft365ZeroBlastGapLike {
  controlId?: string;
  findings?: readonly string[];
  missingEvidence?: readonly string[];
  providerSignals?: readonly string[];
  recommendedActions?: readonly string[];
  summary?: string;
}

export interface Microsoft365ZeroBlastOutput {
  actionKey: Microsoft365ZeroBlastActionKey;
  generatedAt: string;
  outputType: Microsoft365ZeroBlastActionDefinition["outputType"];
  providerMutation: false;
  resourceRefs: string[];
  summary: Record<string, unknown>;
}

export const microsoft365ZeroBlastActions: readonly Microsoft365ZeroBlastActionDefinition[] = [
  {
    actionKey: "AUDIT_LOG_EXPORT_SETUP",
    actionType: "process",
    description: "Create a reviewable audit-log export setup guide from the latest stored Microsoft 365 read snapshot.",
    expectedChange: "Create setup guidance and evidence metadata; Microsoft 365 configuration remains unchanged.",
    gapSignals: ["audit", "log", "logging", "monitor", "incident", "detection"],
    manualFallback: "Use the Microsoft Purview or Entra admin center to document the current audit export and retention process.",
    moduleKey: "entra-audit-logs",
    outputType: "setup_guide",
    permissionsRequired: ["AuditLog.Read.All"],
    title: "Prepare audit log export setup"
  },
  {
    actionKey: "MFA_COVERAGE_REPORT",
    actionType: "technical",
    description: "Generate an MFA registration coverage report from the latest stored Microsoft 365 user snapshot.",
    expectedChange: "Create an MFA coverage report and evidence metadata; user authentication settings remain unchanged.",
    gapSignals: ["mfa", "multi-factor", "authentication", "identity", "access"],
    manualFallback: "Export authentication-method registration details and review unregistered accounts manually.",
    moduleKey: "mfa-registration",
    outputType: "coverage_report",
    permissionsRequired: ["Reports.Read.All"],
    title: "Generate MFA coverage report"
  },
  {
    actionKey: "GUEST_USER_REVIEW_TASK",
    actionType: "process",
    description: "Create a guest-account review task with the guest users found in the latest stored Microsoft 365 snapshot.",
    expectedChange: "Create a guest-user review task and evidence metadata; guest accounts remain unchanged.",
    gapSignals: ["guest", "external user", "third party", "supplier", "identity", "access"],
    manualFallback: "Export guest users from Entra ID and record the access-review decision for each account.",
    moduleKey: "entra-directory",
    outputType: "review_task",
    permissionsRequired: ["User.Read.All"],
    title: "Create guest user review task"
  },
  {
    actionKey: "APP_REGISTRATION_CREDENTIAL_EXPIRY_REPORT",
    actionType: "technical",
    description: "Generate a credential-expiry report for app registrations and service principals from stored read data.",
    expectedChange: "Create an application credential expiry report and evidence metadata; credentials remain unchanged.",
    gapSignals: ["application", "app registration", "credential", "secret", "identity", "access"],
    manualFallback: "Export application registrations and service principals, then review credential expiry dates manually.",
    moduleKey: "entra-applications",
    outputType: "expiry_report",
    permissionsRequired: ["Application.Read.All"],
    title: "Generate app credential expiry report"
  }
] as const;

const actionKeySet = new Set<string>(microsoft365ZeroBlastActionKeys);

export const isMicrosoft365ZeroBlastActionKey = (value: string): value is Microsoft365ZeroBlastActionKey =>
  actionKeySet.has(value);

export const getMicrosoft365ZeroBlastAction = (
  actionKey: string
): Microsoft365ZeroBlastActionDefinition | undefined =>
  microsoft365ZeroBlastActions.find((action) => action.actionKey === actionKey);

export const microsoft365ZeroBlastActionsForGap = (
  gap: Microsoft365ZeroBlastGapLike
): Microsoft365ZeroBlastActionDefinition[] => {
  const searchable = [
    gap.controlId,
    gap.summary,
    ...(gap.findings ?? []),
    ...(gap.missingEvidence ?? []),
    ...(gap.providerSignals ?? []),
    ...(gap.recommendedActions ?? [])
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return microsoft365ZeroBlastActions.filter((action) =>
    action.gapSignals.some((signal) => searchable.includes(signal))
  );
};

export const buildMicrosoft365ZeroBlastOutput = (input: {
  actionKey: Microsoft365ZeroBlastActionKey;
  generatedAt: string;
  resources: readonly ProviderNormalizedResource[];
}): Microsoft365ZeroBlastOutput => {
  const activeResources = input.resources.filter((resource) => !resource.deletedAt);

  if (input.actionKey === "AUDIT_LOG_EXPORT_SETUP") {
    const auditEvents = activeResources.filter((resource) => resource.resourceType === "cloud_audit_event");
    return output(input, auditEvents, {
      storedAuditEventCount: auditEvents.length,
      latestObservedAt: latestTimestamp(auditEvents.map((resource) => resource.lastSeenAt)),
      setupChecklist: [
        "Confirm the Entra audit and sign-in log modules have completed successfully.",
        "Choose an approved evidence destination and retention period.",
        "Record the export owner and review cadence.",
        "Attach a sample export and verify that timestamps, actors, and results are present."
      ]
    });
  }

  if (input.actionKey === "MFA_COVERAGE_REPORT") {
    const users = activeResources.filter(
      (resource) => resource.resourceType === "cloud_user" && typeof resource.normalizedJson.mfaRegistered === "boolean"
    );
    const unregistered = users.filter((resource) => resource.normalizedJson.mfaRegistered === false);
    return output(input, users, {
      evaluatedUsers: users.length,
      registeredUsers: users.length - unregistered.length,
      unregisteredUsers: unregistered.length,
      coveragePercent: users.length === 0 ? null : Math.round(((users.length - unregistered.length) / users.length) * 100),
      accountsRequiringReview: unregistered.map(resourceIdentity)
    });
  }

  if (input.actionKey === "GUEST_USER_REVIEW_TASK") {
    const guests = activeResources.filter(
      (resource) => resource.resourceType === "cloud_user" && resource.normalizedJson.userType === "guest"
    );
    return output(input, guests, {
      guestUsers: guests.length,
      reviewChecklist: [
        "Confirm the business sponsor and current need for each guest account.",
        "Review the account's last sign-in signal when available.",
        "Record retain, restrict, or remove as a human decision.",
        "Perform any tenant change manually in Entra ID after approval."
      ],
      accountsRequiringReview: guests.map(resourceIdentity)
    });
  }

  const applications = activeResources.filter((resource) => resource.resourceType === "cloud_application");
  const horizon = new Date(input.generatedAt);
  horizon.setUTCDate(horizon.getUTCDate() + 90);
  const withExpiry = applications
    .filter((resource) => typeof resource.normalizedJson.credentialExpiryAt === "string")
    .map((resource) => ({
      ...resourceIdentity(resource),
      credentialExpiryAt: String(resource.normalizedJson.credentialExpiryAt),
      expired: String(resource.normalizedJson.credentialExpiryAt) < input.generatedAt,
      expiresWithin90Days: String(resource.normalizedJson.credentialExpiryAt) <= horizon.toISOString()
    }));
  return output(input, applications, {
    evaluatedApplications: applications.length,
    credentialsWithExpiry: withExpiry.length,
    credentialsExpired: withExpiry.filter((application) => application.expired).length,
    credentialsExpiringWithin90Days: withExpiry.filter((application) => application.expiresWithin90Days).length,
    applicationsRequiringReview: withExpiry.filter(
      (application) => application.expired || application.expiresWithin90Days
    )
  });
};

const output = (
  input: { actionKey: Microsoft365ZeroBlastActionKey; generatedAt: string },
  resources: readonly ProviderNormalizedResource[],
  summary: Record<string, unknown>
): Microsoft365ZeroBlastOutput => ({
  actionKey: input.actionKey,
  generatedAt: input.generatedAt,
  outputType: getMicrosoft365ZeroBlastAction(input.actionKey)!.outputType,
  providerMutation: false,
  resourceRefs: resources.map((resource) => resource.id),
  summary
});

const resourceIdentity = (resource: ProviderNormalizedResource): Record<string, unknown> => ({
  resourceId: resource.id,
  externalId: resource.externalId,
  displayName:
    typeof resource.normalizedJson.displayName === "string"
      ? resource.normalizedJson.displayName
      : typeof resource.normalizedJson.userPrincipalName === "string"
        ? resource.normalizedJson.userPrincipalName
        : resource.externalId,
  lastSeenAt: resource.lastSeenAt
});

const latestTimestamp = (timestamps: readonly string[]): string | null =>
  [...timestamps].sort((left, right) => right.localeCompare(left))[0] ?? null;
