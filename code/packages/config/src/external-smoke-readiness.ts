import type { PureSocConfig, StartupConfigValidationIssue } from "./index";

export const externalSmokeReadinessSchemaVersion = "puresoc.external_smoke_readiness.v1" as const;
export const externalSmokeTargetSelectionSchemaVersion = "puresoc.external_smoke_target_selection.v1" as const;

export const externalSmokeReadinessStatuses = [
  "not_configured",
  "configured_dry_run_only",
  "ready_for_disposable_smoke",
  "blocked_missing_secret",
  "unsafe_production_target"
] as const;

export type ExternalSmokeReadinessStatus = (typeof externalSmokeReadinessStatuses)[number];

export type ExternalSmokeReadinessMode = "dry_run" | "live_candidate";

export type ExternalSmokeTargetKind =
  | "local"
  | "development"
  | "test"
  | "ci"
  | "disposable"
  | "staging"
  | "customer"
  | "production"
  | "unknown";

export type ExternalSmokeReadinessArea =
  | "auth_deployment"
  | "microsoft365"
  | "provider_token_custody"
  | "stripe"
  | "oidc_social_login"
  | "object_storage_scanner"
  | "evidence_reports";

export type ExternalSmokeTargetSelectionPathId =
  | "auth_deployment_browser"
  | "microsoft365_read_only_tenant"
  | "stripe_test_mode_billing"
  | "oidc_microsoft_entra_callback"
  | "oidc_google_callback"
  | "oidc_github_callback"
  | "evidence_runtime"
  | "provider_token_custody_deployment";

export type ExternalSmokeTargetSelectionOutcome =
  | "ready_path_selected"
  | "no_ready_path"
  | "unsafe_target_blocked";

export type ExternalSmokeDeploymentEndpointClass =
  | "empty"
  | "local_loopback"
  | "local_name"
  | "test_hint"
  | "public_unknown"
  | "production_like"
  | "staging_like"
  | "customer_like"
  | "non_tls_non_local"
  | "invalid";

export interface ExternalSmokeEnvironmentRequirement {
  label: string;
  env: string[];
  sensitive: boolean;
  requiredFor: "configuration" | "secret" | "disposable_smoke";
  configured: boolean;
}

export interface ExternalSmokeGuardrail {
  id: string;
  status: "satisfied" | "required" | "unsafe" | "not_applicable";
  summary: string;
  env?: string[];
}

export interface ExternalSmokeReadinessCheck {
  id: string;
  area: ExternalSmokeReadinessArea;
  label: string;
  status: ExternalSmokeReadinessStatus;
  summary: string;
  liveNetworkCalls: false;
  secretValuesReturned: false;
  requiredEnvironment: ExternalSmokeEnvironmentRequirement[];
  configuredEnvironmentVariables: string[];
  blockers: string[];
  guardrails: ExternalSmokeGuardrail[];
  metadata: Record<string, unknown>;
}

export interface Microsoft365ReadinessMetadata {
  schemaVersion: string;
  providerKey: "microsoft365";
  readPermissionBundles: Array<{
    bundleKey: string;
    purpose: string;
    permissions: string[];
    defaultEnabled: boolean;
    readOnly: true;
  }>;
  writePermissionBundlesDisabled: string[];
  readModules: Array<{
    moduleKey: string;
    permissionsRequired: string[];
    licenseRequired: string[];
    unsupportedNationalClouds?: string[];
  }>;
  deferredReadModules: string[];
  providerTokenCustody?: {
    schemaVersion: string;
    targetKinds: string[];
    implementedRealCustodyProviders: string[];
    testOnlyCustodyProviders: string[];
    deferredExternalCustodyProviders: string[];
    requiredEnvironmentVariables: string[];
    previousKeyConfirmationVariables: string[];
    guarantees: Record<string, boolean>;
  };
}

export interface ExternalSmokeReadinessMetadata {
  microsoft365?: Microsoft365ReadinessMetadata;
}

export interface ExternalSmokeReadinessReport {
  schemaVersion: typeof externalSmokeReadinessSchemaVersion;
  command: "pnpm external-smoke:readiness";
  mode: ExternalSmokeReadinessMode;
  dryRunDefault: true;
  liveNetworkCalls: false;
  target: {
    kind: ExternalSmokeTargetKind;
    disposableConfirmation: boolean;
  };
  guarantees: {
    noLiveNetworkCallsByDefault: true;
    providerWritesEnabled: false;
    secretValuesReturned: false;
    storagePointersReturned: false;
  };
  startupValidationIssueCodes: string[];
  summary: Record<ExternalSmokeReadinessStatus, number>;
  checks: ExternalSmokeReadinessCheck[];
  targetSelection: ExternalSmokeTargetSelection;
  nextOperatorActions: string[];
}

export interface ExternalSmokeTargetSelectionCandidate {
  pathId: ExternalSmokeTargetSelectionPathId;
  rank: number;
  label: string;
  command: string;
  commandEnvironment: string[];
  checkIds: string[];
  areas: ExternalSmokeReadinessArea[];
  status: ExternalSmokeReadinessStatus;
  selected: boolean;
  selectable: boolean;
  liveExecutionRequiresDisposableApproval: true;
  liveNetworkCallsByDefault: false;
  providerWritesEnabled: false;
  secretValuesReturned: false;
  endpointValuesReturned: false;
  configuredEnvironmentVariables: string[];
  requiredEnvironmentVariables: string[];
  blockerCodes: string[];
  reasonCodes: string[];
  guardrails: Array<{
    checkId: string;
    id: string;
    status: ExternalSmokeGuardrail["status"];
    env?: string[];
  }>;
  summary: string;
}

export interface ExternalSmokeTargetSelection {
  schemaVersion: typeof externalSmokeTargetSelectionSchemaVersion;
  mode: ExternalSmokeReadinessMode;
  target: {
    kind: ExternalSmokeTargetKind;
    disposableConfirmation: boolean;
    approvedForLiveCandidate: boolean;
  };
  outcome: ExternalSmokeTargetSelectionOutcome;
  selectedPathId: ExternalSmokeTargetSelectionPathId | null;
  selectedCommand: string | null;
  selectedCommandEnvironment: string[];
  selectedCheckIds: string[];
  recommendation: string;
  readyCandidateCount: number;
  candidateCount: number;
  rankedCandidates: ExternalSmokeTargetSelectionCandidate[];
  guarantees: {
    metadataOnly: true;
    noLiveNetworkCallsByDefault: true;
    providerWritesEnabled: false;
    secretValuesReturned: false;
    endpointValuesReturned: false;
    exactlyOneReadyPathSelected: boolean;
  };
}

export interface CreateExternalSmokeReadinessReportInput {
  config: PureSocConfig;
  env?: NodeJS.ProcessEnv;
  startupValidationIssues?: StartupConfigValidationIssue[];
  metadata?: ExternalSmokeReadinessMetadata;
}

interface StatusInput {
  configured: boolean;
  missing: string[];
  unsafe: string[];
  optInEnv: string;
  mode: ExternalSmokeReadinessMode;
  targetReady: boolean;
  optInReady: boolean;
}

