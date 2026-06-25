import { ProviderConnectorError } from "@puresoc/providers-core";

export const microsoft365ProviderKey = "microsoft365";

export const microsoft365ReadModules = [
  "tenant-profile",
  "licensing",
  "users-groups-roles",
  "mfa-registration",
  "applications",
  "conditional-access",
  "entra-audit-logs",
  "entra-sign-in-logs",
  "secure-score",
  "intune-devices",
  "defender-xdr"
] as const;

export const microsoft365DefaultReadModules = [
  "tenant-profile",
  "licensing",
  "users-groups-roles",
  "mfa-registration",
  "applications",
  "conditional-access",
  "entra-audit-logs",
  "entra-sign-in-logs",
  "secure-score"
] as const;

export type Microsoft365ModuleKey = (typeof microsoft365ReadModules)[number];

export const microsoft365CoreDemoReadModules = [
  "tenant-profile",
  "licensing",
  "users-groups-roles",
  "mfa-registration",
  "secure-score"
] as const satisfies readonly Microsoft365ModuleKey[];

export const microsoft365DeferredReadModules = [
  "exchange-posture",
  "sharepoint-posture",
  "teams-posture",
  "purview-posture"
] as const;

export type Microsoft365DeferredReadModuleKey = (typeof microsoft365DeferredReadModules)[number];

export type Microsoft365CloudEnvironment = "global" | "usgov_l4" | "usgov_l5" | "china";

export const microsoft365ReadPermissionBundles = [
  "m365_read_baseline",
  "m365_security_read",
  "m365_intune_read"
] as const;

export const microsoft365WritePermissionBundles = ["m365_remediation_write", "m365_defender_write"] as const;

export type Microsoft365ReadPermissionBundleKey = (typeof microsoft365ReadPermissionBundles)[number];
export type Microsoft365WritePermissionBundleKey = (typeof microsoft365WritePermissionBundles)[number];
export type Microsoft365PermissionBundleKey =
  | Microsoft365ReadPermissionBundleKey
  | Microsoft365WritePermissionBundleKey;

export interface Microsoft365PermissionBundle {
  bundleKey: Microsoft365PermissionBundleKey;
  purpose: string;
  defaultEnabled: boolean;
  permissions: string[];
  readOnly: boolean;
}

export const microsoft365PermissionBundles: Record<Microsoft365PermissionBundleKey, Microsoft365PermissionBundle> = {
  m365_read_baseline: {
    bundleKey: "m365_read_baseline",
    purpose: "Read tenant profile, domains, licenses, users, groups, roles, applications, policies, and Entra audit data.",
    defaultEnabled: true,
    readOnly: true,
    permissions: [
      "Organization.Read.All",
      "Domain.Read.All",
      "LicenseAssignment.Read.All",
      "User.Read.All",
      "GroupMember.Read.All",
      "RoleManagement.Read.Directory",
      "Application.Read.All",
      "Policy.Read.All",
      "AuditLog.Read.All"
    ]
  },
  m365_security_read: {
    bundleKey: "m365_security_read",
    purpose: "Read Microsoft Secure Score and Defender XDR security incidents and alerts where licensed.",
    defaultEnabled: false,
    readOnly: true,
    permissions: ["SecurityEvents.Read.All", "SecurityIncident.Read.All", "SecurityAlert.Read.All"]
  },
  m365_intune_read: {
    bundleKey: "m365_intune_read",
    purpose: "Read Intune devices and configuration posture where licensed.",
    defaultEnabled: false,
    readOnly: true,
    permissions: ["DeviceManagementManagedDevices.Read.All", "DeviceManagementConfiguration.Read.All"]
  },
  m365_remediation_write: {
    bundleKey: "m365_remediation_write",
    purpose: "Future approval-gated Microsoft 365 remediation writes.",
    defaultEnabled: false,
    readOnly: false,
    permissions: ["User.ReadWrite.All", "Group.ReadWrite.All", "Application.ReadWrite.All"]
  },
  m365_defender_write: {
    bundleKey: "m365_defender_write",
    purpose: "Future approval-gated Defender incident updates.",
    defaultEnabled: false,
    readOnly: false,
    permissions: ["SecurityIncident.ReadWrite.All"]
  }
};

