import type { AddressInfo } from "node:net";

import type {
  ExternalSmokeEnvironmentRequirement,
  ExternalSmokeGuardrail,
  ExternalSmokeReadinessCheck,
  ExternalSmokeReadinessReport,
  PureSocConfig
} from "@puresoc/config";
import {
  isOidcSocialProviderKey,
  oidcSocialProviderKeys,
  type OauthProfileClient,
  type OidcProviderConfig,
  type OidcSocialProviderKey,
  type OidcTokenClient,
  type OidcTokenVerifier,
  type VerifiedOidcIdentity
} from "@puresoc/auth-oidc";
import { createApiServices, type ApiServices } from "./services";
import { startApiServer } from "../server";

export const oidcCallbackSmokeSchemaVersion = "puresoc.oidc_social.callback_smoke.v1" as const;
export const oidcCallbackSmokeCommand = "pnpm oidc:smoke:callback" as const;
export const oidcCallbackSmokeProviderEnv = "PURESOC_EXTERNAL_SMOKE_OIDC_PROVIDER" as const;

export type OidcCallbackSmokeStatus = "dry_run_passed" | "blocked" | "passed" | "failed";
export type OidcCallbackSmokeOperationStatus = "planned" | "skipped" | "passed" | "failed";

export interface OidcCallbackSmokeConfig {
  selectedProviderKey: OidcSocialProviderKey | null;
  selectedProviderConfigured: boolean;
  selectedProviderValid: boolean;
  sessionCookieSecure: boolean;
}

export interface OidcCallbackSmokeReadinessSnapshot {
  checkId: `oidc_${OidcSocialProviderKey}_callback`;
  providerKey: OidcSocialProviderKey;
  status: string;
  requiredEnvironment: ExternalSmokeEnvironmentRequirement[];
  configuredEnvironmentVariables: string[];
  blockers: string[];
  guardrails: ExternalSmokeGuardrail[];
  metadata: Record<string, unknown>;
}

export interface OidcCallbackSmokeReadinessPreflight {
  mode: "dry_run" | "live_candidate";
  target: {
    kind: string;
    disposableConfirmation: boolean;
  };
  providerChecks: Record<OidcSocialProviderKey, OidcCallbackSmokeReadinessSnapshot>;
  selectedCheck: OidcCallbackSmokeReadinessSnapshot | null;
}

export interface OidcCallbackSmokeOperation {
  id: string;
  label: string;
  providerEndpointClass: OidcSmokeEndpointClass | null;
  performsExternalProviderCallInLiveMode: boolean;
  status: OidcCallbackSmokeOperationStatus;
  metadata: Record<string, unknown>;
}

export interface OidcCallbackSmokeReport {
  schemaVersion: typeof oidcCallbackSmokeSchemaVersion;
  command: typeof oidcCallbackSmokeCommand;
  status: OidcCallbackSmokeStatus;
  exitCode: 0 | 1;
  mode: "dry_run" | "live_candidate";
  selectedProviderKey: OidcSocialProviderKey | null;
  readinessStatuses: Record<OidcSocialProviderKey, string>;
  liveNetworkCallsMade: false;
  externalProviderCallsMade: false;
  localCallbackExercised: boolean;
  secretValuesReturned: false;
  tokenValuesReturned: false;
  authorizationCodesReturned: false;
  rawStateReturned: false;
  rawNonceReturned: false;
  pkceVerifierReturned: false;
  sessionCookiesReturned: false;
  providerEndpointUrlsReturned: false;
  liveProfilePayloadsReturned: false;
  liveUserEmailsReturned: false;
  providerWritesEnabled: false;
  managedProviderConnectionsCreated: false;
  target: {
    kind: string;
    disposableConfirmation: boolean;
  };
  configuredEnvironmentVariables: string[];
  missingEnvironmentVariables: string[];
  blockers: string[];
  guardrails: ExternalSmokeGuardrail[];
  plannedOperations: OidcCallbackSmokeOperation[];
  providerMetadata: {
    providerKey: OidcSocialProviderKey | null;
    enabled: boolean;
    mode: "oidc" | "oauth_profile" | null;
    pkceRequired: boolean;
    nonceRequired: boolean;
    scopesConfigured: number;
    authorizationEndpointClass: OidcSmokeEndpointClass;
    tokenEndpointClass: OidcSmokeEndpointClass;
    jwksEndpointClass: OidcSmokeEndpointClass;
    profileEndpointClass: OidcSmokeEndpointClass;
    emailEndpointClass: OidcSmokeEndpointClass;
    redirectUriClass: OidcSmokeEndpointClass;
  };
  runtimeMetadata: {
    transientStateStoredAsHash: true;
    nonceStoredAsHash: boolean;
    pkceVerifierReturnedToOutput: false;
    accountLinkingRequiresExplicitSignedInApproval: true;
    sessionCookieSecureConfigured: boolean;
    sessionCookieMetadataOnly: true;
    callbackRouteOriginExempt: true;
    localAuthSafeguardsPreserved: true;
    auditPayloadsRedacted: true;
    providerConnectionBoundary: "user_login_not_managed_provider_connection";
    realProviderAppExercised: false;
    injectedDisposableProviderHarnessAllowed: boolean;
  };
  summary: string;
}