const globalConfirmationEnv = "PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE";
const targetKindEnv = "PURESOC_EXTERNAL_SMOKE_TARGET_KIND";
const modeEnv = "PURESOC_EXTERNAL_SMOKE_MODE";

export const createExternalSmokeReadinessReport = (
  input: CreateExternalSmokeReadinessReportInput
): ExternalSmokeReadinessReport => {
  const env = input.env ?? process.env;
  const mode = env.PURESOC_EXTERNAL_SMOKE_MODE === "live_candidate" ? "live_candidate" : "dry_run";
  const targetKind = normalizeTargetKind(env.PURESOC_EXTERNAL_SMOKE_TARGET_KIND);
  const disposableConfirmation = readBoolean(env.PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE);
  const targetReady = isSafeDisposableTarget(targetKind) && disposableConfirmation;
  const startupValidationIssueCodes = [...new Set((input.startupValidationIssues ?? []).map((issue) => issue.code))].sort();
  const globalUnsafe = globalUnsafeReasons(input.config, targetKind);

  const checks = [
    authDeploymentCheck(input.config, env, mode, targetReady, globalUnsafe),
    microsoft365Check(input.config, env, mode, targetReady, globalUnsafe, input.metadata?.microsoft365),
    providerTokenCustodyCheck(input.config, env, startupValidationIssueCodes, input.metadata?.microsoft365),
    stripeCheck(input.config, env, mode, targetReady, globalUnsafe),
    ...oidcChecks(input.config, env, mode, targetReady, globalUnsafe, startupValidationIssueCodes),
    objectStorageScannerCheck(input.config, env, mode, targetReady, globalUnsafe),
    evidenceReportsCheck(input.config, env, mode, targetReady, globalUnsafe)
  ];
  const targetSelection = createExternalSmokeTargetSelection({
    checks,
    mode,
    targetKind,
    disposableConfirmation
  });

  return {
    schemaVersion: externalSmokeReadinessSchemaVersion,
    command: "pnpm external-smoke:readiness",
    mode,
    dryRunDefault: true,
    liveNetworkCalls: false,
    target: {
      kind: targetKind,
      disposableConfirmation
    },
    guarantees: {
      noLiveNetworkCallsByDefault: true,
      providerWritesEnabled: false,
      secretValuesReturned: false,
      storagePointersReturned: false
    },
    startupValidationIssueCodes,
    summary: summarize(checks),
    checks,
    targetSelection,
    nextOperatorActions: nextOperatorActions(checks, mode, targetKind, disposableConfirmation, targetSelection)
  };
};

const authDeploymentCheck = (
  config: PureSocConfig,
  env: NodeJS.ProcessEnv,
  mode: ExternalSmokeReadinessMode,
  targetReady: boolean,
  globalUnsafe: string[]
): ExternalSmokeReadinessCheck => {
  const baseUrl = env.PURESOC_AUTH_DEPLOYMENT_SMOKE_BASE_URL ?? "";
  const trustedOrigin = env.PURESOC_AUTH_DEPLOYMENT_SMOKE_TRUSTED_ORIGIN ?? "";
  const baseUrlClass = classifyExternalSmokeDeploymentEndpoint(baseUrl);
  const trustedOriginClass = classifyExternalSmokeDeploymentEndpoint(trustedOrigin);
  const optInEnv = "PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT";
  const requirements = [
    requirement("Auth deployment smoke base URL", ["PURESOC_AUTH_DEPLOYMENT_SMOKE_BASE_URL"], env, false, "configuration"),
    requirement(
      "Auth deployment trusted browser Origin",
      ["PURESOC_AUTH_DEPLOYMENT_SMOKE_TRUSTED_ORIGIN"],
      env,
      false,
      "configuration"
    )
  ];
  const configured =
    requirements.some((entry) => entry.configured) || readBoolean(env[optInEnv]) || mode === "live_candidate";
  const missing = configured
    ? [
        ...missingRequirementCodes(requirements),
        ...(config.auth.localEnabled ? [] : ["auth_local_login_disabled"]),
        ...(config.api.security.originProtection.enabled ? [] : ["origin_protection_disabled"]),
        ...(config.api.rateLimits.enabled ? [] : ["api_rate_limits_disabled"]),
        ...(config.api.security.originProtection.exemptRouteFamilies.includes("oidc_callback")
          ? []
          : ["oidc_callback_origin_exemption_missing"]),
        ...(config.api.security.originProtection.exemptRouteFamilies.includes("provider_callback")
          ? []
          : ["provider_callback_origin_exemption_missing"])
      ]
    : [];
  const endpointUnsafe = configured
    ? [
        ...deploymentEndpointUnsafeReasons("base_url", baseUrlClass),
        ...deploymentEndpointUnsafeReasons("trusted_origin", trustedOriginClass),
        ...(requiresSecureCookieForDeploymentEndpoint(baseUrl) && !config.auth.sessionCookieSecure
          ? ["auth_deployment_secure_cookie_not_enabled_for_tls_target"]
          : [])
      ]
    : [];
  const unsafe = configured ? [...globalUnsafe, ...endpointUnsafe] : [];
  const status = statusFor({
    configured,
    missing,
    unsafe,
    optInEnv,
    mode,
    targetReady,
    optInReady: readBoolean(env[optInEnv])
  });

  return check({
    id: "auth_deployment_browser",
    area: "auth_deployment",
    label: "Deployed browser/TLS/proxy auth smoke",
    status,
    configuredEnvironmentVariables: configuredEnvNames(requirements, env),
    requiredEnvironment: requirements,
    blockers: [...missing, ...unsafe],
    guardrails: liveGuardrails(mode, targetReady, env, optInEnv, unsafe),
    summary:
      status === "not_configured"
        ? "Auth deployment smoke target is not configured."
        : "Reports deployed auth, cookie, Origin, callback-exemption, proxy-header, and RBAC smoke prerequisites without contacting a target by default.",
    metadata: {
      baseUrlClass,
      trustedOriginClass,
      localAuthEnabled: config.auth.localEnabled,
      sessionCookieSecureConfigured: config.auth.sessionCookieSecure,
      originProtectionEnabled: config.api.security.originProtection.enabled,
      requireOriginOrReferer: config.api.security.originProtection.requireOriginOrReferer,
      trustedOriginCount: config.api.security.trustedOrigins.length,
      callbackExemptRouteFamilies: {
        oidcCallback: config.api.security.originProtection.exemptRouteFamilies.includes("oidc_callback"),
        providerCallback: config.api.security.originProtection.exemptRouteFamilies.includes("provider_callback"),
        webhook: config.api.security.originProtection.exemptRouteFamilies.includes("webhook")
      },
      rateLimitEnabled: config.api.rateLimits.enabled,
      rateLimitFamiliesConfigured: Object.keys(config.api.rateLimits.routeFamilies).sort(),
      endpointValuesReturned: false,
      sessionCookieValuesReturned: false
    }
  });
};

