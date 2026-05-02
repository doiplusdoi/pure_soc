import { randomUUID } from "node:crypto";

import {
  classifyExternalSmokeDeploymentEndpoint,
  type ExternalSmokeDeploymentEndpointClass,
  type ExternalSmokeEnvironmentRequirement,
  type ExternalSmokeGuardrail,
  type ExternalSmokeReadinessReport,
  type PureSocConfig
} from "@puresoc/config";

export const authDeploymentSmokeSchemaVersion = "puresoc.auth.deployment_smoke.v1" as const;
export const authDeploymentSmokeCommand = "pnpm auth:smoke:deployment" as const;
export const authDeploymentSmokeBaseUrlEnv = "PURESOC_AUTH_DEPLOYMENT_SMOKE_BASE_URL" as const;
export const authDeploymentSmokeTrustedOriginEnv = "PURESOC_AUTH_DEPLOYMENT_SMOKE_TRUSTED_ORIGIN" as const;
export const authDeploymentSmokeOptInEnv = "PURESOC_EXTERNAL_SMOKE_AUTH_DEPLOYMENT" as const;

export type AuthDeploymentSmokeStatus = "dry_run_passed" | "blocked" | "passed" | "failed";
export type AuthDeploymentSmokeOperationStatus = "planned" | "skipped" | "passed" | "failed";

export interface AuthDeploymentSmokeConfig {
  baseUrl: string;
  baseUrlConfigured: boolean;
  baseUrlClass: ExternalSmokeDeploymentEndpointClass;
  trustedOrigin: string;
  trustedOriginConfigured: boolean;
  trustedOriginClass: ExternalSmokeDeploymentEndpointClass;
  localAuthEnabled: boolean;
  sessionCookieSecure: boolean;
  originProtectionEnabled: boolean;
  requireOriginOrReferer: boolean;
  oidcCallbackOriginExempt: boolean;
  providerCallbackOriginExempt: boolean;
  rateLimitsEnabled: boolean;
}

export interface AuthDeploymentSmokeReadinessPreflight {
  checkId: "auth_deployment_browser";
  status: string;
  mode: "dry_run" | "live_candidate";
  target: {
    kind: string;
    disposableConfirmation: boolean;
  };
  requiredEnvironment: ExternalSmokeEnvironmentRequirement[];
  configuredEnvironmentVariables: string[];
  blockers: string[];
  guardrails: ExternalSmokeGuardrail[];
  metadata: Record<string, unknown>;
}

export interface AuthDeploymentSmokeOperation {
  id: string;
  label: string;
  routeFamily: string;
  endpointClass: ExternalSmokeDeploymentEndpointClass;
  performsNetworkInLiveMode: boolean;
  status: AuthDeploymentSmokeOperationStatus;
  metadata: Record<string, unknown>;
}

export interface AuthDeploymentSmokeReport {
  schemaVersion: typeof authDeploymentSmokeSchemaVersion;
  command: typeof authDeploymentSmokeCommand;
  status: AuthDeploymentSmokeStatus;
  exitCode: 0 | 1;
  mode: "dry_run" | "live_candidate";
  readinessStatus: string;
  liveNetworkCallsMade: boolean;
  externalProviderCallsMade: false;
  browserServicesCalled: false;
  providerWritesEnabled: false;
  secretValuesReturned: false;
  passwordsReturned: false;
  sessionTokensReturned: false;
  sessionCookiesReturned: false;
  authorizationHeadersReturned: false;
  endpointUrlsReturned: false;
  providerEndpointUrlsReturned: false;
  liveUserEmailsReturned: false;
  target: {
    kind: string;
    disposableConfirmation: boolean;
  };
  configuredEnvironmentVariables: string[];
  missingEnvironmentVariables: string[];
  blockers: string[];
  guardrails: ExternalSmokeGuardrail[];
  endpointMetadata: {
    baseUrlConfigured: boolean;
    baseUrlClass: ExternalSmokeDeploymentEndpointClass;
    trustedOriginConfigured: boolean;
    trustedOriginClass: ExternalSmokeDeploymentEndpointClass;
    nonTlsAllowedOnlyForLocalLoopback: true;
    secureCookieRequiredForTlsTarget: boolean;
  };
  runtimeMetadata: {
    localAuthEnabled: boolean;
    sessionCookieSecureConfigured: boolean;
    originProtectionEnabled: boolean;
    requireOriginOrReferer: boolean;
    oidcCallbackOriginExempt: boolean;
    providerCallbackOriginExempt: boolean;
    rateLimitsEnabled: boolean;
    forwardedForUsedForRequestContext: true;
    cookieSecureDrivenByConfig: true;
    auditPayloadsRedacted: true;
    rbacOrganizationScopingPreserved: true;
    managedProviderConnectionsCreated: false;
    realOidcProviderExercised: false;
  };
  plannedOperations: AuthDeploymentSmokeOperation[];
  summary: string;
}