export interface Microsoft365ModuleRequirement {
  moduleKey: Microsoft365ModuleKey;
  permissionsRequired: string[];
  licenseRequired: string[];
  unsupportedNationalClouds?: Microsoft365CloudEnvironment[];
}

export const microsoft365ModuleRequirements: Record<Microsoft365ModuleKey, Microsoft365ModuleRequirement> = {
  "tenant-profile": {
    moduleKey: "tenant-profile",
    permissionsRequired: ["Organization.Read.All", "Domain.Read.All"],
    licenseRequired: []
  },
  licensing: {
    moduleKey: "licensing",
    permissionsRequired: ["LicenseAssignment.Read.All"],
    licenseRequired: []
  },
  "users-groups-roles": {
    moduleKey: "users-groups-roles",
    permissionsRequired: ["User.Read.All", "GroupMember.Read.All", "RoleManagement.Read.Directory"],
    licenseRequired: []
  },
  "mfa-registration": {
    moduleKey: "mfa-registration",
    permissionsRequired: ["AuditLog.Read.All"],
    licenseRequired: []
  },
  applications: {
    moduleKey: "applications",
    permissionsRequired: ["Application.Read.All"],
    licenseRequired: []
  },
  "conditional-access": {
    moduleKey: "conditional-access",
    permissionsRequired: ["Policy.Read.All"],
    licenseRequired: []
  },
  "entra-audit-logs": {
    moduleKey: "entra-audit-logs",
    permissionsRequired: ["AuditLog.Read.All"],
    licenseRequired: []
  },
  "entra-sign-in-logs": {
    moduleKey: "entra-sign-in-logs",
    permissionsRequired: ["AuditLog.Read.All", "Policy.Read.All"],
    licenseRequired: []
  },
  "secure-score": {
    moduleKey: "secure-score",
    permissionsRequired: ["SecurityEvents.Read.All"],
    licenseRequired: [],
    unsupportedNationalClouds: ["china"]
  },
  "intune-devices": {
    moduleKey: "intune-devices",
    permissionsRequired: ["DeviceManagementManagedDevices.Read.All"],
    licenseRequired: ["INTUNE_A"]
  },
  "defender-xdr": {
    moduleKey: "defender-xdr",
    permissionsRequired: ["SecurityIncident.Read.All", "SecurityAlert.Read.All"],
    licenseRequired: ["DEFENDER_XDR"],
    unsupportedNationalClouds: ["china"]
  }
};

const microsoft365AllBundleKeys = new Set<string>([
  ...microsoft365ReadPermissionBundles,
  ...microsoft365WritePermissionBundles
]);

export const assertMicrosoft365KnownBundles = (bundleKeys: readonly string[]): void => {
  const unsupported = bundleKeys.filter((bundleKey) => !microsoft365AllBundleKeys.has(bundleKey));
  if (unsupported.length > 0) {
    throw new ProviderConnectorError("microsoft365_unsupported_permission_bundle", "Unsupported Microsoft 365 bundle.", {
      unsupported
    });
  }
};

export const normalizeMicrosoft365RequestedBundles = (
  requestedPermissionBundles: readonly string[] | undefined
): Microsoft365PermissionBundleKey[] => {
  const requested = requestedPermissionBundles?.length ? requestedPermissionBundles : ["m365_read_baseline"];
  assertMicrosoft365KnownBundles(requested);

  const bundleKeys = new Set<Microsoft365PermissionBundleKey>();
  bundleKeys.add("m365_read_baseline");
  for (const bundleKey of requested) {
    bundleKeys.add(bundleKey as Microsoft365PermissionBundleKey);
  }

  return [...bundleKeys];
};

export const permissionsForMicrosoft365Bundles = (bundleKeys: readonly string[]): string[] => [
  ...new Set(bundleKeys.flatMap((bundleKey) => microsoft365PermissionBundles[bundleKey as Microsoft365PermissionBundleKey].permissions))
];

export const missingPermissions = (required: readonly string[], granted: readonly string[]): string[] => {
  const grantedSet = new Set(granted);
  return required.filter((permission) => !grantedSet.has(permission));
};