const microsoft365Check = (
  config: PureSocConfig,
  env: NodeJS.ProcessEnv,
  mode: ExternalSmokeReadinessMode,
  targetReady: boolean,
  globalUnsafe: string[],
  metadata?: Microsoft365ReadinessMetadata
): ExternalSmokeReadinessCheck => {
  const requirements = [
    requirement("Microsoft 365 client ID", ["MICROSOFT365_CLIENT_ID", "M365_CLIENT_ID"], env, false, "configuration"),
    requirement("Microsoft 365 client secret", ["MICROSOFT365_CLIENT_SECRET", "M365_CLIENT_SECRET"], env, true, "secret"),
    requirement("Microsoft 365 test tenant ID", ["PURESOC_MICROSOFT365_SMOKE_TENANT_ID", "MICROSOFT365_TENANT_ID", "M365_TENANT_ID"], env, false, "configuration")
  ];
  const missing = missingRequirementCodes(requirements);
  const unsafe = [
    ...globalUnsafe,
    ...(config.connectors.readOnlyByDefault ? [] : ["connector_read_only_default_disabled"]),
    ...(config.connectors.microsoft365.writeScopesAllowed ? ["microsoft365_write_scopes_allowed"] : []),
    ...(config.jobs.connectorRunner.allowProviderWrites ? ["provider_write_jobs_enabled"] : [])
  ];
  const optInEnv = "PURESOC_EXTERNAL_SMOKE_MICROSOFT365";
  const status = statusFor({
    configured: config.connectors.microsoft365.enabled,
    missing,
    unsafe,
    optInEnv,
    mode,
    targetReady,
    optInReady: readBoolean(env[optInEnv])
  });

  return check({
    id: "microsoft365_read_only_tenant",
    area: "microsoft365",
    label: "Microsoft 365 read-only tenant smoke",
    status,
    configuredEnvironmentVariables: configuredEnvNames(requirements, env),
    requiredEnvironment: requirements,
    blockers: [...missing, ...unsafe],
    guardrails: liveGuardrails(mode, targetReady, env, optInEnv, unsafe),
    summary:
      status === "ready_for_disposable_smoke"
        ? "Read-only Microsoft 365 prerequisites are present for an explicitly confirmed disposable smoke."
        : "Reports Microsoft 365 read-only tenant-smoke prerequisites without calling Microsoft Graph.",
    metadata: {
      providerKey: "microsoft365",
      connectorEnabled: config.connectors.microsoft365.enabled,
      readOnlyByDefault: config.connectors.readOnlyByDefault,
      writeScopesAllowed: config.connectors.microsoft365.writeScopesAllowed,
      defaultSmokeMode: "metadata_only_no_graph_calls",
      permissionMetadata: metadata ?? null
    }
  });
};

const providerTokenCustodyCheck = (
  config: PureSocConfig,
  env: NodeJS.ProcessEnv,
  startupValidationIssueCodes: string[],
  metadata?: Microsoft365ReadinessMetadata
): ExternalSmokeReadinessCheck => {
  const requirements = [
    requirement(
      "Provider-token custody target kind",
      ["PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND"],
      env,
      false,
      "configuration"
    ),
    requirement("Provider-token custody provider", ["PURESOC_PROVIDER_TOKEN_KEY_PROVIDER"], env, false, "configuration"),
    requirement("Provider-token active key ID", ["PURESOC_PROVIDER_TOKEN_KEY_ID"], env, false, "configuration"),
    requirement("Provider-token active key material", ["PURESOC_PROVIDER_TOKEN_KEY", "PROVIDER_TOKEN_KEY"], env, true, "secret"),
    requirement("Provider-token previous keys", ["PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS"], env, true, "secret")
  ];
  const targetKind = normalizeProviderTokenCustodyTargetKind(env.PURESOC_PROVIDER_TOKEN_CUSTODY_TARGET_KIND);
  const previousKeyCount = config.connectors.providerTokenEncryptionPreviousKeys.length;
  const previousKeyConfirmations = [
    {
      code: "provider_token_previous_key_window_unconfirmed",
      env: "PURESOC_PROVIDER_TOKEN_PREVIOUS_KEY_WINDOW_CONFIRMED"
    },
    {
      code: "provider_token_backfill_plan_unconfirmed",
      env: "PURESOC_PROVIDER_TOKEN_BACKFILL_PLAN_CONFIRMED"
    },
    {
      code: "provider_token_key_retirement_plan_unconfirmed",
      env: "PURESOC_PROVIDER_TOKEN_KEY_RETIREMENT_PLAN_CONFIRMED"
    }
  ];
  const providerTokenStartupIssueCodes = startupValidationIssueCodes
    .filter((code) => code.startsWith("provider_token_"))
    .sort();
  const missing = [
    ...(config.app.env === "production" && targetKind === "unknown"
      ? ["provider_token_custody_target_kind_required"]
      : []),
    ...(previousKeyCount > 0
      ? previousKeyConfirmations
          .filter((confirmation) => !readBoolean(env[confirmation.env]))
          .map((confirmation) => confirmation.code)
      : [])
  ];
  const unsafe = [
    ...providerTokenStartupIssueCodes,
    ...(targetKind === "invalid" ? ["provider_token_custody_target_kind_invalid"] : []),
    ...(targetKind === "saas" ? ["provider_token_saas_external_custody_deferred"] : []),
    ...(targetKind !== "local" && config.connectors.providerTokenKeyProvider === "fake-secret-manager-test"
      ? ["provider_token_fake_custody_not_deployable"]
      : [])
  ];
  const status: ExternalSmokeReadinessStatus =
    unsafe.length > 0
      ? "unsafe_production_target"
      : missing.length > 0
        ? "blocked_missing_secret"
        : "configured_dry_run_only";

  return check({
    id: "provider_token_custody_deployment",
    area: "provider_token_custody",
    label: "Provider-token custody deployment readiness",
    status,
    configuredEnvironmentVariables: configuredEnvNames(requirements, env),
    requiredEnvironment: [
      ...requirements,
      ...previousKeyConfirmations.map((confirmation) => ({
        label: confirmation.code,
        env: [confirmation.env],
        sensitive: false,
        requiredFor: "configuration" as const,
        configured: readBoolean(env[confirmation.env])
      }))
    ],
    blockers: [...missing, ...unsafe],
    guardrails: [
      {
        id: "metadata_only_no_live_custody_calls",
        status: "satisfied",
        summary: "This check reports custody readiness metadata only and never calls KMS, HSM, secret-manager, Microsoft Graph, or provider writes."
      },
      {
        id: "real_custody_provider_supported",
        status:
          config.connectors.providerTokenKeyProvider === "local-env-key-ring"
            ? "satisfied"
            : config.connectors.providerTokenKeyProvider === "fake-secret-manager-test"
              ? "required"
              : "unsafe",
        summary: "local-env-key-ring is the only real implemented provider-token custody provider."
      },
      {
        id: "saas_external_custody_deferred",
        status: targetKind === "saas" ? "required" : "not_applicable",
        summary: "SaaS KMS/HSM/secret-manager custody remains deferred until a real adapter and approved deployed smoke exist."
      }
    ],
    summary:
      status === "configured_dry_run_only"
        ? "Reports provider-token custody readiness for local or in-a-box deployment without live custody calls."
        : "Reports provider-token custody blockers and deferred live-custody requirements without exposing key material.",
    metadata: {
      targetKind,
      providerKind: config.connectors.providerTokenKeyProvider,
      activeKeyIdConfigured: nonEmpty(config.connectors.providerTokenEncryptionKeyId),
      previousKeyCount,
      previousKeyIds: config.connectors.providerTokenEncryptionPreviousKeys.map((key) => key.id).filter(nonEmpty).sort(),
      previousKeyWindowConfirmed: readBoolean(env.PURESOC_PROVIDER_TOKEN_PREVIOUS_KEY_WINDOW_CONFIRMED),
      backfillPlanConfirmed: readBoolean(env.PURESOC_PROVIDER_TOKEN_BACKFILL_PLAN_CONFIRMED),
      keyRetirementPlanConfirmed: readBoolean(env.PURESOC_PROVIDER_TOKEN_KEY_RETIREMENT_PLAN_CONFIRMED),
      activeKeyMaterialReturned: false,
      previousKeyMaterialReturned: false,
      localDevKeyMaterialDetectedByStartupValidation:
        providerTokenStartupIssueCodes.includes("provider_token_key_required") ||
        providerTokenStartupIssueCodes.includes("provider_token_previous_key_default"),
      implementedRealCustodyProviders: metadata?.providerTokenCustody?.implementedRealCustodyProviders ?? [
        "local-env-key-ring"
      ],
      testOnlyCustodyProviders: metadata?.providerTokenCustody?.testOnlyCustodyProviders ?? [
        "fake-secret-manager-test"
      ],
      deferredExternalCustodyProviders: metadata?.providerTokenCustody?.deferredExternalCustodyProviders ?? [
        "azure-key-vault",
        "aws-kms",
        "gcp-secret-manager",
        "hashicorp-vault",
        "hsm"
      ],
      guarantees: metadata?.providerTokenCustody?.guarantees ?? {
        liveMicrosoftGraphCalls: false,
        liveSecretManagerCalls: false,
        liveKmsCalls: false,
        providerWrites: false,
        plaintextSecretOutput: false,
        ciphertextBackfillExecuted: false
      }
    }
  });
};