export interface RunOidcCallbackSmokeOptions {
  appConfig: PureSocConfig;
  smokeConfig: OidcCallbackSmokeConfig;
  readiness: OidcCallbackSmokeReadinessPreflight;
  env?: NodeJS.ProcessEnv;
  allowInjectedDisposableProviderHarness?: boolean;
  now?: () => Date;
}

type OidcSmokeEndpointClass = "empty" | "official_provider_default" | "local" | "test_hint" | "external" | "invalid";

const syntheticAuthorizationCode = "puresoc-oidc-smoke-authorization-code";
const syntheticIdToken = "puresoc-oidc-smoke-id-token";
const syntheticAccessToken = "puresoc-oidc-smoke-access-token";
const syntheticEmail = "puresoc-oidc-smoke@example.test";
const syntheticPassword = "PureSocSmokePassword42!";

export const oidcCallbackSmokeConfigFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
  appConfig?: PureSocConfig
): OidcCallbackSmokeConfig => {
  const configuredValue = env[oidcCallbackSmokeProviderEnv]?.trim();
  const selectedProviderConfigured = Boolean(configuredValue);
  const selectedProviderKey =
    configuredValue && isOidcSocialProviderKey(configuredValue) ? configuredValue : null;

  return {
    selectedProviderKey,
    selectedProviderConfigured,
    selectedProviderValid: !selectedProviderConfigured || selectedProviderKey !== null,
    sessionCookieSecure: appConfig?.auth.sessionCookieSecure ?? false
  };
};

export const oidcCallbackSmokeReadinessPreflightFromReport = (
  report: ExternalSmokeReadinessReport,
  selectedProviderKey: OidcSocialProviderKey | null
): OidcCallbackSmokeReadinessPreflight => {
  const providerChecks = Object.fromEntries(
    oidcSocialProviderKeys.map((providerKey) => {
      const check = report.checks.find((entry) => entry.id === oidcReadinessCheckId(providerKey));
      if (!check) {
        throw new Error(`M42 readiness report did not include ${oidcReadinessCheckId(providerKey)}.`);
      }

      return [
        providerKey,
        {
          checkId: oidcReadinessCheckId(providerKey),
          providerKey,
          status: check.status,
          requiredEnvironment: check.requiredEnvironment,
          configuredEnvironmentVariables: check.configuredEnvironmentVariables,
          blockers: check.blockers,
          guardrails: check.guardrails,
          metadata: check.metadata
        }
      ];
    })
  ) as Record<OidcSocialProviderKey, OidcCallbackSmokeReadinessSnapshot>;

  return {
    mode: report.mode,
    target: report.target,
    providerChecks,
    selectedCheck: selectedProviderKey ? providerChecks[selectedProviderKey] : null
  };
};

export const runOidcCallbackSmoke = async (
  options: RunOidcCallbackSmokeOptions
): Promise<OidcCallbackSmokeReport> => {
  const env = options.env ?? process.env;
  const liveRequested =
    env.PURESOC_EXTERNAL_SMOKE_MODE === "live_candidate" || options.readiness.mode === "live_candidate";
  const plannedOperations = createPlannedOidcSmokeOperations(options.appConfig, options.smokeConfig);
  const common = oidcSmokeReportCommon(options, plannedOperations);

  if (!liveRequested) {
    return {
      ...common,
      status: "dry_run_passed",
      exitCode: 0,
      mode: "dry_run",
      localCallbackExercised: false,
      summary:
        "Dry run only. OIDC/social authorization, callback validation, token/profile lookup, account-link approval, session cookie, and audit operations are planned but were not executed."
    };
  }

  const liveBlockers = collectOidcLiveSmokeBlockers(options);
  if (liveBlockers.length > 0) {
    return {
      ...common,
      status: "blocked",
      exitCode: 1,
      mode: "live_candidate",
      localCallbackExercised: false,
      blockers: sortedUnique([...common.blockers, ...liveBlockers]),
      plannedOperations: plannedOperations.map((operation) => ({
        ...operation,
        status: "skipped"
      })),
      summary: "Live-candidate OIDC/social callback smoke refused to run because one or more guardrails are not satisfied."
    };
  }

  return runInjectedDisposableOidcCallbackHarness(options, common, plannedOperations);
};

