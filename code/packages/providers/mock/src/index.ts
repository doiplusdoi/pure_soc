import { randomUUID } from "node:crypto";

import {
  assertReadOnlyProviderOperation,
  type CloudProviderConnector,
  type CompleteConnectionInput,
  type ConnectionRedirect,
  type ProviderCapabilityRecord,
  type ProviderConnectionRecord,
  type ProviderConnectionResult,
  type ProviderKey,
  type ProviderModuleSyncResult,
  type ProviderNormalizedResourceInput,
  type ProviderRawResourceInput,
  type ProviderRecommendationInput,
  type ProviderFindingInput,
  type SyncInput,
  type TenantProfileInput
} from "../../core/src/index";

export type MockProviderScenarioKey =
  | "healthy_tenant"
  | "missing_mfa"
  | "no_intune_license"
  | "risky_admin_roles"
  | "stale_guests"
  | "defender_incidents"
  | "missing_permissions"
  | "consent_revoked"
  | "paginated_users"
  | "throttled_graph";

interface MockPage {
  rawResources: Array<Omit<ProviderRawResourceInput, "organizationId" | "providerConnectionId" | "providerKey" | "syncRunId">>;
  normalizedResources: Array<
    Omit<ProviderNormalizedResourceInput, "organizationId" | "providerConnectionId" | "providerKey">
  >;
}

interface MockModuleScenario {
  moduleKey: string;
  status?: ProviderModuleSyncResult["status"];
  statusReason?: string;
  missingPermissions?: string[];
  missingLicenses?: string[];
  pages: MockPage[];
  findings?: Array<Omit<ProviderFindingInput, "organizationId" | "providerConnectionId" | "providerKey" | "moduleKey">>;
  recommendations?: Array<
    Omit<ProviderRecommendationInput, "organizationId" | "providerConnectionId" | "providerKey" | "moduleKey">
  >;
  throttleFailuresBeforeSuccess?: number;
}

interface MockScenario {
  key: MockProviderScenarioKey;
  displayName: string;
  externalTenantId: string;
  modules: MockModuleScenario[];
}

export interface CreateMockConnectorOptions {
  scenarioKey?: MockProviderScenarioKey;
  providerKey?: ProviderKey | string;
  now?: () => Date;
  idFactory?: () => string;
}

const raw = (
  externalResourceType: string,
  externalId: string,
  sourceModule: string,
  rawJson: Record<string, unknown>
): MockPage["rawResources"][number] => ({
  externalResourceType,
  externalId,
  sourceModule,
  rawJson
});

const normalized = (
  externalResourceType: string,
  externalId: string,
  resourceType: ProviderNormalizedResourceInput["resourceType"],
  sourceModule: string,
  normalizedJson: Record<string, unknown>
): MockPage["normalizedResources"][number] => ({
  externalResourceType,
  externalId,
  resourceType,
  sourceModule,
  normalizedJson
});

const tenantPage = (scenario: string): MockPage => ({
  rawResources: [
    raw("tenant", "tenant_mock_1", "tenant-profile", {
      id: "tenant_mock_1",
      displayName: `PureSOC Mock ${scenario}`,
      verifiedDomains: ["example.test"]
    })
  ],
  normalizedResources: [
    normalized("tenant", "tenant_mock_1", "cloud_tenant", "tenant-profile", {
      tenantId: "tenant_mock_1",
      displayName: `PureSOC Mock ${scenario}`,
      domains: ["example.test"]
    })
  ]
});

const licensePage = (hasIntune = true): MockPage => ({
  rawResources: [
    raw("license", hasIntune ? "sku_m365_e5" : "sku_m365_business_basic", "licensing", {
      skuPartNumber: hasIntune ? "ENTERPRISEPREMIUM" : "O365_BUSINESS_BASIC",
      servicePlans: hasIntune ? ["AAD_PREMIUM", "INTUNE_A"] : ["EXCHANGE_S_STANDARD"]
    })
  ],
  normalizedResources: [
    normalized("license", hasIntune ? "sku_m365_e5" : "sku_m365_business_basic", "cloud_license", "licensing", {
      skuPartNumber: hasIntune ? "ENTERPRISEPREMIUM" : "O365_BUSINESS_BASIC",
      servicePlans: hasIntune ? ["AAD_PREMIUM", "INTUNE_A"] : ["EXCHANGE_S_STANDARD"]
    })
  ]
});