const stripeCheck = (
  config: PureSocConfig,
  env: NodeJS.ProcessEnv,
  mode: ExternalSmokeReadinessMode,
  targetReady: boolean,
  globalUnsafe: string[]
): ExternalSmokeReadinessCheck => {
  const requirements = [
    requirement("Stripe billing provider", ["PURESOC_BILLING_PROVIDER"], env, false, "configuration"),
    requirement("Stripe test secret key", ["STRIPE_SECRET_KEY"], env, true, "secret"),
    requirement("Stripe webhook secret", ["STRIPE_WEBHOOK_SECRET"], env, true, "secret"),
    requirement("Stripe Base price ID", ["STRIPE_PRICE_ID_BASE"], env, false, "configuration"),
    requirement("Stripe Pro price ID", ["STRIPE_PRICE_ID_PRO"], env, false, "configuration"),
    requirement("Stripe MSP price ID", ["STRIPE_PRICE_ID_MSP"], env, false, "configuration")
  ];
  const configured = config.billing.provider === "stripe" || requirements.some((entry) => entry.configured);
  const missing = configured
    ? [
        ...(config.billing.provider === "stripe" ? [] : ["billing_provider_not_stripe"]),
        ...missingRequirementCodes(requirements.filter((entry) => entry.label !== "Stripe billing provider"))
      ]
    : [];
  const placeholderPriceIds = Object.entries(config.billing.stripe.priceIdsByPlan)
    .filter(([, priceIds]) => priceIds.some((priceId) => priceId.includes("configure")))
    .map(([planKey]) => `placeholder_price_id:${planKey}`);
  const unsafe = [
    ...globalUnsafe,
    ...(stringStartsWith(config.billing.stripe.secretKey, "sk_live") ? ["stripe_live_mode_secret_key_detected"] : [])
  ];
  const optInEnv = "PURESOC_EXTERNAL_SMOKE_STRIPE";
  const status = statusFor({
    configured,
    missing: [...missing, ...(configured ? placeholderPriceIds : [])],
    unsafe,
    optInEnv,
    mode,
    targetReady,
    optInReady: readBoolean(env[optInEnv])
  });

  return check({
    id: "stripe_test_mode_billing",
    area: "stripe",
    label: "Stripe test-mode billing smoke",
    status,
    configuredEnvironmentVariables: configuredEnvNames(requirements, env),
    requiredEnvironment: requirements,
    blockers: [...missing, ...(configured ? placeholderPriceIds : []), ...unsafe],
    guardrails: liveGuardrails(mode, targetReady, env, optInEnv, unsafe),
    summary:
      status === "not_configured"
        ? "Stripe billing is disabled or lacks local test-mode configuration."
        : "Reports Stripe checkout, portal, webhook, and price prerequisites without calling Stripe.",
    metadata: {
      billingProvider: config.billing.provider,
      apiBaseUrlConfigured: nonEmpty(config.billing.stripe.apiBaseUrl),
      checkoutSuccessUrlConfigured: nonEmpty(config.billing.stripe.checkoutSuccessUrl),
      checkoutCancelUrlConfigured: nonEmpty(config.billing.stripe.checkoutCancelUrl),
      portalReturnUrlConfigured: nonEmpty(config.billing.stripe.portalReturnUrl),
      pricePlansConfigured: Object.fromEntries(
        Object.entries(config.billing.stripe.priceIdsByPlan).map(([planKey, priceIds]) => [
          planKey,
          priceIds.length > 0 && priceIds.every((priceId) => !priceId.includes("configure"))
        ])
      ),
      testModeSecretDetected: stringStartsWith(config.billing.stripe.secretKey, "sk_test")
    }
  });
};