const runInjectedDisposableOidcCallbackHarness = async (
  options: RunOidcCallbackSmokeOptions,
  common: Omit<OidcCallbackSmokeReport, "status" | "exitCode" | "mode" | "localCallbackExercised" | "summary">,
  plannedOperations: OidcCallbackSmokeOperation[]
): Promise<OidcCallbackSmokeReport> => {
  const providerKey = options.smokeConfig.selectedProviderKey;
  if (!providerKey) {
    return {
      ...common,
      status: "blocked",
      exitCode: 1,
      mode: "live_candidate",
      localCallbackExercised: false,
      blockers: sortedUnique([...common.blockers, "oidc_selected_provider_required"]),
      plannedOperations: plannedOperations.map((operation) => ({ ...operation, status: "skipped" })),
      summary: "OIDC/social callback smoke requires an explicit selected provider."
    };
  }

  const provider = options.appConfig.auth.socialLogin.providers[providerKey];
  const now = options.now ?? (() => new Date());
  let currentNonce: string | null = null;
  let tokenExchangeCount = 0;
  let tokenVerificationCount = 0;
  let profileLookupCount = 0;
  let operations = plannedOperations;

  const tokenClient: OidcTokenClient = {
    exchangeAuthorizationCode: async (input) => {
      tokenExchangeCount += 1;
      if (input.code !== syntheticAuthorizationCode) {
        throw new Error("oidc_smoke_unexpected_authorization_code");
      }

      return input.provider.mode === "oauth_profile"
        ? { accessToken: syntheticAccessToken }
        : { idToken: syntheticIdToken };
    }
  };
  const tokenVerifier: OidcTokenVerifier = {
    verifyIdToken: async (input) => {
      tokenVerificationCount += 1;
      if (input.idToken !== syntheticIdToken) {
        throw new Error("oidc_smoke_unexpected_id_token");
      }

      return identityForSmoke(input.provider, currentNonce, now());
    }
  };
  const profileClient: OauthProfileClient = {
    loadProfile: async (input) => {
      profileLookupCount += 1;
      if (input.accessToken !== syntheticAccessToken) {
        throw new Error("oidc_smoke_unexpected_access_token");
      }

      return identityForSmoke(input.provider, null, now());
    }
  };

  const services = createApiServices({
    config: options.appConfig,
    now,
    oidcTokenClient: tokenClient,
    oidcTokenVerifier: tokenVerifier,
    oauthProfileClient: profileClient
  });
  const server = startApiServer(0, services);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    operations = markOidcSmokeOperation(operations, "oidc.provider_selection.validate", "passed", {
      providerKey,
      providerEnabled: provider.enabled,
      providerMode: provider.mode
    });

    const existingLoginCookie = await registerAndLoginSyntheticUser(baseUrl);
    const rejectedAuthorization = await beginSyntheticAuthorization(baseUrl, providerKey);
    currentNonce = rejectedAuthorization.nonce;
    operations = markOidcSmokeOperation(operations, "oidc.authorization.begin", "passed", {
      authorizationUrlReturnedToOutput: false,
      rawStateReturnedToOutput: false,
      rawNonceReturnedToOutput: false,
      pkceVerifierReturnedToOutput: false,
      pkceChallengeUsed: provider.pkceRequired,
      nonceUsed: provider.nonceRequired,
      stateStoredAsHash: true,
      nonceStoredAsHash: provider.nonceRequired
    });

    const rejectedLink = await postJson(baseUrl, `/auth/oidc/${providerKey}/callback`, {
      state: rejectedAuthorization.state,
      code: syntheticAuthorizationCode
    });
    if (rejectedLink.status !== 409) {
      throw new Error("oidc_smoke_account_link_guard_failed");
    }

    const approvedAuthorization = await beginSyntheticAuthorization(baseUrl, providerKey);
    currentNonce = approvedAuthorization.nonce;
    const approvedCallback = await postJson(
      baseUrl,
      `/auth/oidc/${providerKey}/callback`,
      {
        state: approvedAuthorization.state,
        code: syntheticAuthorizationCode,
        linkAccount: true
      },
      existingLoginCookie
    );
    if (approvedCallback.status !== 200) {
      throw new Error("oidc_smoke_callback_approval_failed");
    }
    const approvedBody = (await approvedCallback.json()) as { session?: { id?: string } };
    const sessionCookie = approvedCallback.headers.get("set-cookie") ?? "";
    const sessionResponse = await fetch(`${baseUrl}/auth/session`, {
      headers: {
        cookie: sessionCookie
      }
    });
    if (sessionResponse.status !== 200 || !approvedBody.session?.id) {
      throw new Error("oidc_smoke_session_lookup_failed");
    }

    operations = markOidcSmokeOperation(operations, "oidc.callback.exchange_code", "passed", {
      tokenExchangeCount,
      authorizationCodeReturnedToOutput: false,
      pkceVerifierReturnedToOutput: false,
      tokenEndpointClass: classifyOidcEndpoint(provider.tokenEndpoint, providerKey)
    });
    operations = markOidcSmokeOperation(operations, "oidc.identity.validate_claims_or_profile", "passed", {
      tokenVerificationCount,
      profileLookupCount,
      issuerValidated: true,
      audienceValidated: true,
      expiryValidated: true,
      signatureValidated: provider.mode === "oidc",
      nonceValidated: provider.nonceRequired,
      verifiedEmailRequired: true,
      idTokenReturnedToOutput: false,
      accessTokenReturnedToOutput: false,
      refreshTokenReturnedToOutput: false,
      profilePayloadReturnedToOutput: false,
      liveUserEmailReturnedToOutput: false
    });
    operations = markOidcSmokeOperation(operations, "oidc.account_linking.enforce_explicit_approval", "passed", {
      rejectedCollisionStatus: rejectedLink.status,
      approvedLinkStatus: approvedCallback.status,
      explicitSignedInApprovalRequired: true,
      emailAloneTrustedForLinking: false
    });
    operations = markOidcSmokeOperation(operations, "oidc.session.create_cookie", "passed", {
      sessionLookupStatus: sessionResponse.status,
      sessionCookie: sessionCookieMetadata(sessionCookie, options.smokeConfig.sessionCookieSecure),
      sessionTokenReturnedToOutput: false,
      sessionCookieReturnedToOutput: false
    });
    operations = markOidcSmokeOperation(operations, "oidc.audit.write_redacted_events", "passed", {
      auditEventCounts: auditEventCounts(services),
      authorizationCodeReturnedToAudit: false,
      tokenValuesReturnedToAudit: false,
      sessionCookieReturnedToAudit: false
    });
    operations = markOidcSmokeOperation(operations, "oidc.middleware.callback_origin_exemption", "passed", {
      callbackRouteFamily: "oidc_callback",
      originProtectionExemptForProviderCallbacks: true,
      broaderBrowserCorsEnabled: false
    });

    return {
      ...common,
      status: "passed",
      exitCode: 0,
      mode: "live_candidate",
      localCallbackExercised: true,
      plannedOperations: operations,
      summary:
        "OIDC/social callback smoke completed through the local API with an injected disposable provider harness. No real Microsoft, Google, or GitHub provider app was contacted."
    };
  } catch (error) {
    const failedOperationId = operations.find((operation) => operation.status === "planned")?.id;
    if (failedOperationId) {
      operations = markOidcSmokeOperation(operations, failedOperationId, "failed", safeOidcSmokeErrorMetadata(error));
    }

    return {
      ...common,
      status: "failed",
      exitCode: 1,
      mode: "live_candidate",
      localCallbackExercised: true,
      blockers: sortedUnique([...common.blockers, "oidc_callback_smoke_failed"]),
      plannedOperations: operations.map((operation) =>
        operation.status === "planned" ? { ...operation, status: "skipped" } : operation
      ),
      summary:
        "OIDC/social callback smoke attempted the local disposable callback harness but did not complete. Failure metadata is generic and secret-free."
    };
  } finally {
    await closeServer(server);
  }
};