export interface RunAuthDeploymentSmokeOptions {
  appConfig: PureSocConfig;
  smokeConfig: AuthDeploymentSmokeConfig;
  readiness: AuthDeploymentSmokeReadinessPreflight;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  idFactory?: () => string;
}

const syntheticPassword = "PureSocM47SmokePassword42!";
const syntheticWrongPassword = "PureSocM47WrongPassword42!";

export const authDeploymentSmokeConfigFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
  appConfig: PureSocConfig
): AuthDeploymentSmokeConfig => {
  const baseUrl = env[authDeploymentSmokeBaseUrlEnv]?.trim() ?? "";
  const trustedOrigin = env[authDeploymentSmokeTrustedOriginEnv]?.trim() ?? "";

  return {
    baseUrl,
    baseUrlConfigured: baseUrl.length > 0,
    baseUrlClass: classifyExternalSmokeDeploymentEndpoint(baseUrl),
    trustedOrigin,
    trustedOriginConfigured: trustedOrigin.length > 0,
    trustedOriginClass: classifyExternalSmokeDeploymentEndpoint(trustedOrigin),
    localAuthEnabled: appConfig.auth.localEnabled,
    sessionCookieSecure: appConfig.auth.sessionCookieSecure,
    originProtectionEnabled: appConfig.api.security.originProtection.enabled,
    requireOriginOrReferer: appConfig.api.security.originProtection.requireOriginOrReferer,
    oidcCallbackOriginExempt: appConfig.api.security.originProtection.exemptRouteFamilies.includes("oidc_callback"),
    providerCallbackOriginExempt: appConfig.api.security.originProtection.exemptRouteFamilies.includes("provider_callback"),
    rateLimitsEnabled: appConfig.api.rateLimits.enabled
  };
};

export const authDeploymentSmokeReadinessPreflightFromReport = (
  report: ExternalSmokeReadinessReport
): AuthDeploymentSmokeReadinessPreflight => {
  const check = report.checks.find((entry) => entry.id === "auth_deployment_browser");
  if (!check) {
    throw new Error("M42 readiness report did not include auth_deployment_browser.");
  }

  return {
    checkId: "auth_deployment_browser",
    status: check.status,
    mode: report.mode,
    target: {
      kind: report.target.kind,
      disposableConfirmation: report.target.disposableConfirmation
    },
    requiredEnvironment: check.requiredEnvironment,
    configuredEnvironmentVariables: check.configuredEnvironmentVariables,
    blockers: check.blockers,
    guardrails: check.guardrails,
    metadata: check.metadata
  };
};

export const runAuthDeploymentSmoke = async (
  options: RunAuthDeploymentSmokeOptions
): Promise<AuthDeploymentSmokeReport> => {
  const env = options.env ?? process.env;
  const liveRequested = env.PURESOC_EXTERNAL_SMOKE_MODE === "live_candidate" || options.readiness.mode === "live_candidate";
  const plannedOperations = createPlannedAuthDeploymentSmokeOperations(options.smokeConfig);
  const common = authDeploymentSmokeCommon(options, plannedOperations);

  if (!liveRequested) {
    return {
      ...common,
      status: "dry_run_passed",
      exitCode: 0,
      mode: "dry_run",
      liveNetworkCallsMade: false,
      summary:
        "Dry run only. Registration, login, session, logout, cookie, trusted-Origin, untrusted-Origin, callback-exemption, forwarded-header, health, and RBAC checks are planned but were not executed."
    };
  }

  const liveBlockers = collectAuthDeploymentLiveSmokeBlockers(options);
  if (liveBlockers.length > 0) {
    return {
      ...common,
      status: "blocked",
      exitCode: 1,
      mode: "live_candidate",
      liveNetworkCallsMade: false,
      blockers: sortedUnique([...common.blockers, ...liveBlockers]),
      plannedOperations: plannedOperations.map((operation) => ({ ...operation, status: "skipped" })),
      summary: "Live-candidate auth deployment smoke refused to run because one or more guardrails are not satisfied."
    };
  }

  return runLiveAuthDeploymentSmoke(options, common, plannedOperations);
};