const adminUserPage = (mfaEnabled: boolean): MockPage => ({
  rawResources: [
    raw("user", "admin_1", "identity-posture", {
      id: "admin_1",
      userPrincipalName: "admin@example.test",
      displayName: "Admin User",
      accountEnabled: true,
      userType: "member",
      mfaEnabled
    })
  ],
  normalizedResources: [
    normalized("user", "admin_1", "cloud_user", "identity-posture", {
      userPrincipalName: "admin@example.test",
      displayName: "Admin User",
      accountEnabled: true,
      userType: "member",
      mfaEnabled
    })
  ]
});

const scenarioModules = {
  healthy_tenant: [
    { moduleKey: "tenant-profile", pages: [tenantPage("healthy")] },
    { moduleKey: "licensing", pages: [licensePage(true)] },
    { moduleKey: "identity-posture", pages: [adminUserPage(true)] }
  ],
  missing_mfa: [
    { moduleKey: "tenant-profile", pages: [tenantPage("missing MFA")] },
    { moduleKey: "licensing", pages: [licensePage(true)] },
    {
      moduleKey: "identity-posture",
      pages: [adminUserPage(false)],
      findings: [
        {
          findingKey: "mock.identity.admin_mfa_missing.admin_1",
          title: "Admin account is missing MFA",
          summary: "A privileged user account does not have MFA enabled in the mock provider posture.",
          severity: "high",
          status: "open",
          resourceExternalId: "admin_1",
          resourceType: "cloud_user",
          evidence: {
            signalKey: "admin_mfa_missing",
            externalId: "admin_1"
          }
        }
      ],
      recommendations: [
        {
          sourceFindingKey: "mock.identity.admin_mfa_missing.admin_1",
          controlId: "nis2.access-control.mfa",
          jurisdiction: "EU",
          title: "Enable MFA for privileged users",
          summary: "Require phishing-resistant or strong MFA for privileged accounts before marking the control ready.",
          severity: "high",
          confidence: "high",
          recommendationType: "technical",
          automationMode: "guided",
          requiredPermissions: ["Directory.Read.All"],
          requiredLicense: [],
          expectedChange: "Privileged accounts are covered by MFA policy.",
          blastRadius: "Privileged user sign-in experience changes.",
          manualFallback: "Document a manual MFA rollout task and upload evidence.",
          evidenceRequired: true
        }
      ]
    }
  ],
  no_intune_license: [
    { moduleKey: "tenant-profile", pages: [tenantPage("without Intune")] },
    { moduleKey: "licensing", pages: [licensePage(false)] },
    {
      moduleKey: "intune-devices",
      status: "unavailable_license",
      statusReason: "Intune service plan was not detected in the mock license set.",
      missingLicenses: ["INTUNE_A"],
      pages: []
    }
  ],
  risky_admin_roles: [
    { moduleKey: "tenant-profile", pages: [tenantPage("risky roles")] },
    {
      moduleKey: "identity-posture",
      pages: [
        {
          rawResources: [
            raw("admin_role", "role_global_admin", "identity-posture", {
              id: "role_global_admin",
              displayName: "Global Administrator",
              assignedPrincipalIds: ["admin_1", "admin_2", "admin_3", "admin_4"]
            })
          ],
          normalizedResources: [
            normalized("admin_role", "role_global_admin", "cloud_admin_role", "identity-posture", {
              roleName: "Global Administrator",
              assignedPrincipalIds: ["admin_1", "admin_2", "admin_3", "admin_4"],
              privileged: true
            })
          ]
        }
      ],
      findings: [
        {
          findingKey: "mock.identity.too_many_global_admins",
          title: "Too many global administrators",
          summary: "The mock tenant has more privileged administrators than the baseline expects.",
          severity: "medium",
          resourceExternalId: "role_global_admin",
          resourceType: "cloud_admin_role",
          evidence: { assignedPrincipalCount: 4 }
        }
      ],
      recommendations: [
        {
          sourceFindingKey: "mock.identity.too_many_global_admins",
          jurisdiction: "EU",
          title: "Review privileged role assignments",
          summary: "Review role assignments and document privileged access governance.",
          severity: "medium",
          confidence: "medium",
          recommendationType: "guided",
          automationMode: "manual",
          requiredPermissions: ["RoleManagement.Read.Directory"],
          requiredLicense: [],
          evidenceRequired: true
        }
      ]
    }
  ],
  stale_guests: [
    { moduleKey: "tenant-profile", pages: [tenantPage("stale guests")] },
    {
      moduleKey: "identity-posture",
      pages: [
        {
          rawResources: [
            raw("user", "guest_1", "identity-posture", {
              id: "guest_1",
              userPrincipalName: "guest_example.test#EXT#@example.test",
              userType: "guest",
              lastSignInDateTime: "2025-01-10T00:00:00.000Z"
            })
          ],
          normalizedResources: [
            normalized("user", "guest_1", "cloud_user", "identity-posture", {
              userPrincipalName: "guest_example.test#EXT#@example.test",
              displayName: "Guest User",
              accountEnabled: true,
              userType: "guest",
              lastSignInAt: "2025-01-10T00:00:00.000Z"
            })
          ]
        }
      ],
      findings: [
        {
          findingKey: "mock.identity.stale_guest.guest_1",
          title: "Stale guest account",
          summary: "A guest account has not signed in recently and should be reviewed.",
          severity: "low",
          resourceExternalId: "guest_1",
          resourceType: "cloud_user",
          evidence: { lastSignInAt: "2025-01-10T00:00:00.000Z" }
        }
      ],
      recommendations: [
        {
          sourceFindingKey: "mock.identity.stale_guest.guest_1",
          jurisdiction: "EU",
          title: "Review stale guest access",
          summary: "Run a guest access review and retain the review evidence.",
          severity: "low",
          confidence: "medium",
          recommendationType: "process",
          automationMode: "manual",
          requiredPermissions: ["User.Read.All"],
          requiredLicense: [],
          evidenceRequired: true
        }
      ]
    }
  ],
  defender_incidents: [
    { moduleKey: "tenant-profile", pages: [tenantPage("Defender incidents")] },
    {
      moduleKey: "defender-xdr",
      pages: [
        {
          rawResources: [
            raw("incident", "incident_1", "defender-xdr", {
              id: "incident_1",
              title: "Mock high severity incident",
              severity: "high",
              status: "active"
            })
          ],
          normalizedResources: [
            normalized("incident", "incident_1", "cloud_incident", "defender-xdr", {
              title: "Mock high severity incident",
              severity: "high",
              status: "active"
            })
          ]
        }
      ],
      findings: [
        {
          findingKey: "mock.defender.high_incident.incident_1",
          title: "Open high severity incident",
          summary: "The mock Defender feed contains an active high severity incident.",
          severity: "high",
          resourceExternalId: "incident_1",
          resourceType: "cloud_incident",
          evidence: { incidentId: "incident_1" }
        }
      ],
      recommendations: [
        {
          sourceFindingKey: "mock.defender.high_incident.incident_1",
          jurisdiction: "EU",
          title: "Triage high severity incident",
          summary: "Use the incident handling checklist and upload triage evidence.",
          severity: "high",
          confidence: "high",
          recommendationType: "incident_reporting",
          automationMode: "manual",
          requiredPermissions: ["SecurityIncident.Read.All"],
          requiredLicense: ["DEFENDER_XDR"],
          evidenceRequired: true
        }
      ]
    }
  ],
  missing_permissions: [
    { moduleKey: "tenant-profile", pages: [tenantPage("missing permissions")] },
    {
      moduleKey: "secure-score",
      status: "missing_permission",
      statusReason: "Security score read permission was not granted in the mock consent bundle.",
      missingPermissions: ["SecurityEvents.Read.All"],
      pages: []
    }
  ],
  consent_revoked: [
    {
      moduleKey: "tenant-profile",
      status: "revoked_consent",
      statusReason: "Mock provider consent was revoked.",
      pages: []
    }
  ],
  paginated_users: [
    { moduleKey: "tenant-profile", pages: [tenantPage("paginated users")] },
    {
      moduleKey: "identity-posture",
      pages: [
        {
          rawResources: [
            raw("user", "user_page_1", "identity-posture", {
              id: "user_page_1",
              userPrincipalName: "page1@example.test",
              displayName: "Page One"
            })
          ],
          normalizedResources: [
            normalized("user", "user_page_1", "cloud_user", "identity-posture", {
              userPrincipalName: "page1@example.test",
              displayName: "Page One",
              accountEnabled: true,
              userType: "member"
            })
          ]
        },
        {
          rawResources: [
            raw("user", "user_page_2", "identity-posture", {
              id: "user_page_2",
              userPrincipalName: "page2@example.test",
              displayName: "Page Two"
            })
          ],
          normalizedResources: [
            normalized("user", "user_page_2", "cloud_user", "identity-posture", {
              userPrincipalName: "page2@example.test",
              displayName: "Page Two",
              accountEnabled: true,
              userType: "member"
            })
          ]
        }
      ]
    }
  ],
  throttled_graph: [
    { moduleKey: "tenant-profile", pages: [tenantPage("throttled")] },
    {
      moduleKey: "identity-posture",
      throttleFailuresBeforeSuccess: 2,
      pages: [adminUserPage(true)]
    }
  ]
} satisfies Record<MockProviderScenarioKey, MockModuleScenario[]>;