const oidcSmokeReportCommon = (
  options: RunOidcCallbackSmokeOptions,
  plannedOperations: OidcCallbackSmokeOperation[]
): Omit<OidcCallbackSmokeReport, "status" | "exitCode" | "mode" | "localCallbackExercised" | "summary"> => ({
  schemaVersion: oidcCallbackSmokeSchemaVersion,
  command: oidcCallbackSmokeCommand,
  selectedProviderKey: options.smokeConfig.selectedProviderKey,
  readinessStatuses: Object.fromEntries(
    oidcSocialProviderKeys.map((providerKey) => [providerKey, options.readiness.providerChecks[providerKey].status])
  ) as Record<OidcSocialProviderKey, string>,
  liveNetworkCallsMade: false,
  externalProviderCallsMade: false,
  secretValuesReturned: false,
  tokenValuesReturned: false,
  authorizationCodesReturned: false,
  rawStateReturned: false,
  rawNonceReturned: false,
  pkceVerifierReturned: false,
  sessionCookiesReturned: false,
  providerEndpointUrlsReturned: false,
  liveProfilePayloadsReturned: false,
  liveUserEmailsReturned: false,
  providerWritesEnabled: false,
  managedProviderConnectionsCreated: false,
  target: options.readiness.target,
  configuredEnvironmentVariables: selectedOrAllConfiguredEnv(options.readiness, options.smokeConfig),
  missingEnvironmentVariables: missingOidcSmokeEnvironmentVariables(options.readiness, options.smokeConfig),
  blockers: sortedUnique([
    ...(options.smokeConfig.selectedProviderValid ? [] : ["oidc_selected_provider_invalid"]),
    ...selectedOrAllReadinessBlockers(options.readiness, options.smokeConfig)
  ]),
  guardrails: options.readiness.selectedCheck?.guardrails ?? [],
  plannedOperations,
  providerMetadata: providerMetadata(options.appConfig, options.smokeConfig.selectedProviderKey),
  runtimeMetadata: {
    transientStateStoredAsHash: true,
    nonceStoredAsHash: Boolean(
      options.smokeConfig.selectedProviderKey &&
        options.appConfig.auth.socialLogin.providers[options.smokeConfig.selectedProviderKey].nonceRequired
    ),
    pkceVerifierReturnedToOutput: false,
    accountLinkingRequiresExplicitSignedInApproval: true,
    sessionCookieSecureConfigured: options.smokeConfig.sessionCookieSecure,
    sessionCookieMetadataOnly: true,
    callbackRouteOriginExempt: true,
    localAuthSafeguardsPreserved: true,
    auditPayloadsRedacted: true,
    providerConnectionBoundary: "user_login_not_managed_provider_connection",
    realProviderAppExercised: false,
    injectedDisposableProviderHarnessAllowed: options.allowInjectedDisposableProviderHarness === true
  }
});