const runLiveAuthDeploymentSmoke = async (
  options: RunAuthDeploymentSmokeOptions,
  common: Omit<AuthDeploymentSmokeReport, "status" | "exitCode" | "mode" | "liveNetworkCallsMade" | "summary">,
  plannedOperations: AuthDeploymentSmokeOperation[]
): Promise<AuthDeploymentSmokeReport> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const smokeId = sanitizeSmokeId(options.idFactory?.() ?? randomUUID());
  const baseUrl = options.smokeConfig.baseUrl;
  const trustedOrigin = originHeaderValue(options.smokeConfig.trustedOrigin);
  const forwardedHeaders = deploymentForwardedHeaders(baseUrl);
  let operations = plannedOperations;

  try {
    operations = markAuthDeploymentOperation(operations, "deployment.target.validate", "passed", {
      baseUrlClass: options.smokeConfig.baseUrlClass,
      trustedOriginClass: options.smokeConfig.trustedOriginClass,
      nonTlsAllowedOnlyForLocalLoopback: true,
      secureCookieExpected: options.smokeConfig.sessionCookieSecure
    });

    const health = await getJson(fetchImpl, baseUrl, "/health", {
      headers: forwardedHeaders
    });
    if (health.response.status !== 200 || health.body.service !== "puresoc-api" || health.body.status !== "ok") {
      throw new Error("auth_deployment_smoke_health_failed");
    }
    operations = markAuthDeploymentOperation(operations, "deployment.health.check", "passed", {
      status: health.response.status,
      serviceExpected: "puresoc-api",
      healthStatusOk: true,
      endpointUrlReturnedToOutput: false
    });

    const untrustedOrigin = await postJson(fetchImpl, baseUrl, "/auth/register", {
      email: syntheticEmail("blocked-origin", smokeId),
      password: syntheticPassword,
      displayName: "PureSOC M47 Blocked Origin"
    }, {
      origin: "https://evil.example.invalid",
      ...forwardedHeaders
    });
    const untrustedOriginCode = await responseErrorCode(untrustedOrigin);
    if (untrustedOrigin.status !== 403 || untrustedOriginCode !== "origin_not_allowed") {
      throw new Error("auth_deployment_smoke_untrusted_origin_guard_failed");
    }
    operations = markAuthDeploymentOperation(operations, "auth.origin.reject_untrusted", "passed", {
      status: untrustedOrigin.status,
      errorCode: untrustedOriginCode,
      routeFamily: "auth",
      corsAllowOriginReflected: untrustedOrigin.headers.get("access-control-allow-origin") !== "https://evil.example.invalid",
      requestBodyParsedBeforeOriginCheck: false
    });

    const register = await postJson(fetchImpl, baseUrl, "/auth/register", {
      email: syntheticEmail("primary", smokeId),
      password: syntheticPassword,
      displayName: "PureSOC M47 Smoke"
    }, {
      origin: trustedOrigin,
      ...forwardedHeaders
    });
    const registerText = await register.text();
    if (register.status !== 201 || containsSensitiveAuthSmokeValue(registerText)) {
      throw new Error("auth_deployment_smoke_registration_failed");
    }
    operations = markAuthDeploymentOperation(operations, "auth.registration.trusted_origin", "passed", {
      status: register.status,
      trustedOriginAccepted: true,
      passwordReturnedToResponse: false,
      sessionCookieReturnedToOutput: false
    });

    const login = await postJson(fetchImpl, baseUrl, "/auth/login", {
      email: syntheticEmail("primary", smokeId),
      password: syntheticPassword
    }, {
      origin: trustedOrigin,
      ...forwardedHeaders
    });
    const loginText = await login.text();
    const sessionCookie = login.headers.get("set-cookie") ?? "";
    const loginCookieMetadata = sessionCookieMetadata(sessionCookie, options.smokeConfig.sessionCookieSecure);
    if (
      login.status !== 200 ||
      containsSensitiveAuthSmokeValue(loginText) ||
      !loginCookieMetadata.issued ||
      !loginCookieMetadata.httpOnly ||
      !loginCookieMetadata.sameSiteLax ||
      !loginCookieMetadata.pathRoot ||
      loginCookieMetadata.secure !== options.smokeConfig.sessionCookieSecure
    ) {
      throw new Error("auth_deployment_smoke_login_cookie_failed");
    }
    operations = markAuthDeploymentOperation(operations, "auth.login.issue_session_cookie", "passed", {
      status: login.status,
      sessionCookie: loginCookieMetadata,
      sessionTokenReturnedToBody: false,
      sessionCookieReturnedToOutput: false
    });

    const session = await fetchImpl(toDeploymentUrl(baseUrl, "/auth/session"), {
      headers: {
        cookie: sessionCookie,
        ...forwardedHeaders
      }
    });
    const sessionText = await session.text();
    if (session.status !== 200 || containsSensitiveAuthSmokeValue(sessionText) || sessionText.includes("sessionToken")) {
      throw new Error("auth_deployment_smoke_session_failed");
    }
    operations = markAuthDeploymentOperation(operations, "auth.session.cookie_authenticates", "passed", {
      status: session.status,
      sessionCookieAccepted: true,
      sessionTokenReturnedToBody: false,
      sessionCookieReturnedToOutput: false
    });

    const logout = await postJson(fetchImpl, baseUrl, "/auth/logout", {}, {
      cookie: sessionCookie,
      origin: trustedOrigin,
      ...forwardedHeaders
    });
    const logoutText = await logout.text();
    const clearCookie = logout.headers.get("set-cookie") ?? "";
    const clearCookieMetadata = clearSessionCookieMetadata(clearCookie, options.smokeConfig.sessionCookieSecure);
    if (
      logout.status !== 200 ||
      containsSensitiveAuthSmokeValue(logoutText) ||
      !clearCookieMetadata.clearsCookie ||
      !clearCookieMetadata.httpOnly ||
      !clearCookieMetadata.sameSiteLax ||
      clearCookieMetadata.secure !== options.smokeConfig.sessionCookieSecure
    ) {
      throw new Error("auth_deployment_smoke_logout_failed");
    }
    operations = markAuthDeploymentOperation(operations, "auth.logout.clear_session_cookie", "passed", {
      status: logout.status,
      clearCookie: clearCookieMetadata,
      sessionCookieReturnedToOutput: false
    });

    const sessionAfterLogout = await fetchImpl(toDeploymentUrl(baseUrl, "/auth/session"), {
      headers: {
        cookie: sessionCookie,
        ...forwardedHeaders
      }
    });
    if (sessionAfterLogout.status === 200) {
      throw new Error("auth_deployment_smoke_logout_session_still_valid");
    }
    operations = markAuthDeploymentOperation(operations, "auth.session.post_logout_rejected", "passed", {
      status: sessionAfterLogout.status,
      oldSessionCookieRejected: true
    });

    const oidcCallback = await postJson(fetchImpl, baseUrl, "/auth/oidc/google/callback", {
      state: "missing",
      code: "missing"
    }, {
      origin: "https://evil.example.invalid",
      ...forwardedHeaders
    });
    const oidcErrorCode = await responseErrorCode(oidcCallback);
    if (oidcErrorCode === "origin_not_allowed") {
      throw new Error("auth_deployment_smoke_oidc_callback_origin_exemption_failed");
    }
    operations = markAuthDeploymentOperation(operations, "auth.callback_exemption.oidc", "passed", {
      status: oidcCallback.status,
      errorCode: oidcErrorCode,
      originExemptionReachedRoute: true,
      externalProviderCalled: false
    });

    const providerCallback = await postJson(
      fetchImpl,
      baseUrl,
      "/organizations/org_m47_smoke/provider-connections/microsoft365/consent/callback",
      {
        state: "missing",
        code: "missing"
      },
      {
        origin: "https://evil.example.invalid",
        ...forwardedHeaders
      }
    );
    const providerCallbackErrorCode = await responseErrorCode(providerCallback);
    if (providerCallbackErrorCode === "origin_not_allowed") {
      throw new Error("auth_deployment_smoke_provider_callback_origin_exemption_failed");
    }
    operations = markAuthDeploymentOperation(operations, "auth.callback_exemption.provider", "passed", {
      status: providerCallback.status,
      errorCode: providerCallbackErrorCode,
      originExemptionReachedRoute: true,
      managedProviderConnectionCreated: false,
      microsoftGraphCalled: false
    });

    const forwardedRateLimitStatuses: number[] = [];
    let forwardedRateLimitCode: string | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await postJson(fetchImpl, baseUrl, "/auth/login", {
        email: syntheticEmail(`forwarded-${attempt}`, smokeId),
        password: syntheticWrongPassword
      }, {
        origin: trustedOrigin,
        "x-forwarded-for": "198.51.100.47, 203.0.113.11",
        ...forwardedHeaders
      });
      forwardedRateLimitStatuses.push(response.status);
      forwardedRateLimitCode = await responseErrorCode(response);
    }
    if (forwardedRateLimitStatuses.at(-1) !== 429) {
      throw new Error("auth_deployment_smoke_forwarded_for_rate_limit_failed");
    }
    operations = markAuthDeploymentOperation(operations, "auth.forwarded_headers.rate_limit_ip", "passed", {
      finalStatus: forwardedRateLimitStatuses.at(-1),
      finalErrorCode: forwardedRateLimitCode,
      forwardedForHonoredByRateLimit: true,
      forwardedProtoHeaderSent: true,
      forwardedHostHeaderSent: true,
      cookieSecureDrivenByConfig: true
    });

    const ownerCookie = await registerLoginAndReturnCookie(fetchImpl, baseUrl, trustedOrigin, forwardedHeaders, "owner", smokeId);
    const organization = await createOrganization(fetchImpl, baseUrl, trustedOrigin, forwardedHeaders, ownerCookie);
    const outsiderCookie = await registerLoginAndReturnCookie(
      fetchImpl,
      baseUrl,
      trustedOrigin,
      forwardedHeaders,
      "outsider",
      smokeId
    );
    const crossOrg = await fetchImpl(toDeploymentUrl(baseUrl, `/organizations/${organization.id}/members`), {
      headers: {
        cookie: outsiderCookie,
        ...forwardedHeaders
      }
    });
    if (crossOrg.status !== 403) {
      throw new Error("auth_deployment_smoke_rbac_cross_org_failed");
    }
    operations = markAuthDeploymentOperation(operations, "auth.rbac.organization_scoping", "passed", {
      organizationCreated: true,
      ownerSessionCreated: true,
      outsiderSessionCreated: true,
      crossOrganizationMembersStatus: crossOrg.status,
      crossOrganizationRejected: true,
      organizationIdReturnedToOutput: false
    });

    return {
      ...common,
      status: "passed",
      exitCode: 0,
      mode: "live_candidate",
      liveNetworkCallsMade: true,
      plannedOperations: operations,
      summary:
        "Auth deployment smoke completed against an explicitly confirmed local/test/disposable target. Output is sanitized and omits endpoint URLs, passwords, session tokens, session cookies, authorization headers, and user emails."
    };
  } catch (error) {
    const failedOperationId = operations.find((operation) => operation.status === "planned")?.id;
    if (failedOperationId) {
      operations = markAuthDeploymentOperation(operations, failedOperationId, "failed", safeAuthDeploymentSmokeErrorMetadata(error));
    }

    return {
      ...common,
      status: "failed",
      exitCode: 1,
      mode: "live_candidate",
      liveNetworkCallsMade: true,
      blockers: sortedUnique([...common.blockers, "auth_deployment_smoke_failed"]),
      plannedOperations: operations.map((operation) =>
        operation.status === "planned" ? { ...operation, status: "skipped" } : operation
      ),
      summary:
        "Auth deployment smoke attempted disposable auth operations but did not complete. Failure metadata is generic and secret-free."
    };
  }
};

