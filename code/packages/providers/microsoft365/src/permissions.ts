import { ProviderConnectorError } from "@puresoc/providers-core";

export const microsoft365ProviderKey = "microsoft365";

export const microsoft365ReadModules = [
  "tenant-profile",
  "licensing",
  "users-groups-roles",
  "applications",
  "secure-score",
  "intune-devices",
  "defender-xdr"
] as const;

export const microsoft365DefaultReadModules = [
  "tenant-profile",
  "licensing",
  "users-groups-roles",
  "applications",
  "secure-score"
] as const;

export type Microsoft365ModuleKey = (typeof microsoft365ReadModules)[number];

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
    purpose: "Read tenant profile, domains, licenses, users, groups, roles, and applications.",
    defaultEnabled: true,
    readOnly: true,
    permissions: [
      "Organization.Read.All",
      "Domain.Read.All",
      "LicenseAssignment.Read.All",
      "User.Read.All",
      "GroupMember.Read.All",
      "RoleManagement.Read.Directory",
      "Application.Read.All"
    ]
  },
  m365_security_read: {
    bundleKey: "m365_security_read",
    purpose: "Read Microsoft Secure Score and Defender XDR security incidents where licensed.",
    defaultEnabled: false,
    readOnly: true,
    permissions: ["SecurityEvents.Read.All", "SecurityIncident.Read.All"]
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
  applications: {
    moduleKey: "applications",
    permissionsRequired: ["Application.Read.All"],
    licenseRequired: []
  },
  "secure-score": {
    moduleKey: "secure-score",
    permissionsRequired: ["SecurityEvents.Read.All"],
    licenseRequired: []
  },
  "intune-devices": {
    moduleKey: "intune-devices",
    permissionsRequired: ["DeviceManagementManagedDevices.Read.All"],
    licenseRequired: ["INTUNE_A"]
  },
  "defender-xdr": {
    moduleKey: "defender-xdr",
    permissionsRequired: ["SecurityIncident.Read.All"],
    licenseRequired: ["DEFENDER_XDR"]
  }
};

const microsoft365ReadBundleKeys = new Set<string>(microsoft365ReadPermissionBundles);
const microsoft365AllBundleKeys = new Set<string>([
  ...microsoft365ReadPermissionBundles,
  ...microsoft365WritePermissionBundles
]);

export const assertMicrosoft365ReadOnlyBundles = (bundleKeys: readonly string[]): void => {
  const unsupported = bundleKeys.filter((bundleKey) => !microsoft365AllBundleKeys.has(bundleKey));
  if (unsupported.length > 0) {
    throw new ProviderConnectorError("microsoft365_unsupported_permission_bundle", "Unsupported Microsoft 365 bundle.", {
      unsupported
    });
  }

  const writeBundles = bundleKeys.filter((bundleKey) => !microsoft365ReadBundleKeys.has(bundleKey));
  if (writeBundles.length > 0) {
    throw new ProviderConnectorError(
      "microsoft365_write_bundle_disabled",
      "Microsoft 365 write permission bundles are disabled during first onboarding.",
      { writeBundles }
    );
  }
};

export const normalizeMicrosoft365RequestedBundles = (
  requestedPermissionBundles: readonly string[] | undefined
): Microsoft365ReadPermissionBundleKey[] => {
  const requested = requestedPermissionBundles?.length ? requestedPermissionBundles : ["m365_read_baseline"];
  assertMicrosoft365ReadOnlyBundles(requested);

  const bundleKeys = new Set<Microsoft365ReadPermissionBundleKey>();
  bundleKeys.add("m365_read_baseline");
  for (const bundleKey of requested) {
    bundleKeys.add(bundleKey as Microsoft365ReadPermissionBundleKey);
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