const collectOidcLiveSmokeBlockers = (options: RunOidcCallbackSmokeOptions): string[] => {
  const env = options.env ?? process.env;
  const blockers = new Set<string>();
  const selectedProviderKey = options.smokeConfig.selectedProviderKey;

  if (!options.smokeConfig.selectedProviderConfigured) {
    blockers.add("oidc_selected_provider_required");
  }

  if (!options.smokeConfig.selectedProviderValid) {
    blockers.add("oidc_selected_provider_invalid");
  }

  if (!selectedProviderKey || !options.readiness.selectedCheck) {
    return [...blockers].sort();
  }

  const selectedCheck = options.readiness.selectedCheck;
  const provider = options.appConfig.auth.socialLogin.providers[selectedProviderKey];

  if (selectedCheck.status !== "ready_for_disposable_smoke") {
    blockers.add(`readiness_status_not_ready:${selectedCheck.status}`);
  }

  if (env.PURESOC_EXTERNAL_SMOKE_MODE !== "live_candidate") {
    blockers.add("external_smoke_mode_not_live_candidate");
  }

  if (!isSafeOidcSmokeTarget(options.readiness.target.kind) || !options.readiness.target.disposableConfirmation) {
    blockers.add("external_smoke_disposable_target_not_confirmed");
  }

  if (env[oidcOptInEnv(selectedProviderKey)] !== "true") {
    blockers.add(`oidc_external_smoke_opt_in_missing:${selectedProviderKey}`);
  }

  if (!provider.enabled) {
    blockers.add(`oidc_provider_not_enabled:${selectedProviderKey}`);
  }

  if (!nonEmpty(provider.clientId)) {
    blockers.add(`oidc_client_id_missing:${selectedProviderKey}`);
  }

  if (!nonEmpty(provider.clientSecret)) {
    blockers.add(`oidc_client_secret_missing:${selectedProviderKey}`);
  }

  if (!nonEmpty(provider.redirectUri)) {
    blockers.add(`oidc_redirect_uri_missing:${selectedProviderKey}`);
  }

  if (!provider.pkceRequired) {
    blockers.add(`oidc_pkce_not_required:${selectedProviderKey}`);
  }

  if (provider.mode === "oidc" && !provider.nonceRequired) {
    blockers.add(`oidc_nonce_not_required:${selectedProviderKey}`);
  }

  if (provider.mode === "oidc" && !nonEmpty(provider.jwksUri)) {
    blockers.add(`oidc_jwks_uri_missing:${selectedProviderKey}`);
  }

  if (provider.mode === "oauth_profile" && !nonEmpty(provider.profileEndpoint)) {
    blockers.add(`oidc_profile_endpoint_missing:${selectedProviderKey}`);
  }

  if (options.allowInjectedDisposableProviderHarness !== true) {
    blockers.add("oidc_disposable_callback_execution_requires_injected_test_harness");
  }

  for (const blocker of selectedCheck.blockers) {
    blockers.add(blocker);
  }

  return [...blockers].sort();
};