const authDeploymentSmokeCommon = (
  options: RunAuthDeploymentSmokeOptions,
  plannedOperations: AuthDeploymentSmokeOperation[]
): Omit<AuthDeploymentSmokeReport, "status" | "exitCode" | "mode" | "liveNetworkCallsMade" | "summary"> => ({
  schemaVersion: authDeploymentSmokeSchemaVersion,
  command: authDeploymentSmokeCommand,
  readinessStatus: options.readiness.status,
  externalProviderCallsMade: false,
  browserServicesCalled: false,
  providerWritesEnabled: false,
  secretValuesReturned: false,
  passwordsReturned: false,
  sessionTokensReturned: false,
  sessionCookiesReturned: false,
  authorizationHeadersReturned: false,
  endpointUrlsReturned: false,
  providerEndpointUrlsReturned: false,
  liveUserEmailsReturned: false,
  target: options.readiness.target,
  configuredEnvironmentVariables: options.readiness.configuredEnvironmentVariables,
  missingEnvironmentVariables: missingAuthDeploymentEnvironmentVariables(options.readiness.requiredEnvironment),
  blockers: sortedUnique(options.readiness.blockers),
  guardrails: options.readiness.guardrails,
  endpointMetadata: {
    baseUrlConfigured: options.smokeConfig.baseUrlConfigured,
    baseUrlClass: options.smokeConfig.baseUrlClass,
    trustedOriginConfigured: options.smokeConfig.trustedOriginConfigured,
    trustedOriginClass: options.smokeConfig.trustedOriginClass,
    nonTlsAllowedOnlyForLocalLoopback: true,
    secureCookieRequiredForTlsTarget: requiresSecureCookieForDeploymentEndpoint(options.smokeConfig.baseUrl)
  },
  runtimeMetadata: {
    localAuthEnabled: options.smokeConfig.localAuthEnabled,
    sessionCookieSecureConfigured: options.smokeConfig.sessionCookieSecure,
    originProtectionEnabled: options.smokeConfig.originProtectionEnabled,
    requireOriginOrReferer: options.smokeConfig.requireOriginOrReferer,
    oidcCallbackOriginExempt: options.smokeConfig.oidcCallbackOriginExempt,
    providerCallbackOriginExempt: options.smokeConfig.providerCallbackOriginExempt,
    rateLimitsEnabled: options.smokeConfig.rateLimitsEnabled,
    forwardedForUsedForRequestContext: true,
    cookieSecureDrivenByConfig: true,
    auditPayloadsRedacted: true,
    rbacOrganizationScopingPreserved: true,
    managedProviderConnectionsCreated: false,
    realOidcProviderExercised: false
  },
  plannedOperations
});