const oidcChecks = (
  config: PureSocConfig,
  env: NodeJS.ProcessEnv,
  mode: ExternalSmokeReadinessMode,
  targetReady: boolean,
  globalUnsafe: string[],
  startupValidationIssueCodes: string[]
): ExternalSmokeReadinessCheck[] =>
  (["microsoft_entra", "google", "github"] as const).map((providerKey) => {
    const provider = config.auth.socialLogin.providers[providerKey];
    const prefix = `PURESOC_AUTH_${providerKey.toUpperCase()}`;
    const optInEnv = `PURESOC_EXTERNAL_SMOKE_OIDC_${providerKey.toUpperCase()}`;
    const requirements = [
      requirement(`${providerKey} client ID`, [`${prefix}_CLIENT_ID`], env, false, "configuration"),
      requirement(`${providerKey} client secret`, [`${prefix}_CLIENT_SECRET`], env, true, "secret"),
      requirement(`${providerKey} redirect URI`, [`${prefix}_REDIRECT_URI`], env, false, "configuration")
    ];
    const configured = provider.enabled || requirements.some((entry) => entry.configured);
    const missing = configured
      ? [...(provider.enabled ? [] : [`oidc_provider_not_enabled:${providerKey}`]), ...missingRequirementCodes(requirements)]
      : [];
    const unsafe = [
      ...globalUnsafe,
      ...(startupValidationIssueCodes.includes("oidc_transient_state_key_required")
        ? ["oidc_transient_state_key_not_production_safe"]
        : []),
      ...(provider.redirectUri.startsWith("http://") && !provider.redirectUri.includes("localhost")
        ? ["oidc_redirect_uri_http_non_local"]
        : [])
    ];
    const status = statusFor({
      configured,
      missing,
      unsafe,
      optInEnv,
      mode,
      targetReady,
      optInReady: readBoolean(env[optInEnv])
    });

    return check({
      id: `oidc_${providerKey}_callback`,
      area: "oidc_social_login",
      label: `${providerKey} social-login callback smoke`,
      status,
      configuredEnvironmentVariables: configuredEnvNames(requirements, env),
      requiredEnvironment: requirements,
      blockers: [...missing, ...unsafe],
      guardrails: liveGuardrails(mode, targetReady, env, optInEnv, unsafe),
      summary:
        status === "not_configured"
          ? `${providerKey} social login is disabled or lacks provider app configuration.`
          : `Reports ${providerKey} OIDC/OAuth callback prerequisites without contacting the provider.`,
      metadata: {
        providerKey,
        enabled: provider.enabled,
        mode: provider.mode,
        pkceRequired: provider.pkceRequired,
        nonceRequired: provider.nonceRequired,
        scopesConfigured: provider.scopes.length,
        issuerConfigured: nonEmpty(provider.issuer),
        authorizationEndpointConfigured: nonEmpty(provider.authorizationEndpoint),
        tokenEndpointConfigured: nonEmpty(provider.tokenEndpoint),
        jwksUriConfigured: nonEmpty(provider.jwksUri),
        profileEndpointConfigured: nonEmpty(provider.profileEndpoint),
        emailEndpointConfigured: nonEmpty(provider.emailEndpoint)
      }
    });
  });

const objectStorageScannerCheck = (
  config: PureSocConfig,
  env: NodeJS.ProcessEnv,
  mode: ExternalSmokeReadinessMode,
  targetReady: boolean,
  globalUnsafe: string[]
): ExternalSmokeReadinessCheck => {
  const requirements = [
    requirement("S3 endpoint", ["PURESOC_OBJECT_STORAGE_ENDPOINT"], env, false, "configuration"),
    requirement("S3 region", ["PURESOC_OBJECT_STORAGE_REGION"], env, false, "configuration"),
    requirement("S3 bucket", ["PURESOC_OBJECT_STORAGE_BUCKET"], env, false, "configuration"),
    requirement("S3 access key", ["PURESOC_OBJECT_STORAGE_ACCESS_KEY_ID", "MINIO_ACCESS_KEY"], env, true, "secret"),
    requirement("S3 secret key", ["PURESOC_OBJECT_STORAGE_SECRET_ACCESS_KEY", "MINIO_SECRET_KEY"], env, true, "secret"),
    requirement("HTTP scanner endpoint", ["PURESOC_UPLOAD_SCANNER_ENDPOINT"], env, false, "configuration")
  ];
  const s3Configured = config.storage.objectStorage.provider === "s3";
  const scannerConfigured = config.storage.uploadScanner.mode === "http";
  const configured = s3Configured || scannerConfigured || config.storage.uploadScanner.mode === "mock";
  const required = [
    ...(s3Configured ? requirements.slice(0, 5) : []),
    ...(scannerConfigured ? [requirements[5]] : [])
  ];
  const missing = missingRequirementCodes(required);
  const unsafe = [
    ...globalUnsafe,
    ...(config.storage.uploadScanner.mode === "noop" && config.app.env === "production"
      ? ["production_noop_upload_scanner"]
      : [])
  ];
  const optInEnv = "PURESOC_EXTERNAL_SMOKE_STORAGE";
  const status = statusFor({
    configured,
    missing,
    unsafe,
    optInEnv,
    mode,
    targetReady,
    optInReady: readBoolean(env[optInEnv])
  });

  return check({
    id: "object_storage_scanner_runtime",
    area: "object_storage_scanner",
    label: "Object-storage and upload-scanner smoke",
    status,
    configuredEnvironmentVariables: configuredEnvNames(requirements, env),
    requiredEnvironment: requirements,
    blockers: [...missing, ...unsafe],
    guardrails: liveGuardrails(mode, targetReady, env, optInEnv, unsafe),
    summary:
      status === "not_configured"
        ? "Object storage is memory-backed and scanner mode is not an external HTTP scanner."
        : "Reports object-storage and scanner prerequisites without opening buckets or calling scanners.",
    metadata: {
      objectStorageProvider: config.storage.objectStorage.provider,
      objectStorageEndpointClass: classifyEndpoint(config.storage.objectStorage.endpoint),
      objectStorageBucketConfigured: nonEmpty(config.storage.objectStorage.bucket),
      uploadScannerMode: config.storage.uploadScanner.mode,
      uploadScannerEndpointConfigured: nonEmpty(config.storage.uploadScanner.endpoint),
      uploadScannerEndpointClass: classifyEndpoint(config.storage.uploadScanner.endpoint),
      scannerTimeoutMs: config.storage.uploadScanner.timeoutMs
    }
  });
};

const evidenceReportsCheck = (
  config: PureSocConfig,
  env: NodeJS.ProcessEnv,
  mode: ExternalSmokeReadinessMode,
  targetReady: boolean,
  globalUnsafe: string[]
): ExternalSmokeReadinessCheck => {
  const requirements = [
    requirement("Report renderer", ["PURESOC_REPORT_RENDERER"], env, false, "configuration"),
    requirement("Generated-report evidence storage", ["PURESOC_REPORT_STORE_GENERATED_AS_EVIDENCE"], env, false, "configuration")
  ];
  const missing: string[] = [];
  if (!config.reports.legalCaveatRequired) {
    missing.push("report_legal_caveat_not_required");
  }
  if (!config.reports.storeGeneratedReportsAsEvidence) {
    missing.push("generated_reports_not_stored_as_evidence");
  }
  const unsafe = [...globalUnsafe];
  const optInEnv = "PURESOC_EXTERNAL_SMOKE_EVIDENCE_REPORTS";
  const status = statusFor({
    configured: true,
    missing,
    unsafe,
    optInEnv,
    mode,
    targetReady,
    optInReady: readBoolean(env[optInEnv])
  });

  return check({
    id: "evidence_report_runtime",
    area: "evidence_reports",
    label: "Evidence/report runtime smoke",
    status,
    configuredEnvironmentVariables: configuredEnvNames(requirements, env),
    requiredEnvironment: requirements,
    blockers: [...missing, ...unsafe],
    guardrails: liveGuardrails(mode, targetReady, env, optInEnv, unsafe),
    summary: "Reports evidence/report runtime prerequisites without uploading files or rendering through a browser.",
    metadata: {
      legalCaveatRequired: config.reports.legalCaveatRequired,
      rendererConfigured: nonEmpty(config.reports.renderer),
      reportRendererEndpointClass: classifyEndpoint(config.reports.renderer),
      defaultExportFormat: config.reports.defaultExportFormat,
      storeGeneratedReportsAsEvidence: config.reports.storeGeneratedReportsAsEvidence,
      evidenceUploadLimitBytes: config.api.requestLimits.evidenceUploadMaxBytes,
      storagePointerReturnedToClient: false
    }
  });
};