const scenarios: Record<MockProviderScenarioKey, MockScenario> = Object.fromEntries(
  (Object.keys(scenarioModules) as MockProviderScenarioKey[]).map((key) => [
    key,
    {
      key,
      displayName: key
        .split("_")
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(" "),
      externalTenantId: `mock_${key}`,
      modules: scenarioModules[key]
    }
  ])
) as Record<MockProviderScenarioKey, MockScenario>;

export const mockProviderScenarioKeys = Object.keys(scenarios) as MockProviderScenarioKey[];

export const getMockProviderScenario = (scenarioKey: MockProviderScenarioKey = "healthy_tenant"): MockScenario =>
  scenarios[scenarioKey];

export const createMockConnector = (options: CreateMockConnectorOptions = {}): CloudProviderConnector => {
  const scenario = getMockProviderScenario(options.scenarioKey);
  const providerKey = options.providerKey ?? "mock";
  const now = options.now ?? (() => new Date());
  const idFactory = options.idFactory ?? randomUUID;

  const connectionFor = (input: { organizationId: string }): ProviderConnectionRecord => ({
    id: idFactory(),
    organizationId: input.organizationId,
    providerKey,
    displayName: `Mock provider: ${scenario.displayName}`,
    externalTenantId: scenario.externalTenantId,
    externalTenantName: scenario.displayName,
    status: scenario.key === "consent_revoked" ? "revoked" : "connected",
    readEnabled: true,
    writeEnabled: false,
    metadata: {
      scenarioKey: scenario.key
    },
    createdAt: now().toISOString(),
    updatedAt: now().toISOString()
  });

  const capabilityFor = (input: { organizationId: string; providerConnectionId: string }): ProviderCapabilityRecord[] =>
    scenario.modules.map((module) => ({
      id: idFactory(),
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      providerKey,
      moduleKey: module.moduleKey,
      capabilityKey: `${module.moduleKey}.read`,
      available: (module.status ?? "succeeded") === "succeeded",
      licenseRequired: module.missingLicenses ?? [],
      licenseDetected: module.missingLicenses?.length ? [] : module.missingLicenses ?? [],
      permissionsRequired: module.missingPermissions ?? [],
      permissionsGranted: module.missingPermissions?.length ? [] : module.missingPermissions ?? [],
      status: module.status ?? "succeeded",
      statusReason: module.statusReason,
      updatedAt: now().toISOString()
    }));

  return {
    providerKey,
    beginConnection: async (input): Promise<ConnectionRedirect> => ({
      url: `https://mock.puresoc.local/consent/${scenario.key}?state=${encodeURIComponent(input.state)}`,
      state: input.state,
      expiresAt: new Date(now().getTime() + 10 * 60_000).toISOString()
    }),
    completeConnection: async (input: CompleteConnectionInput): Promise<ProviderConnectionResult> => {
      const connection = connectionFor(input);
      return {
        connection,
        grantedPermissionBundles: ["mock_read_baseline"],
        capabilities: capabilityFor({
          organizationId: input.organizationId,
          providerConnectionId: connection.id
        }),
        tenantProfile: await buildTenantProfile({
          organizationId: input.organizationId,
          providerConnectionId: connection.id
        })
      };
    },
    getTenantProfile: buildTenantProfile,
    syncReadOnlyModules: async (input: SyncInput): Promise<ProviderModuleSyncResult[]> => {
      assertReadOnlyProviderOperation({
        operation: "mock_sync",
        allowProviderWrites: input.allowProviderWrites,
        providerKey
      });

      const requested = new Set(input.requestedModules ?? scenario.modules.map((module) => module.moduleKey));
      return scenario.modules
        .filter((module) => requested.has(module.moduleKey))
        .map((module) => buildModuleResult(module, input, providerKey));
    },
    evaluateControls: async () => [],
    getRecommendedActions: async () => []
  };

  async function buildTenantProfile(input: TenantProfileInput) {
    return {
      id: idFactory(),
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      providerKey,
      externalId: scenario.externalTenantId,
      externalResourceType: "tenant",
      rawResourceId: undefined,
      resourceType: "cloud_tenant" as const,
      sourceModule: "tenant-profile",
      normalizedJson: {
        tenantId: scenario.externalTenantId,
        displayName: scenario.displayName,
        domains: ["example.test"]
      },
      contentHash: scenario.externalTenantId,
      firstSeenAt: now().toISOString(),
      lastSeenAt: now().toISOString()
    };
  }
};