const collectAuthDeploymentLiveSmokeBlockers = (options: RunAuthDeploymentSmokeOptions): string[] => {
  const env = options.env ?? process.env;
  const blockers = new Set<string>();

  if (options.readiness.status !== "ready_for_disposable_smoke") {
    blockers.add(`readiness_status_not_ready:${options.readiness.status}`);
  }

  if (env.PURESOC_EXTERNAL_SMOKE_MODE !== "live_candidate") {
    blockers.add("external_smoke_mode_not_live_candidate");
  }

  if (!isSafeAuthDeploymentSmokeTarget(options.readiness.target.kind) || !options.readiness.target.disposableConfirmation) {
    blockers.add("external_smoke_disposable_target_not_confirmed");
  }

  if (env[authDeploymentSmokeOptInEnv] !== "true") {
    blockers.add("auth_deployment_external_smoke_opt_in_missing");
  }

  if (!options.smokeConfig.baseUrlConfigured) {
    blockers.add("auth_deployment_base_url_missing");
  }

  if (!options.smokeConfig.trustedOriginConfigured) {
    blockers.add("auth_deployment_trusted_origin_missing");
  }

  if (!isAllowedAuthDeploymentEndpoint(options.smokeConfig.baseUrl)) {
    blockers.add("auth_deployment_base_url_not_local_test_or_disposable");
  }

  if (!isAllowedAuthDeploymentEndpoint(options.smokeConfig.trustedOrigin)) {
    blockers.add("auth_deployment_trusted_origin_not_local_test_or_disposable");
  }

  if (!options.smokeConfig.localAuthEnabled) {
    blockers.add("auth_local_login_disabled");
  }

  if (!options.smokeConfig.originProtectionEnabled) {
    blockers.add("origin_protection_disabled");
  }

  if (!options.smokeConfig.rateLimitsEnabled) {
    blockers.add("api_rate_limits_disabled");
  }

  if (!options.smokeConfig.oidcCallbackOriginExempt) {
    blockers.add("oidc_callback_origin_exemption_missing");
  }

  if (!options.smokeConfig.providerCallbackOriginExempt) {
    blockers.add("provider_callback_origin_exemption_missing");
  }

  if (requiresSecureCookieForDeploymentEndpoint(options.smokeConfig.baseUrl) && !options.smokeConfig.sessionCookieSecure) {
    blockers.add("auth_deployment_secure_cookie_not_enabled_for_tls_target");
  }

  for (const blocker of options.readiness.blockers) {
    blockers.add(blocker);
  }

  return [...blockers].sort();
};