interface CreateExternalSmokeTargetSelectionInput {
  checks: ExternalSmokeReadinessCheck[];
  mode: ExternalSmokeReadinessMode;
  targetKind: ExternalSmokeTargetKind;
  disposableConfirmation: boolean;
}

interface ExternalSmokeTargetSelectionDefinition {
  pathId: ExternalSmokeTargetSelectionPathId;
  priority: number;
  label: string;
  command: string;
  commandEnvironment?: string[];
  checkIds: string[];
}

const externalSmokeTargetSelectionDefinitions: ExternalSmokeTargetSelectionDefinition[] = [
  {
    pathId: "auth_deployment_browser",
    priority: 10,
    label: "Deployed browser/TLS/proxy auth smoke",
    command: "pnpm auth:smoke:deployment",
    checkIds: ["auth_deployment_browser"]
  },
  {
    pathId: "microsoft365_read_only_tenant",
    priority: 20,
    label: "Microsoft 365 read-only tenant smoke",
    command: "pnpm microsoft365:smoke:read-only",
    checkIds: ["microsoft365_read_only_tenant"]
  },
  {
    pathId: "stripe_test_mode_billing",
    priority: 30,
    label: "Stripe test-mode billing smoke",
    command: "pnpm stripe:smoke:test-mode",
    checkIds: ["stripe_test_mode_billing"]
  },
  {
    pathId: "oidc_microsoft_entra_callback",
    priority: 40,
    label: "Microsoft Entra social-login callback smoke",
    command: "pnpm oidc:smoke:callback",
    commandEnvironment: ["PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER=microsoft_entra"],
    checkIds: ["oidc_microsoft_entra_callback"]
  },
  {
    pathId: "oidc_google_callback",
    priority: 41,
    label: "Google social-login callback smoke",
    command: "pnpm oidc:smoke:callback",
    commandEnvironment: ["PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER=google"],
    checkIds: ["oidc_google_callback"]
  },
  {
    pathId: "oidc_github_callback",
    priority: 42,
    label: "GitHub social-login callback smoke",
    command: "pnpm oidc:smoke:callback",
    commandEnvironment: ["PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER=github"],
    checkIds: ["oidc_github_callback"]
  },
  {
    pathId: "evidence_runtime",
    priority: 50,
    label: "Object-storage/scanner and evidence/report runtime smoke",
    command: "pnpm evidence:smoke:runtime",
    checkIds: ["object_storage_scanner_runtime", "evidence_report_runtime"]
  },
  {
    pathId: "provider_token_custody_deployment",
    priority: 60,
    label: "Provider-token custody deployment smoke",
    command: "pnpm provider-token:smoke",
    checkIds: ["provider_token_custody_deployment"]
  }
];

const createExternalSmokeTargetSelection = (
  input: CreateExternalSmokeTargetSelectionInput
): ExternalSmokeTargetSelection => {
  const checksById = new Map(input.checks.map((check) => [check.id, check]));
  const candidates = externalSmokeTargetSelectionDefinitions.map((definition) =>
    createTargetSelectionCandidate(definition, checksById)
  );
  const rankedCandidates = candidates
    .sort((left, right) => candidateSortValue(left) - candidateSortValue(right))
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1
    }));
  const selectedCandidate = rankedCandidates.find((candidate) => candidate.selectable) ?? null;
  const selectedPathId = selectedCandidate?.pathId ?? null;
  const finalizedCandidates = rankedCandidates.map((candidate) => ({
    ...candidate,
    selected: candidate.pathId === selectedPathId
  }));
  const approvedForLiveCandidate = input.mode === "live_candidate" && isSafeDisposableTarget(input.targetKind) && input.disposableConfirmation;
  const unsafeCandidateCount = finalizedCandidates.filter((candidate) => candidate.status === "unsafe_production_target").length;
  const readyCandidateCount = finalizedCandidates.filter((candidate) => candidate.status === "ready_for_disposable_smoke").length;
  const outcome: ExternalSmokeTargetSelectionOutcome = selectedCandidate
    ? "ready_path_selected"
    : unsafeCandidateCount > 0
      ? "unsafe_target_blocked"
      : "no_ready_path";

  return {
    schemaVersion: externalSmokeTargetSelectionSchemaVersion,
    mode: input.mode,
    target: {
      kind: input.targetKind,
      disposableConfirmation: input.disposableConfirmation,
      approvedForLiveCandidate
    },
    outcome,
    selectedPathId,
    selectedCommand: selectedCandidate?.command ?? null,
    selectedCommandEnvironment: selectedCandidate?.commandEnvironment ?? [],
    selectedCheckIds: selectedCandidate?.checkIds ?? [],
    recommendation: targetSelectionRecommendation(outcome, selectedCandidate),
    readyCandidateCount,
    candidateCount: finalizedCandidates.length,
    rankedCandidates: finalizedCandidates,
    guarantees: {
      metadataOnly: true,
      noLiveNetworkCallsByDefault: true,
      providerWritesEnabled: false,
      secretValuesReturned: false,
      endpointValuesReturned: false,
      exactlyOneReadyPathSelected: selectedCandidate !== null && finalizedCandidates.filter((candidate) => candidate.selected).length === 1
    }
  };
};