const buildModuleResult = (
  module: MockModuleScenario,
  input: SyncInput,
  providerKey: ProviderKey | string
): ProviderModuleSyncResult => {
  const maxRetries = input.maxRetries ?? 3;
  const throttleFailures = module.throttleFailuresBeforeSuccess ?? 0;
  const retryCount = Math.min(throttleFailures, maxRetries);

  if (throttleFailures > maxRetries) {
    return {
      moduleKey: module.moduleKey,
      status: "rate_limited",
      missingPermissions: module.missingPermissions ?? [],
      missingLicenses: module.missingLicenses ?? [],
      statusReason: "Mock provider throttling exceeded the configured retry budget.",
      rawResources: [],
      normalizedResources: [],
      findings: [],
      recommendations: [],
      pagesRead: 0,
      retryCount
    };
  }

  const rawResources = module.pages.flatMap((page) =>
    page.rawResources.map((resource) => ({
      ...resource,
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      providerKey,
      syncRunId: input.syncRunId
    }))
  );
  const normalizedResources = module.pages.flatMap((page) =>
    page.normalizedResources.map((resource) => ({
      ...resource,
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      providerKey,
      syncRunId: input.syncRunId
    }))
  );

  return {
    moduleKey: module.moduleKey,
    status: module.status ?? "succeeded",
    missingPermissions: module.missingPermissions ?? [],
    missingLicenses: module.missingLicenses ?? [],
    statusReason: module.statusReason,
    rawResources,
    normalizedResources,
    findings: (module.findings ?? []).map((finding) => ({
      ...finding,
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      providerKey,
      moduleKey: module.moduleKey,
      syncRunId: input.syncRunId
    })),
    recommendations: (module.recommendations ?? []).map((recommendation) => ({
      ...recommendation,
      organizationId: input.organizationId,
      providerConnectionId: input.providerConnectionId,
      providerKey,
      moduleKey: module.moduleKey
    })),
    pagesRead: module.pages.length,
    retryCount
  };
};