const createPlannedAuthDeploymentSmokeOperations = (
  config: AuthDeploymentSmokeConfig
): AuthDeploymentSmokeOperation[] => [
  {
    id: "deployment.target.validate",
    label: "Validate the configured auth smoke base URL, trusted Origin, TLS posture, and disposable/test guardrails.",
    routeFamily: "deployment",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: false,
    status: "planned",
    metadata: {
      baseUrlConfigured: config.baseUrlConfigured,
      baseUrlClass: config.baseUrlClass,
      trustedOriginConfigured: config.trustedOriginConfigured,
      trustedOriginClass: config.trustedOriginClass,
      endpointUrlReturnedToOutput: false
    }
  },
  {
    id: "deployment.health.check",
    label: "Check the deployed API health endpoint before mutating auth smoke state.",
    routeFamily: "public_read",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      endpointUrlReturnedToOutput: false
    }
  },
  {
    id: "auth.origin.reject_untrusted",
    label: "Reject a state-changing auth request from an untrusted browser Origin before route side effects.",
    routeFamily: "auth",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      untrustedOriginValueReturnedToOutput: false,
      expectedErrorCode: "origin_not_allowed"
    }
  },
  {
    id: "auth.registration.trusted_origin",
    label: "Register a synthetic local account through the trusted browser Origin without returning the password.",
    routeFamily: "auth",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      trustedOriginValueReturnedToOutput: false,
      passwordReturnedToResponse: false,
      userEmailReturnedToOutput: false
    }
  },
  {
    id: "auth.login.issue_session_cookie",
    label: "Log in with the synthetic local account and inspect only HttpOnly/SameSite/Secure cookie metadata.",
    routeFamily: "auth",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      cookieAttributesExpected: {
        httpOnly: true,
        sameSiteLax: true,
        pathRoot: true,
        secureConfigured: config.sessionCookieSecure
      },
      sessionTokenReturnedToBody: false,
      sessionCookieReturnedToOutput: false
    }
  },
  {
    id: "auth.session.cookie_authenticates",
    label: "Use the session cookie to read the current session without exposing the cookie or token.",
    routeFamily: "auth",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      sessionTokenReturnedToBody: false,
      sessionCookieReturnedToOutput: false
    }
  },
  {
    id: "auth.logout.clear_session_cookie",
    label: "Log out and verify the cleared cookie keeps browser safety attributes.",
    routeFamily: "auth",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      sessionCookieReturnedToOutput: false,
      clearCookieExpected: {
        httpOnly: true,
        sameSiteLax: true,
        pathRoot: true,
        maxAgeZero: true,
        secureConfigured: config.sessionCookieSecure
      }
    }
  },
  {
    id: "auth.session.post_logout_rejected",
    label: "Verify the previous session cookie no longer authenticates after logout.",
    routeFamily: "auth",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      oldSessionCookieReturnedToOutput: false
    }
  },
  {
    id: "auth.callback_exemption.oidc",
    label: "Verify OIDC/social callback Origin exemption reaches route validation without provider calls.",
    routeFamily: "oidc_callback",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      originProtectionExemptForProviderCallbacks: config.oidcCallbackOriginExempt,
      externalProviderCalled: false
    }
  },
  {
    id: "auth.callback_exemption.provider",
    label: "Verify Microsoft 365 provider callback Origin exemption reaches route authorization without Graph calls.",
    routeFamily: "provider_callback",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      originProtectionExemptForProviderCallbacks: config.providerCallbackOriginExempt,
      microsoftGraphCalled: false,
      managedProviderConnectionCreated: false
    }
  },
  {
    id: "auth.forwarded_headers.rate_limit_ip",
    label: "Send forwarded headers and prove failed-login rate limiting uses the forwarded client IP.",
    routeFamily: "auth",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      forwardedForHeaderValueReturnedToOutput: false,
      forwardedProtoHeaderSent: true,
      forwardedHostHeaderSent: true
    }
  },
  {
    id: "auth.rbac.organization_scoping",
    label: "Create synthetic users and organization data, then verify cross-organization member access is rejected.",
    routeFamily: "organization",
    endpointClass: config.baseUrlClass,
    performsNetworkInLiveMode: true,
    status: "planned",
    metadata: {
      organizationIdReturnedToOutput: false,
      userEmailsReturnedToOutput: false,
      rbacOrganizationScopingPreserved: true
    }
  }
];