const createTargetSelectionCandidate = (
  definition: ExternalSmokeTargetSelectionDefinition,
  checksById: Map<string, ExternalSmokeReadinessCheck>
): ExternalSmokeTargetSelectionCandidate => {
  const checks = definition.checkIds.map((checkId) => checksById.get(checkId)).filter(isReadinessCheck);
  const missingChecks = definition.checkIds.filter((checkId) => !checksById.has(checkId));
  const status = aggregateCandidateStatus(checks, missingChecks);
  const checkStatusReasonCodes = checks.map((check) => `check_status:${check.id}:${check.status}`);
  const checkNotReadyCodes = checks
    .filter((check) => check.status !== "ready_for_disposable_smoke")
    .map((check) => `check_not_ready:${check.id}:${check.status}`);
  const blockerCodes = uniqueSorted([
    ...missingChecks.map((checkId) => `readiness_check_missing:${checkId}`),
    ...checks.flatMap((check) => check.blockers),
    ...(status === "ready_for_disposable_smoke" ? [] : [`target_selection_not_ready:${definition.pathId}:${status}`])
  ]);

  return {
    pathId: definition.pathId,
    rank: definition.priority,
    label: definition.label,
    command: definition.command,
    commandEnvironment: definition.commandEnvironment ?? [],
    checkIds: definition.checkIds,
    areas: uniqueSorted(checks.map((check) => check.area)),
    status,
    selected: false,
    selectable: status === "ready_for_disposable_smoke",
    liveExecutionRequiresDisposableApproval: true,
    liveNetworkCallsByDefault: false,
    providerWritesEnabled: false,
    secretValuesReturned: false,
    endpointValuesReturned: false,
    configuredEnvironmentVariables: uniqueSorted(checks.flatMap((check) => check.configuredEnvironmentVariables)),
    requiredEnvironmentVariables: uniqueSorted(checks.flatMap((check) => check.requiredEnvironment.flatMap((entry) => entry.env))),
    blockerCodes,
    reasonCodes: uniqueSorted([
      `target_selection_status:${status}`,
      ...checkStatusReasonCodes,
      ...checkNotReadyCodes,
      ...blockerCodes
    ]),
    guardrails: checks.flatMap((check) =>
      check.guardrails.map((guardrail) => ({
        checkId: check.id,
        id: guardrail.id,
        status: guardrail.status,
        env: guardrail.env
      }))
    ),
    summary: targetSelectionCandidateSummary(definition, status, checks)
  };
};

const aggregateCandidateStatus = (
  checks: ExternalSmokeReadinessCheck[],
  missingChecks: string[]
): ExternalSmokeReadinessStatus => {
  if (missingChecks.length > 0 || checks.length === 0) {
    return "blocked_missing_secret";
  }

  if (checks.some((check) => check.status === "unsafe_production_target")) {
    return "unsafe_production_target";
  }

  if (checks.every((check) => check.status === "ready_for_disposable_smoke")) {
    return "ready_for_disposable_smoke";
  }

  if (checks.some((check) => check.status === "blocked_missing_secret")) {
    return "blocked_missing_secret";
  }

  if (checks.some((check) => check.status === "not_configured")) {
    return "not_configured";
  }

  return "configured_dry_run_only";
};

const candidateSortValue = (candidate: ExternalSmokeTargetSelectionCandidate): number =>
  selectionStatusSortOrder[candidate.status] * 1000 + externalSmokeTargetSelectionPriority(candidate.pathId);

const selectionStatusSortOrder: Record<ExternalSmokeReadinessStatus, number> = {
  ready_for_disposable_smoke: 0,
  blocked_missing_secret: 1,
  configured_dry_run_only: 2,
  not_configured: 3,
  unsafe_production_target: 4
};

const externalSmokeTargetSelectionPriority = (pathId: ExternalSmokeTargetSelectionPathId): number =>
  externalSmokeTargetSelectionDefinitions.find((definition) => definition.pathId === pathId)?.priority ?? 999;

const targetSelectionCandidateSummary = (
  definition: ExternalSmokeTargetSelectionDefinition,
  status: ExternalSmokeReadinessStatus,
  checks: ExternalSmokeReadinessCheck[]
): string => {
  if (status === "ready_for_disposable_smoke") {
    return `${definition.label} is the next eligible disposable/test smoke path; run only the listed command and keep all other live smokes disabled.`;
  }

  if (status === "unsafe_production_target") {
    return `${definition.label} is blocked by unsafe production-like target or startup indicators.`;
  }

  if (status === "blocked_missing_secret") {
    return `${definition.label} is configured enough to inspect but still has missing prerequisites or blockers.`;
  }

  if (status === "configured_dry_run_only") {
    return `${definition.label} remains metadata-only because live-candidate target approval or path opt-in is absent.`;
  }

  const checkLabels = checks.map((check) => check.label).sort().join(", ");
  return checkLabels
    ? `${definition.label} is not configured for live smoke selection. Covered readiness checks: ${checkLabels}.`
    : `${definition.label} is not configured for live smoke selection.`;
};

const targetSelectionRecommendation = (
  outcome: ExternalSmokeTargetSelectionOutcome,
  selectedCandidate: ExternalSmokeTargetSelectionCandidate | null
): string => {
  if (outcome === "ready_path_selected" && selectedCandidate) {
    return `Run exactly one approved disposable/test smoke path: ${selectedCandidate.command}. Keep every other live smoke command in dry-run mode.`;
  }

  if (outcome === "unsafe_target_blocked") {
    return "Do not run live smoke commands. Remove unsafe production/staging/customer indicators and re-run pnpm external-smoke:readiness.";
  }

  return "No live-smoke path is selected. Configure exactly one disposable/test path, set its opt-in guardrails, and re-run pnpm external-smoke:readiness before any live command.";
};

const check = (input: Omit<ExternalSmokeReadinessCheck, "liveNetworkCalls" | "secretValuesReturned">): ExternalSmokeReadinessCheck => ({
  ...input,
  liveNetworkCalls: false,
  secretValuesReturned: false
});

const statusFor = (input: StatusInput): ExternalSmokeReadinessStatus => {
  if (!input.configured) {
    return "not_configured";
  }

  if (input.unsafe.length > 0) {
    return "unsafe_production_target";
  }

  if (input.missing.length > 0) {
    return "blocked_missing_secret";
  }

  if (input.mode === "live_candidate" && input.targetReady && input.optInReady) {
    return "ready_for_disposable_smoke";
  }

  return "configured_dry_run_only";
};

const requirement = (
  label: string,
  envNames: string[],
  env: NodeJS.ProcessEnv,
  sensitive: boolean,
  requiredFor: ExternalSmokeEnvironmentRequirement["requiredFor"]
): ExternalSmokeEnvironmentRequirement => ({
  label,
  env: envNames,
  sensitive,
  requiredFor,
  configured: envNames.some((envName) => nonEmpty(env[envName]))
});

const missingRequirementCodes = (requirements: ExternalSmokeEnvironmentRequirement[]): string[] =>
  requirements.filter((entry) => !entry.configured).map((entry) => `missing_required_environment:${entry.env.join("|")}`);

const configuredEnvNames = (
  requirements: ExternalSmokeEnvironmentRequirement[],
  env: NodeJS.ProcessEnv
): string[] =>
  [...new Set(requirements.flatMap((entry) => entry.env).filter((envName) => nonEmpty(env[envName])))].sort();

const liveGuardrails = (
  mode: ExternalSmokeReadinessMode,
  targetReady: boolean,
  env: NodeJS.ProcessEnv,
  optInEnv: string,
  unsafe: string[]
): ExternalSmokeGuardrail[] => [
  {
    id: "dry_run_default",
    status: mode === "live_candidate" ? "satisfied" : "required",
    summary: "Set PURESOC_EXTERNAL_SMOKE_MODE=live_candidate before any future live smoke runner can proceed.",
    env: [modeEnv]
  },
  {
    id: "disposable_target_confirmation",
    status: targetReady ? "satisfied" : "required",
    summary: "Set a safe target kind and confirm that the target is disposable or test-owned.",
    env: [targetKindEnv, globalConfirmationEnv]
  },
  {
    id: "provider_opt_in",
    status: readBoolean(env[optInEnv]) ? "satisfied" : "required",
    summary: `Set ${optInEnv}=true for this provider-specific smoke path.`,
    env: [optInEnv]
  },
  {
    id: "unsafe_target_guard",
    status: unsafe.length > 0 ? "unsafe" : "satisfied",
    summary: unsafe.length > 0 ? "Unsafe production-like target indicators are present." : "No production-like target indicator was detected."
  }
];

