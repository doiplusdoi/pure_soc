import { describe, expect, it } from "vitest";

import { getMicrosoft365ExternalSmokeReadinessMetadata } from "../index";

describe("Microsoft 365 external smoke readiness metadata", () => {
  it("exposes read-only module and permission metadata without enabling write bundles", () => {
    const metadata = getMicrosoft365ExternalSmokeReadinessMetadata();

    expect(metadata).toMatchObject({
      schemaVersion: "puresoc.microsoft365.external_smoke_readiness_metadata.v1",
      providerKey: "microsoft365",
      writePermissionBundlesDisabled: ["m365_remediation_write", "m365_defender_write"]
    });
    expect(metadata.readPermissionBundles.map((bundle) => bundle.bundleKey)).toEqual([
      "m365_read_baseline",
      "m365_security_read",
      "m365_intune_read"
    ]);
    expect(metadata.readPermissionBundles.every((bundle) => bundle.readOnly)).toBe(true);
    expect(metadata.readModules.map((module) => module.moduleKey)).toContain("defender-xdr");
    expect(metadata.readModules.find((module) => module.moduleKey === "defender-xdr")).toMatchObject({
      permissionsRequired: ["SecurityIncident.Read.All", "SecurityAlert.Read.All"],
      licenseRequired: ["DEFENDER_XDR"],
      unsupportedNationalClouds: ["china"]
    });
  });
});