const registerLoginAndReturnCookie = async (
  fetchImpl: typeof fetch,
  baseUrl: string,
  trustedOrigin: string,
  forwardedHeaders: Record<string, string>,
  label: string,
  smokeId: string
): Promise<string> => {
  const email = syntheticEmail(label, smokeId);
  const register = await postJson(fetchImpl, baseUrl, "/auth/register", {
    email,
    password: syntheticPassword,
    displayName: "PureSOC M47 RBAC Smoke"
  }, {
    origin: trustedOrigin,
    ...forwardedHeaders
  });
  if (register.status !== 201) {
    throw new Error("auth_deployment_smoke_rbac_register_failed");
  }

  const login = await postJson(fetchImpl, baseUrl, "/auth/login", {
    email,
    password: syntheticPassword
  }, {
    origin: trustedOrigin,
    ...forwardedHeaders
  });
  if (login.status !== 200) {
    throw new Error("auth_deployment_smoke_rbac_login_failed");
  }

  return login.headers.get("set-cookie") ?? "";
};

const createOrganization = async (
  fetchImpl: typeof fetch,
  baseUrl: string,
  trustedOrigin: string,
  forwardedHeaders: Record<string, string>,
  cookie: string
): Promise<{ id: string }> => {
  const response = await postJson(fetchImpl, baseUrl, "/organizations", {
    name: "PureSOC M47 Smoke Org",
    primaryCountryCode: "RO"
  }, {
    cookie,
    origin: trustedOrigin,
    ...forwardedHeaders
  });
  const text = await response.text();
  if (response.status !== 201) {
    throw new Error("auth_deployment_smoke_create_org_failed");
  }

  const body = JSON.parse(text) as { organization?: { id?: string } };
  const id = body.organization?.id;
  if (!id) {
    throw new Error("auth_deployment_smoke_create_org_missing_id");
  }

  return { id };
};