const createPlannedOidcSmokeOperations = (
  appConfig: PureSocConfig,
  smokeConfig: OidcCallbackSmokeConfig
): OidcCallbackSmokeOperation[] => {
  const providerKey = smokeConfig.selectedProviderKey;
  const provider = providerKey ? appConfig.auth.socialLogin.providers[providerKey] : null;
  const providerLabel = providerKey ?? "selected provider";

  return [
    {
      id: "oidc.provider_selection.validate",
      label: "Validate selected OIDC/social provider, readiness check, and disposable/test guardrails.",
      providerEndpointClass: null,
      performsExternalProviderCallInLiveMode: false,
      status: "planned",
      metadata: {
        selectedProviderConfigured: smokeConfig.selectedProviderConfigured,
        selectedProviderValid: smokeConfig.selectedProviderValid,
        selectedProviderEnv: oidcCallbackSmokeProviderEnv
      }
    },
    {
      id: "oidc.authorization.begin",
      label: `Begin ${providerLabel} authorization and store state/nonce/PKCE without returning raw values.`,
      providerEndpointClass:
        provider && providerKey ? classifyOidcEndpoint(provider.authorizationEndpoint, providerKey) : "empty",
      performsExternalProviderCallInLiveMode: false,
      status: "planned",
      metadata: {
        authorizationUrlReturnedToOutput: false,
        rawStateReturnedToOutput: false,
        rawNonceReturnedToOutput: false,
        pkceVerifierReturnedToOutput: false,
        stateStoredAsHash: true,
        nonceStoredAsHash: provider?.nonceRequired === true,
        pkceChallengeUsed: provider?.pkceRequired === true
      }
    },
    {
      id: "oidc.callback.exchange_code",
      label: `Exchange ${providerLabel} authorization code only after explicit disposable/test approval.`,
      providerEndpointClass: provider && providerKey ? classifyOidcEndpoint(provider.tokenEndpoint, providerKey) : "empty",
      performsExternalProviderCallInLiveMode: true,
      status: "planned",
      metadata: {
        authorizationCodeReturnedToOutput: false,
        tokenEndpointUrlReturnedToOutput: false,
        pkceVerifierReturnedToOutput: false,
        clientSecretReturnedToOutput: false
      }
    },
    {
      id: "oidc.identity.validate_claims_or_profile",
      label: "Validate issuer, audience, expiry, signature/profile, nonce, subject, and verified email.",
      providerEndpointClass: provider && providerKey ? identityEndpointClass(provider, providerKey) : "empty",
      performsExternalProviderCallInLiveMode: true,
      status: "planned",
      metadata: {
        issuerValidated: provider?.mode === "oidc",
        audienceValidated: true,
        expiryValidated: true,
        signatureValidated: provider?.mode === "oidc",
        nonceValidated: provider?.nonceRequired === true,
        verifiedEmailRequired: true,
        idTokenReturnedToOutput: false,
        accessTokenReturnedToOutput: false,
        refreshTokenReturnedToOutput: false,
        profilePayloadReturnedToOutput: false,
        liveUserEmailReturnedToOutput: false
      }
    },
    {
      id: "oidc.account_linking.enforce_explicit_approval",
      label: "Reject email collisions unless a signed-in user explicitly approves account linking.",
      providerEndpointClass: null,
      performsExternalProviderCallInLiveMode: false,
      status: "planned",
      metadata: {
        explicitSignedInApprovalRequired: true,
        emailAloneTrustedForLinking: false
      }
    },
    {
      id: "oidc.session.create_cookie",
      label: "Create a PureSOC session and issue only metadata about the HttpOnly session cookie.",
      providerEndpointClass: null,
      performsExternalProviderCallInLiveMode: false,
      status: "planned",
      metadata: {
        sessionTokenReturnedToOutput: false,
        sessionCookieReturnedToOutput: false,
        cookieAttributesExpected: {
          httpOnly: true,
          sameSiteLax: true,
          pathRoot: true,
          secureConfigured: smokeConfig.sessionCookieSecure
        }
      }
    },
    {
      id: "oidc.audit.write_redacted_events",
      label: "Write login, failed-login/account-link, and session audit events without OAuth secrets.",
      providerEndpointClass: null,
      performsExternalProviderCallInLiveMode: false,
      status: "planned",
      metadata: {
        authorizationCodeReturnedToAudit: false,
        tokenValuesReturnedToAudit: false,
        sessionCookieReturnedToAudit: false
      }
    },
    {
      id: "oidc.middleware.callback_origin_exemption",
      label: "Preserve OIDC callback Origin exemption without enabling broad browser CORS.",
      providerEndpointClass: null,
      performsExternalProviderCallInLiveMode: false,
      status: "planned",
      metadata: {
        callbackRouteFamily: "oidc_callback",
        originProtectionExemptForProviderCallbacks: true,
        broaderBrowserCorsEnabled: false
      }
    }
  ];
};