const summarize = (checks: ExternalSmokeReadinessCheck[]): Record<ExternalSmokeReadinessStatus, number> => {
  const summary = Object.fromEntries(externalSmokeReadinessStatuses.map((status) => [status, 0])) as Record<
    ExternalSmokeReadinessStatus,
    number
  >;

  for (const check of checks) {
    summary[check.status] += 1;
  }

  return summary;
};

const nextOperatorActions = (
  checks: ExternalSmokeReadinessCheck[],
  mode: ExternalSmokeReadinessMode,
  targetKind: ExternalSmokeTargetKind,
  disposableConfirmation: boolean,
  targetSelection: ExternalSmokeTargetSelection
): string[] => {
  const actions = [
    "Review blockers before selecting one external smoke path.",
    "Keep provider write scopes and remediation writes disabled."
  ];

  if (mode !== "live_candidate") {
    actions.push("Set PURESOC_EXTERNAL_SMOKE_MODE=live_candidate only for an approved disposable/test run.");
  }

  if (!isSafeDisposableTarget(targetKind) || !disposableConfirmation) {
    actions.push("Set PURESOC_EXTERNAL_SMOKE_TARGET_KIND to local, development, test, ci, or disposable and confirm PURESOC_EXTERNAL_SMOKE_CONFIRM_DISPOSABLE=true.");
  }

  const readyChecks = checks.filter((check) => check.status === "ready_for_disposable_smoke");
  if (readyChecks.length > 0) {
    actions.push(`Ready paths: ${readyChecks.map((check) => check.id).sort().join(", ")}.`);
  }

  if (targetSelection.selectedPathId) {
    actions.push(`Selected single next smoke path: ${targetSelection.selectedPathId}.`);
  } else {
    actions.push("No single live-smoke path is selected; keep all live smoke commands in dry-run mode.");
  }

  return actions;
};

const globalUnsafeReasons = (config: PureSocConfig, targetKind: ExternalSmokeTargetKind): string[] => [
  ...(config.app.env === "production" ? ["app_environment_production"] : []),
  ...(targetKind === "production" || targetKind === "customer" || targetKind === "staging"
    ? [`external_smoke_target_kind_${targetKind}`]
    : [])
];

const normalizeTargetKind = (value: string | undefined): ExternalSmokeTargetKind => {
  const normalized = (value ?? "unknown").trim().toLowerCase();
  if (
    normalized === "local" ||
    normalized === "development" ||
    normalized === "test" ||
    normalized === "ci" ||
    normalized === "disposable" ||
    normalized === "staging" ||
    normalized === "customer" ||
    normalized === "production"
  ) {
    return normalized;
  }

  return "unknown";
};

const normalizeProviderTokenCustodyTargetKind = (
  value: string | undefined
): "local" | "in_a_box" | "saas" | "unknown" | "invalid" => {
  const normalized = (value ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (!normalized) {
    return "unknown";
  }

  if (normalized === "local" || normalized === "in_a_box" || normalized === "saas") {
    return normalized;
  }

  return "invalid";
};

const isSafeDisposableTarget = (targetKind: ExternalSmokeTargetKind): boolean =>
  targetKind === "local" ||
  targetKind === "development" ||
  targetKind === "test" ||
  targetKind === "ci" ||
  targetKind === "disposable";

export const classifyExternalSmokeDeploymentEndpoint = (value: string): ExternalSmokeDeploymentEndpointClass => {
  if (!nonEmpty(value)) {
    return "empty";
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (url.username || url.password) {
      return "invalid";
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "invalid";
    }

    if (isLoopbackHost(host)) {
      return "local_loopback";
    }

    if (url.protocol !== "https:") {
      return "non_tls_non_local";
    }

    if (host.endsWith(".local")) {
      return "local_name";
    }

    if (hasCustomerHint(host)) {
      return "customer_like";
    }

    if (hasStagingHint(host)) {
      return "staging_like";
    }

    if (hasProductionHint(host)) {
      return "production_like";
    }

    if (hasTestHint(host)) {
      return "test_hint";
    }

    return "public_unknown";
  } catch {
    return "invalid";
  }
};

const deploymentEndpointUnsafeReasons = (
  label: "base_url" | "trusted_origin",
  endpointClass: ExternalSmokeDeploymentEndpointClass
): string[] => {
  if (endpointClass === "empty") {
    return [];
  }

  if (endpointClass === "invalid") {
    return [`auth_deployment_${label}_invalid`];
  }

  if (endpointClass === "non_tls_non_local") {
    return [`auth_deployment_${label}_non_tls_non_local`];
  }

  if (
    endpointClass === "public_unknown" ||
    endpointClass === "production_like" ||
    endpointClass === "staging_like" ||
    endpointClass === "customer_like"
  ) {
    return [`auth_deployment_${label}_${endpointClass}`];
  }

  return [];
};

const requiresSecureCookieForDeploymentEndpoint = (value: string): boolean => {
  if (!nonEmpty(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && !isLoopbackHost(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};

const isLoopbackHost = (host: string): boolean =>
  host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";

const hasTestHint = (host: string): boolean =>
  host === "example.test" ||
  host.endsWith(".test") ||
  host.includes("test") ||
  host.includes("ci") ||
  host.includes("disposable") ||
  host.includes("smoke") ||
  host.includes("dev");

const hasProductionHint = (host: string): boolean =>
  host.includes("prod") || host.includes("production") || host.includes("live");

const hasStagingHint = (host: string): boolean => host.includes("stag") || host.includes("preprod");

const hasCustomerHint = (host: string): boolean =>
  host.includes("customer") || host.includes("tenant") || host.includes("client");

const classifyEndpoint = (value: string): "empty" | "local" | "test_hint" | "external" | "invalid" => {
  if (!nonEmpty(value)) {
    return "empty";
  }

  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local") || host.includes("puresoc-object-storage")) {
      return "local";
    }
    if (host.includes("test") || host.includes("ci") || host.includes("disposable") || host.includes("smoke")) {
      return "test_hint";
    }
    return "external";
  } catch {
    return "invalid";
  }
};

const isReadinessCheck = (value: ExternalSmokeReadinessCheck | undefined): value is ExternalSmokeReadinessCheck =>
  value !== undefined;

const uniqueSorted = <T extends string>(values: T[]): T[] => [...new Set(values)].sort();

const readBoolean = (value: string | undefined): boolean => value === "true";

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const stringStartsWith = (value: string | null | undefined, prefix: string): boolean =>
  typeof value === "string" && value.startsWith(prefix);