const postJson = (
  fetchImpl: typeof fetch,
  baseUrl: string,
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<Response> =>
  fetchImpl(toDeploymentUrl(baseUrl, path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });

const getJson = async (
  fetchImpl: typeof fetch,
  baseUrl: string,
  path: string,
  init: RequestInit = {}
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetchImpl(toDeploymentUrl(baseUrl, path), init);
  return {
    response,
    body: (await response.json()) as Record<string, unknown>
  };
};

const responseErrorCode = async (response: Response): Promise<string | null> => {
  try {
    const body = (await response.json()) as { error?: { code?: unknown } };
    return typeof body.error?.code === "string" ? body.error.code : null;
  } catch {
    return null;
  }
};

const toDeploymentUrl = (baseUrl: string, path: string): string => new URL(path, ensureTrailingSlash(baseUrl)).toString();

const ensureTrailingSlash = (value: string): string => (value.endsWith("/") ? value : `${value}/`);

const originHeaderValue = (value: string): string => {
  const parsed = new URL(value);
  return parsed.origin;
};

const deploymentForwardedHeaders = (baseUrl: string): Record<string, string> => {
  const parsed = new URL(baseUrl);
  return {
    "x-forwarded-proto": parsed.protocol.replace(":", ""),
    "x-forwarded-host": parsed.host
  };
};

const sessionCookieMetadata = (cookie: string, secureConfigured: boolean) => ({
  issued: cookie.includes("puresoc_session="),
  httpOnly: cookie.includes("HttpOnly"),
  sameSiteLax: cookie.includes("SameSite=Lax"),
  pathRoot: cookie.includes("Path=/"),
  expires: cookie.includes("Expires="),
  secure: cookie.includes("Secure"),
  secureConfigured
});

const clearSessionCookieMetadata = (cookie: string, secureConfigured: boolean) => ({
  clearsCookie: cookie.includes("puresoc_session=") && cookie.includes("Max-Age=0"),
  httpOnly: cookie.includes("HttpOnly"),
  sameSiteLax: cookie.includes("SameSite=Lax"),
  pathRoot: cookie.includes("Path=/"),
  maxAgeZero: cookie.includes("Max-Age=0"),
  secure: cookie.includes("Secure"),
  secureConfigured
});

const containsSensitiveAuthSmokeValue = (value: string): boolean =>
  value.includes(syntheticPassword) ||
  value.includes(syntheticWrongPassword) ||
  value.includes("sessionToken") ||
  value.includes("puresoc_session=");

const markAuthDeploymentOperation = (
  operations: AuthDeploymentSmokeOperation[],
  id: string,
  status: AuthDeploymentSmokeOperationStatus,
  metadata: Record<string, unknown>
): AuthDeploymentSmokeOperation[] =>
  operations.map((operation) =>
    operation.id === id
      ? {
          ...operation,
          status,
          metadata: {
            ...operation.metadata,
            ...metadata
          }
        }
      : operation
  );

const missingAuthDeploymentEnvironmentVariables = (
  requirements: ExternalSmokeEnvironmentRequirement[]
): string[] =>
  sortedUnique(requirements.filter((requirement) => !requirement.configured).flatMap((requirement) => requirement.env));

const isAllowedAuthDeploymentEndpoint = (value: string): boolean => {
  if (!value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);
    const endpointClass = classifyExternalSmokeDeploymentEndpoint(value);

    if (endpointClass === "local_loopback") {
      return url.protocol === "http:" || url.protocol === "https:";
    }

    if (url.protocol !== "https:") {
      return false;
    }

    return endpointClass === "local_name" || endpointClass === "test_hint";
  } catch {
    return false;
  }
};

const requiresSecureCookieForDeploymentEndpoint = (value: string): boolean => {
  if (!value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && classifyExternalSmokeDeploymentEndpoint(value) !== "local_loopback";
  } catch {
    return false;
  }
};

const isSafeAuthDeploymentSmokeTarget = (targetKind: string): boolean =>
  targetKind === "local" ||
  targetKind === "development" ||
  targetKind === "test" ||
  targetKind === "ci" ||
  targetKind === "disposable";

const syntheticEmail = (label: string, smokeId: string): string => `m47-${label}-${smokeId}@example.test`;

const sanitizeSmokeId = (value: string): string => value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24) || "smoke";

const safeAuthDeploymentSmokeErrorMetadata = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error && error.message.startsWith("auth_deployment_smoke_")) {
    return {
      errorCode: error.message
    };
  }

  return {
    errorCode: "unexpected_error"
  };
};

const sortedUnique = (values: string[]): string[] => [...new Set(values.filter(Boolean))].sort();