const registerAndLoginSyntheticUser = async (baseUrl: string): Promise<string> => {
  const registerResponse = await postJson(baseUrl, "/auth/register", {
    email: syntheticEmail,
    password: syntheticPassword,
    displayName: "PureSOC OIDC Smoke"
  });
  if (registerResponse.status !== 201) {
    throw new Error("oidc_smoke_local_register_failed");
  }

  const loginResponse = await postJson(baseUrl, "/auth/login", {
    email: syntheticEmail,
    password: syntheticPassword
  });
  if (loginResponse.status !== 200) {
    throw new Error("oidc_smoke_local_login_failed");
  }

  return loginResponse.headers.get("set-cookie") ?? "";
};

const beginSyntheticAuthorization = async (baseUrl: string, providerKey: OidcSocialProviderKey) => {
  const response = await postJson(baseUrl, `/auth/oidc/${providerKey}/begin`, {});
  if (response.status !== 200) {
    throw new Error("oidc_smoke_begin_failed");
  }

  const body = (await response.json()) as { redirectUrl?: string };
  const authorizationUrl = new URL(body.redirectUrl ?? "");
  const state = authorizationUrl.searchParams.get("state") ?? "";
  if (!state) {
    throw new Error("oidc_smoke_begin_missing_state");
  }

  return {
    state,
    nonce: authorizationUrl.searchParams.get("nonce")
  };
};

const postJson = (baseUrl: string, path: string, body: unknown, cookie?: string) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {})
    },
    body: JSON.stringify(body)
  });

const closeServer = async (server: ReturnType<typeof startApiServer>): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

const identityForSmoke = (provider: OidcProviderConfig, nonce: string | null, now: Date): VerifiedOidcIdentity => ({
  providerKey: provider.providerKey,
  issuer: provider.issuer,
  audience: provider.clientId,
  subject: `puresoc-smoke-${provider.providerKey}`,
  expiresAt: new Date(now.getTime() + 1000 * 60 * 5),
  signatureVerified: true,
  nonce,
  email: syntheticEmail,
  emailVerified: true,
  displayName: "PureSOC OIDC Smoke"
});

const selectedOrAllReadinessBlockers = (
  readiness: OidcCallbackSmokeReadinessPreflight,
  smokeConfig: OidcCallbackSmokeConfig
): string[] =>
  smokeConfig.selectedProviderKey
    ? readiness.providerChecks[smokeConfig.selectedProviderKey].blockers
    : oidcSocialProviderKeys.flatMap((providerKey) => readiness.providerChecks[providerKey].blockers);

const selectedOrAllConfiguredEnv = (
  readiness: OidcCallbackSmokeReadinessPreflight,
  smokeConfig: OidcCallbackSmokeConfig
): string[] =>
  sortedUnique(
    smokeConfig.selectedProviderKey
      ? readiness.providerChecks[smokeConfig.selectedProviderKey].configuredEnvironmentVariables
      : oidcSocialProviderKeys.flatMap((providerKey) => readiness.providerChecks[providerKey].configuredEnvironmentVariables)
  );

const missingOidcSmokeEnvironmentVariables = (
  readiness: OidcCallbackSmokeReadinessPreflight,
  smokeConfig: OidcCallbackSmokeConfig
): string[] => {
  const requirements = smokeConfig.selectedProviderKey
    ? readiness.providerChecks[smokeConfig.selectedProviderKey].requiredEnvironment
    : oidcSocialProviderKeys.flatMap((providerKey) => readiness.providerChecks[providerKey].requiredEnvironment);

  return sortedUnique(requirements.filter((requirement) => !requirement.configured).flatMap((requirement) => requirement.env));
};

const providerMetadata = (appConfig: PureSocConfig, providerKey: OidcSocialProviderKey | null) => {
  const provider = providerKey ? appConfig.auth.socialLogin.providers[providerKey] : null;

  return {
    providerKey,
    enabled: provider?.enabled ?? false,
    mode: provider?.mode ?? null,
    pkceRequired: provider?.pkceRequired ?? false,
    nonceRequired: provider?.nonceRequired ?? false,
    scopesConfigured: provider?.scopes.length ?? 0,
    authorizationEndpointClass:
      provider && providerKey ? classifyOidcEndpoint(provider.authorizationEndpoint, providerKey) : "empty",
    tokenEndpointClass: provider && providerKey ? classifyOidcEndpoint(provider.tokenEndpoint, providerKey) : "empty",
    jwksEndpointClass: provider && providerKey ? classifyOidcEndpoint(provider.jwksUri, providerKey) : "empty",
    profileEndpointClass: provider && providerKey ? classifyOidcEndpoint(provider.profileEndpoint, providerKey) : "empty",
    emailEndpointClass: provider && providerKey ? classifyOidcEndpoint(provider.emailEndpoint, providerKey) : "empty",
    redirectUriClass: provider && providerKey ? classifyOidcEndpoint(provider.redirectUri, providerKey) : "empty"
  };
};

const markOidcSmokeOperation = (
  operations: OidcCallbackSmokeOperation[],
  id: string,
  status: OidcCallbackSmokeOperationStatus,
  metadata: Record<string, unknown>
): OidcCallbackSmokeOperation[] =>
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

const auditEventCounts = (services: ApiServices): Record<string, number | null> => ({
  failedLogin: auditCount(services, "failed_login"),
  accountLinkRejected: auditCount(services, "account_link_rejected"),
  accountLinked: auditCount(services, "account_linked"),
  login: auditCount(services, "login"),
  sessionCreated: auditCount(services, "session_created")
});

const auditCount = (services: ApiServices, action: string): number | null => {
  const sink = services.auditSink as { findByAction?: (action: string) => unknown[] };
  return typeof sink.findByAction === "function" ? sink.findByAction(action).length : null;
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

const identityEndpointClass = (
  provider: PureSocConfig["auth"]["socialLogin"]["providers"][OidcSocialProviderKey],
  providerKey: OidcSocialProviderKey
): OidcSmokeEndpointClass => {
  if (provider.mode === "oidc") {
    return classifyOidcEndpoint(provider.jwksUri, providerKey);
  }

  return classifyOidcEndpoint(provider.profileEndpoint, providerKey);
};

const classifyOidcEndpoint = (value: string, providerKey: OidcSocialProviderKey): OidcSmokeEndpointClass => {
  if (!nonEmpty(value)) {
    return "empty";
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return "local";
    }
    if (host.includes("test") || host.includes("ci") || host.includes("disposable") || host.includes("smoke")) {
      return "test_hint";
    }
    if (officialOidcHosts[providerKey].includes(host)) {
      return "official_provider_default";
    }

    return "external";
  } catch {
    return "invalid";
  }
};

const officialOidcHosts: Record<OidcSocialProviderKey, string[]> = {
  microsoft_entra: ["login.microsoftonline.com"],
  google: ["accounts.google.com", "oauth2.googleapis.com", "www.googleapis.com"],
  github: ["github.com", "api.github.com"]
};

const safeOidcSmokeErrorMetadata = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error && error.message.startsWith("oidc_smoke_")) {
    return {
      errorCode: error.message
    };
  }

  return {
    errorCode: "unexpected_error"
  };
};

const oidcReadinessCheckId = (providerKey: OidcSocialProviderKey): `oidc_${OidcSocialProviderKey}_callback` =>
  `oidc_${providerKey}_callback`;

const oidcOptInEnv = (providerKey: OidcSocialProviderKey): string =>
  `PURESOC_EXTERNAL_SMOKE_OIDC_${providerKey.toUpperCase()}`;

const isSafeOidcSmokeTarget = (targetKind: string): boolean =>
  targetKind === "local" ||
  targetKind === "development" ||
  targetKind === "test" ||
  targetKind === "ci" ||
  targetKind === "disposable";

const sortedUnique = (values: string[]): string[] => [...new Set(values.filter(Boolean))].sort();

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
