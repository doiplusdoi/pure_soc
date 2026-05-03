import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";

const grepIndex = process.argv.indexOf("--grep");
const grepPattern = grepIndex >= 0 ? process.argv[grepIndex + 1] : "@ui-smoke";
const smokeMode = resolveSmokeMode(grepPattern);

let artifactsDir = "";
let checks = [];
let servers = [];
let runtimeModulesPromise = null;

const VISUAL_METRICS_SCHEMA = "puresoc.ui_smoke.visual_metrics.v1";
const VISUAL_THRESHOLD_VERSION = "m65-lightweight-thresholds.v1";
const DEFAULT_VISUAL_THRESHOLDS = {
  minPngBytes: 6_000,
  minUniqueSampledColors: 24,
  minNonLightRatio: 0.01,
  minEdgeRatio: 0.002,
  minLuminanceStdDev: 3,
  maxDominantColorRatio: 0.985
};
const VISUAL_THRESHOLDS_BY_CAPTURE = {
  "login-mobile": {
    minPngBytes: 4_000,
    minUniqueSampledColors: 18,
    minNonLightRatio: 0.006,
    minEdgeRatio: 0.001,
    minLuminanceStdDev: 2.5,
    maxDominantColorRatio: 0.99
  },
  "dashboard-mobile": {
    minPngBytes: 5_000,
    minUniqueSampledColors: 20,
    minNonLightRatio: 0.008,
    minEdgeRatio: 0.001,
    minLuminanceStdDev: 2.5,
    maxDominantColorRatio: 0.99
  },
  "romania-route-mobile": {
    minPngBytes: 5_000,
    minUniqueSampledColors: 20,
    minNonLightRatio: 0.008,
    minEdgeRatio: 0.001,
    minLuminanceStdDev: 2.5,
    maxDominantColorRatio: 0.99
  }
};
const OPERATIONAL_CONSOLE_ANCHORS = [
  {
    id: "dashboard",
    action: "open-dashboard-anchor",
    href: "#dashboard",
    sectionSelector: "#dashboard",
    hash: "#dashboard",
    expectedText: ["Overall internal readiness", "dashboard_snapshots"]
  },
  {
    id: "onboarding",
    action: "open-onboarding-anchor",
    href: "#onboarding",
    sectionSelector: "#onboarding",
    hash: "#onboarding",
    expectedText: ["Onboarding And Country Packs", "Country pack status"]
  },
  {
    id: "microsoft365",
    action: "open-microsoft365-anchor",
    href: "#microsoft365",
    sectionSelector: "#microsoft365",
    hash: "#microsoft365",
    expectedText: ["Microsoft 365 Connection Health", "Microsoft module health"]
  },
  {
    id: "gaps",
    action: "open-gaps-anchor",
    href: "#gaps",
    sectionSelector: "#gaps",
    hash: "#gaps",
    expectedText: ["Gaps And Recommendations", "Recommendation backlog"]
  },
  {
    id: "evidence",
    action: "open-evidence-reports-anchor",
    href: "#evidence",
    sectionSelector: "#evidence",
    hash: "#evidence",
    expectedText: ["Evidence And Reports", "Internal readiness report"]
  },
  {
    id: "approvals",
    action: "open-approval-queue-anchor",
    href: "#approvals",
    sectionSelector: "#approvals",
    hash: "#approvals",
    expectedText: ["Approval Queue", "Provider write execution remains disabled"]
  }
];

if (smokeMode === "ui") {
  await runServedUiSmoke();
} else if (smokeMode === "browser") {
  await runBrowserSmoke();
} else {
  console.log(
    JSON.stringify({
      schema: "puresoc.ui_smoke.runner.v1",
      status: "skipped",
      reason: "run-ui-smoke owns @ui-smoke and @browser-smoke only",
      requestedGrep: grepPattern
    })
  );
}

function resolveSmokeMode(pattern) {
  if (pattern.includes("@browser-smoke")) {
    return "browser";
  }

  if (pattern.includes("@ui-smoke")) {
    return "ui";
  }

  return "skip";
}

function initSmokeState(prefix) {
  artifactsDir = mkdtempSync(join(tmpdir(), prefix));
  checks = [];
  servers = [];
}

async function loadRuntimeModules() {
  if (!runtimeModulesPromise) {
    runtimeModulesPromise = (async () => {
      const { createJiti } = await import(pathToFileURL(join(resolvePnpmPackageDir("jiti"), "lib", "jiti.mjs")).href);
      const jiti = createJiti(import.meta.url);
      const { loadConfig } = await jiti.import("../packages/config/src/index.ts");
      const { createApiServices } = await jiti.import("../apps/api/src/auth/services.ts");
      const { startApiServer } = await jiti.import("../apps/api/src/server.ts");
      const { startWebServer } = await jiti.import("../apps/web/src/server.ts");

      return {
        loadConfig,
        createApiServices,
        startApiServer,
        startWebServer
      };
    })();
  }

  return runtimeModulesPromise;
}

async function runServedUiSmoke() {
  initSmokeState("puresoc-ui-smoke-");

  try {
    const { startWebServer } = await loadRuntimeModules();
    const webPort = await getFreePort();
    const webBaseUrl = `http://127.0.0.1:${webPort}`;
    const apiServer = await startApiSmokeServer({
      webBaseUrl,
      secureCookie: false
    });
    servers.push(apiServer.server);
    const apiBaseUrl = apiServer.baseUrl;
    const apiBackedDashboard = await seedApiBackedWebDashboard({
      apiBaseUrl,
      webBaseUrl,
      emailPrefix: "m53-ui"
    });

    const webServer = startWebServer(webPort, {
      apiBaseUrl,
      publicBaseUrl: webBaseUrl
    });
    servers.push(webServer);
    await waitForListening(webServer);

    const unauthenticatedHtml = await fetchText(`${webBaseUrl}/`);
    const loginHtml = await fetchText(`${webBaseUrl}/login`);
    const health = await fetchJson(`${webBaseUrl}/health`);
    record("web_health_contract", health.service === "puresoc-web" && health.status === "ok");
    record("web_health_is_api_backed", health.apiBacked === true);

    const webLogin = await loginThroughWeb({
      webBaseUrl,
      email: apiBackedDashboard.email,
      password: apiBackedDashboard.password
    });
    const webSession = await fetchJson(`${webBaseUrl}/auth/session`, {
      headers: {
        cookie: webLogin.cookie
      }
    });
    record("web_session_proxy_starts_without_active_organization", webSession.session?.activeOrganizationId === null);
    const workspaceSelectionHtml = await fetchText(`${webBaseUrl}/workspaces`, {
      headers: {
        cookie: webLogin.cookie
      }
    });
    assertWorkspaceSelectionHtml(workspaceSelectionHtml, apiBackedDashboard);
    await selectWorkspaceThroughWeb({
      webBaseUrl,
      cookie: webLogin.cookie,
      organizationId: apiBackedDashboard.selectedOrganization.organizationId
    });
    const selectedWebSession = await fetchJson(`${webBaseUrl}/auth/session`, {
      headers: {
        cookie: webLogin.cookie
      }
    });
    record(
      "web_session_proxy_returns_selected_active_organization",
      selectedWebSession.session?.activeOrganizationId === apiBackedDashboard.selectedOrganization.organizationId
    );
    const consoleHtml = await fetchText(`${webBaseUrl}/`, {
      headers: {
        cookie: webLogin.cookie
      }
    });
    assertApiBackedDashboardHtml(consoleHtml, apiBackedDashboard);
    const romaniaRouteHtml = await fetchText(`${webBaseUrl}/onboarding/romania?locale=ro-RO`);
    assertRomaniaOnboardingRoute(romaniaRouteHtml);

    const desktopSnapshot = writeViewportSnapshot({
      name: "desktop",
      width: 1440,
      height: 900,
      html: consoleHtml
    });
    const mobileSnapshot = writeViewportSnapshot({
      name: "mobile",
      width: 390,
      height: 844,
      html: consoleHtml
    });
    const workspaceDesktopSnapshot = writeViewportSnapshot({
      name: "workspaces-desktop",
      width: 1440,
      height: 900,
      html: workspaceSelectionHtml
    });
    const workspaceMobileSnapshot = writeViewportSnapshot({
      name: "workspaces-mobile",
      width: 390,
      height: 844,
      html: workspaceSelectionHtml
    });
    const romaniaDesktopSnapshot = writeViewportSnapshot({
      name: "romania-desktop",
      width: 1440,
      height: 900,
      html: romaniaRouteHtml
    });
    const romaniaMobileSnapshot = writeViewportSnapshot({
      name: "romania-mobile",
      width: 390,
      height: 844,
      html: romaniaRouteHtml
    });

    record("unauthenticated_root_prompts_for_login", htmlText(unauthenticatedHtml).includes("Sign in to open the operational console"));
    assertOperationalConsole(consoleHtml, loginHtml);
    assertResponsiveLayout(consoleHtml);
    assertNoObviousOverlapRegression(consoleHtml);
    await assertBrowserAuthMiddlewareSmoke({
      apiBaseUrl,
      webBaseUrl,
      expectSecureCookie: false
    });

    await closeServer(apiServer.server);

    const secureApiServer = await startApiSmokeServer({
      webBaseUrl,
      secureCookie: true
    });
    servers.push(secureApiServer.server);
    await assertBrowserAuthMiddlewareSmoke({
      apiBaseUrl: secureApiServer.baseUrl,
      webBaseUrl,
      expectSecureCookie: true,
      emailSuffix: "secure"
    });

    console.log(
      JSON.stringify(
        {
          schema: "puresoc.ui_smoke.served_web.v1",
          status: "passed",
          smokeMode: "local_http_browser_substitute",
          substitution:
            "No bundled Playwright/browser binary is required; the smoke starts local web/API HTTP servers, fetches rendered HTML, writes deterministic viewport HTML snapshots, and checks browser-relevant cookie/origin behavior through fetch.",
          artifacts: {
            directory: artifactsDir,
            desktopSnapshot,
            mobileSnapshot,
            workspaceSelection: {
              desktopSnapshot: workspaceDesktopSnapshot,
              mobileSnapshot: workspaceMobileSnapshot
            },
            romaniaRoute: {
              desktopSnapshot: romaniaDesktopSnapshot,
              mobileSnapshot: romaniaMobileSnapshot
            }
          },
          checks: checkNames(),
          nonLiveGuarantees: nonLiveGuarantees()
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          schema: "puresoc.ui_smoke.served_web.v1",
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          checks: checkNames(),
          artifacts: {
            directory: artifactsDir
          }
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  } finally {
    await closeAllServers();
  }
}

async function runBrowserSmoke() {
  initSmokeState("puresoc-browser-smoke-");
  let browser = null;

  try {
    const firefoxPath = resolveFirefoxExecutable();
    if (!firefoxPath || typeof WebSocket === "undefined") {
      console.log(
        JSON.stringify(
          {
            schema: "puresoc.ui_smoke.browser.v1",
            status: "blocked",
            blocker: !firefoxPath ? "firefox_not_found" : "node_websocket_unavailable",
            fallback:
              "Run pnpm test:e2e -- --grep @ui-smoke for the deterministic M39 HTTP fallback. Browser PNG/auth plus keyboard and pointer navigation coverage, including Romania route coverage, is not claimed when this blocker is present.",
            artifacts: {
              directory: artifactsDir
            },
            nonLiveGuarantees: nonLiveGuarantees()
          },
          null,
          2
        )
      );
      return;
    }

    const { startWebServer } = await loadRuntimeModules();
    const webPort = await getFreePort();
    const webBaseUrl = `http://127.0.0.1:${webPort}`;
    const apiPort = await getFreePort();
    const proxyPort = await getFreePort();
    const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
    const browserAuthBaseUrl = `http://127.0.0.1:${proxyPort}`;
    const browserAuthProxy = await startBrowserAuthProxy({
      apiBaseUrl,
      port: proxyPort
    });
    servers.push(browserAuthProxy.server);
    const apiServer = await startApiSmokeServer({
      webBaseUrl,
      secureCookie: false,
      extraTrustedOrigins: [apiBaseUrl, browserAuthBaseUrl],
      requireOriginOrReferer: true,
      port: apiPort
    });
    servers.push(apiServer.server);
    const apiBackedDashboard = await seedApiBackedWebDashboard({
      apiBaseUrl,
      webBaseUrl,
      emailPrefix: "m53-browser"
    });
    const webServer = startWebServer(webPort, {
      apiBaseUrl,
      publicBaseUrl: webBaseUrl
    });
    servers.push(webServer);
    await waitForListening(webServer);

    browser = await startFirefoxBidiBrowser(firefoxPath);
    const context = await createBrowserContext(browser);
    await assertBrowserWebRuntimeLogin(browser, context, webBaseUrl, apiBackedDashboard);
    const anchorNavigation = {
      keyboard: await assertBrowserOperationalConsoleAnchorKeyboardNavigation(browser, context, webBaseUrl),
      pointer: await assertBrowserOperationalConsoleAnchorPointerNavigation(browser, context, webBaseUrl)
    };
    const keyboardNavigation = await assertBrowserRouteKeyboardNavigation(browser, context, webBaseUrl);
    const pointerNavigation = await assertBrowserRoutePointerNavigation(browser, context, webBaseUrl);
    const routeNavigation = {
      keyboard: keyboardNavigation,
      pointer: pointerNavigation
    };
    const screenshots = [];

    screenshots.push(
      await captureBrowserPage(browser, {
        context,
        name: "dashboard-desktop",
        url: `${webBaseUrl}/`,
        width: 1440,
        height: 900,
        expectedText: ["Overall internal readiness", "not a legal opinion"],
        expectOperationalConsole: true
      })
    );
    screenshots.push(
      await captureBrowserPage(browser, {
        context,
        name: "dashboard-mobile",
        url: `${webBaseUrl}/`,
        width: 390,
        height: 844,
        expectedText: ["Overall internal readiness", "Country pack"],
        expectOperationalConsole: true
      })
    );
    screenshots.push(
      await captureBrowserPage(browser, {
        context,
        name: "login-mobile",
        url: `${webBaseUrl}/login`,
        width: 390,
        height: 844,
        expectedText: ["Sign in", "PureSOC internal readiness console"],
        expectLoginScreen: true,
        expectOperationalConsole: false
      })
    );
    screenshots.push(
      await captureBrowserPage(browser, {
        context,
        name: "evidence-desktop",
        url: `${webBaseUrl}/`,
        width: 1440,
        height: 900,
        scrollTarget: "#evidence",
        expectedText: ["Evidence And Reports", "Internal readiness report"],
        expectOperationalConsole: true
      })
    );
    screenshots.push(
      await captureBrowserPage(browser, {
        context,
        name: "approvals-desktop",
        url: `${webBaseUrl}/`,
        width: 1440,
        height: 900,
        scrollTarget: "#approvals",
        expectedText: ["Approval Queue", "Provider write execution remains disabled"],
        expectOperationalConsole: true
      })
    );
    screenshots.push(
      await captureBrowserPage(browser, {
        context,
        name: "romania-route-desktop",
        url: `${webBaseUrl}/onboarding/romania?locale=ro-RO`,
        width: 1440,
        height: 900,
        expectedText: [
          "Romania NIS2 Onboarding",
          "Source Map Sample",
          "not a legal opinion",
          "missing_translation",
          "PureSOC does not submit this draft to DNSC."
        ],
        expectRomaniaRoute: true
      })
    );
    screenshots.push(
      await captureBrowserPage(browser, {
        context,
        name: "romania-route-mobile",
        url: `${webBaseUrl}/onboarding/romania?locale=ro-RO`,
        width: 390,
        height: 844,
        expectedText: [
          "Romania NIS2 Onboarding",
          "Direct DNSC submission",
          "Submitted to DNSC",
          "false"
        ],
        expectRomaniaRoute: true
      })
    );

    const visualMetricsManifest = writeVisualMetricsManifest(screenshots);
    const browserAuth = await assertBrowserAuthSessionSmoke(browser, context, browserAuthBaseUrl);
    await assertOriginExemptionHttpSmoke({ apiBaseUrl });

    const secureApiServer = await startApiSmokeServer({
      webBaseUrl,
      secureCookie: true,
      extraTrustedOrigins: [webBaseUrl],
      emailPrefix: "m40-secure",
      port: await getFreePort()
    });
    servers.push(secureApiServer.server);
    await assertBrowserAuthMiddlewareSmoke({
      apiBaseUrl: secureApiServer.baseUrl,
      webBaseUrl,
      expectSecureCookie: true,
      emailSuffix: "browser-secure"
    });

    console.log(
      JSON.stringify(
        {
          schema: "puresoc.ui_smoke.browser.v1",
          status: "passed",
          smokeMode: "firefox_webdriver_bidi",
          browser: {
            executable: firefoxPath,
            name: browser.capabilities.browserName,
            version: browser.capabilities.browserVersion,
            headless: browser.capabilities["moz:headless"] === true
          },
          artifacts: {
            directory: artifactsDir,
            screenshots: screenshots.map(formatScreenshotArtifact),
            visualMetricsManifest
          },
          anchorNavigation,
          routeNavigation,
          browserAuth,
          checks: checkNames(),
          fallbackPreserved: "pnpm test:e2e -- --grep @ui-smoke remains the deterministic M39 HTTP fallback.",
          nonLiveGuarantees: nonLiveGuarantees()
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          schema: "puresoc.ui_smoke.browser.v1",
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          browserStderrTail: browser?.stderrTail?.(),
          checks: checkNames(),
          artifacts: {
            directory: artifactsDir
          }
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await closeAllServers();
  }
}

function nonLiveGuarantees() {
  return [
    "no Microsoft Graph calls",
    "no Stripe API calls",
    "no OIDC provider calls",
    "no object-storage or scanner calls",
    "no KMS/secret-manager calls",
    "no public regulatory fetches",
    "no provider write execution"
  ];
}

function record(name, condition, detail = "") {
  if (!condition) {
    throw new Error(`${name} failed${detail ? `: ${detail}` : ""}`);
  }

  checks.push({ name });
}

function checkNames() {
  return [...new Set(checks.map((check) => check.name))];
}

async function startApiSmokeServer({
  webBaseUrl,
  secureCookie,
  extraTrustedOrigins = [],
  requireOriginOrReferer = false,
  port = 0
}) {
  const { loadConfig, createApiServices, startApiServer } = await loadRuntimeModules();
  const trustedOrigins = [...new Set([webBaseUrl, ...extraTrustedOrigins].filter(Boolean))].join(",");
  const config = loadConfig({
    env: {
      ...process.env,
      PURESOC_APP_ENV: "development",
      PURESOC_PERSISTENCE_MODE: "memory",
      PURESOC_AUTH_COOKIE_SECURE: secureCookie ? "true" : "false",
      PURESOC_API_TRUSTED_ORIGINS: trustedOrigins,
      PURESOC_API_REQUIRE_ORIGIN_OR_REFERER: requireOriginOrReferer ? "true" : "false",
      PURESOC_API_RATE_LIMIT_ENABLED: "true",
      PURESOC_API_RATE_LIMIT_MAX_REQUESTS: "500",
      PURESOC_BILLING_PROVIDER: "none"
    }
  });
  const services = createApiServices({
    config,
    now: () => new Date()
  });
  const server = startApiServer(port, services);
  await waitForListening(server);

  return {
    server,
    services,
    baseUrl: serverBaseUrl(server)
  };
}

async function seedApiBackedWebDashboard({ apiBaseUrl, webBaseUrl, emailPrefix }) {
  const credentials = {
    email: `${emailPrefix}-${Date.now()}@example.test`,
    password: "CorrectHorseBatteryStaple42!"
  };
  const requestHeaders = {
    origin: webBaseUrl
  };
  const register = await postJson(
    `${apiBaseUrl}/auth/register`,
    {
      email: credentials.email,
      password: credentials.password,
      displayName: "M64 Web Runtime"
    },
    requestHeaders
  );
  record("web_runtime_api_register_status_created", register.status === 201, String(register.status));

  const login = await postJson(
    `${apiBaseUrl}/auth/login`,
    {
      email: credentials.email,
      password: credentials.password
    },
    requestHeaders
  );
  record("web_runtime_api_seed_login_status_ok", login.status === 200, String(login.status));
  const seedCookie = login.headers.get("set-cookie") ?? "";
  record("web_runtime_api_seed_cookie_present", seedCookie.includes("puresoc_session"));

  const primaryOrganization = await seedWorkspaceDashboard({
    apiBaseUrl,
    requestHeaders,
    seedCookie,
    name: "M64 Primary Workspace",
    countryCode: "RO",
    assessmentSuffix: "primary",
    warning: "M64 primary workspace smoke",
    countryPackCompleteness: 61,
    findingSeverity: "medium"
  });
  const selectedOrganization = await seedWorkspaceDashboard({
    apiBaseUrl,
    requestHeaders,
    seedCookie,
    name: "M64 Selected Workspace",
    countryCode: "DE",
    assessmentSuffix: "selected",
    warning: "M64 selected workspace smoke",
    countryPackCompleteness: 86,
    findingSeverity: "high"
  });

  return {
    ...credentials,
    organizationId: selectedOrganization.organizationId,
    assessmentId: selectedOrganization.assessmentId,
    primaryOrganization,
    selectedOrganization,
    expectedDashboardText: "Open gaps"
  };
}

async function seedWorkspaceDashboard({
  apiBaseUrl,
  requestHeaders,
  seedCookie,
  name,
  countryCode,
  assessmentSuffix,
  warning,
  countryPackCompleteness,
  findingSeverity
}) {
  const organization = await postJson(
    `${apiBaseUrl}/organizations`,
    {
      name,
      primaryCountryCode: countryCode
    },
    {
      ...requestHeaders,
      cookie: seedCookie
    }
  );
  record(`web_runtime_api_create_${slug(assessmentSuffix)}_organization_status_created`, organization.status === 201, String(organization.status));
  const organizationBody = await organization.json();
  const organizationId = organizationBody.organization?.id;
  record(`web_runtime_api_${slug(assessmentSuffix)}_organization_id_present`, typeof organizationId === "string" && organizationId.length > 0);

  const assessmentId = `${organizationId}:m64-web-runtime:${assessmentSuffix}`;
  const evaluation = await postJson(
    `${apiBaseUrl}/organizations/${organizationId}/compliance/evaluate`,
    {
      assessmentId,
      jurisdiction: "EU",
      countryPack: {
        countryCode,
        completeness: "planned_full_pack",
        warnings: [warning]
      },
      providerFindings: [
        {
          id: `finding_m64_${slug(assessmentSuffix)}_mfa`,
          providerKey: "microsoft365",
          signalKey: "entra.admin_mfa_gap",
          severity: findingSeverity,
          summary: `Synthetic read-only MFA finding for ${name}.`
        }
      ],
      evidenceArtifacts: [
        {
          id: `evidence_m64_${slug(assessmentSuffix)}_dashboard`,
          title: `${name} dashboard source evidence`,
          scanStatus: "clean",
          sourceType: "generated_report"
        }
      ]
    },
    {
      ...requestHeaders,
      cookie: seedCookie
    }
  );
  record(`web_runtime_api_${slug(assessmentSuffix)}_evaluate_status_ok`, evaluation.status === 200, String(evaluation.status));

  const dashboard = await postJson(
    `${apiBaseUrl}/organizations/${organizationId}/dashboards/snapshots`,
    {
      assessmentId,
      countryPackCompleteness
    },
    {
      ...requestHeaders,
      cookie: seedCookie
    }
  );
  record(`web_runtime_api_${slug(assessmentSuffix)}_dashboard_snapshot_status_created`, dashboard.status === 201, String(dashboard.status));
  const dashboardBody = await dashboard.json();
  record(`web_runtime_api_${slug(assessmentSuffix)}_dashboard_source_is_stored_analysis`, dashboardBody.snapshot?.source === "stored_analysis");

  return {
    assessmentId,
    countryPackCompleteness,
    name,
    organizationId
  };
}

async function loginThroughWeb({ webBaseUrl, email, password, organizationId }) {
  const body = new URLSearchParams({
    email,
    password
  });
  if (organizationId) {
    body.set("activeOrganizationId", organizationId);
  }
  const response = await fetch(`${webBaseUrl}/auth/login`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  record("web_login_proxy_redirects_after_api_login", response.status === 303, String(response.status));
  record("web_login_proxy_redirect_location_dashboard", response.headers.get("location") === "/");
  const cookie = response.headers.get("set-cookie") ?? "";
  record("web_login_proxy_sets_api_session_cookie", cookie.includes("puresoc_session"));
  return {
    cookie
  };
}

async function selectWorkspaceThroughWeb({ webBaseUrl, cookie, organizationId }) {
  const response = await fetch(`${webBaseUrl}/workspaces/select`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie
    },
    body: new URLSearchParams({
      organizationId
    })
  });

  record("web_workspace_select_redirects_after_session_update", response.status === 303, String(response.status));
  record("web_workspace_select_redirect_location_dashboard", response.headers.get("location") === "/");
}

function assertApiBackedDashboardHtml(html, seeded) {
  const text = htmlText(html);
  record("web_dashboard_uses_api_latest_snapshot_route", text.includes("GET /organizations/:orgId/dashboards/snapshots/latest"));
  record("web_dashboard_contains_seeded_api_widget", text.includes(seeded.expectedDashboardText));
  record("web_dashboard_contains_selected_workspace_name", text.includes(seeded.selectedOrganization.name));
  record("web_dashboard_contains_selected_snapshot_id", text.includes(`snapshot ${seeded.selectedOrganization.organizationId}`));
  record("web_dashboard_excludes_unselected_workspace_name", !text.includes(seeded.primaryOrganization.name));
  record("web_dashboard_contains_api_session_user", text.includes("M64 Web Runtime"));
}

function assertWorkspaceSelectionHtml(html, seeded) {
  const text = htmlText(html);
  record("workspace_selection_html_is_nonblank", html.length > 4_000, String(html.length));
  record("workspace_selection_marker_present", html.includes('data-ui-smoke="workspace-selection"'));
  record("workspace_selection_lists_primary_workspace", text.includes(seeded.primaryOrganization.name));
  record("workspace_selection_lists_selected_workspace", text.includes(seeded.selectedOrganization.name));
  record("workspace_selection_posts_to_select_route", html.includes('action="/workspaces/select"'));
  record("workspace_selection_contains_selected_organization_id", html.includes(`value="${seeded.selectedOrganization.organizationId}"`));
  record("workspace_selection_has_no_session_token_leak", !html.includes("sessionToken"));
  record("workspace_selection_has_no_certification_claims", !/certified compliant|guaranteed nis2 compliance|legal compliance approved/i.test(text));
}

async function startBrowserAuthProxy({ apiBaseUrl, port }) {
  const browserAuthBaseUrl = `http://127.0.0.1:${port}`;
  const server = createHttpServer(async (request, response) => {
    const url = new URL(request.url ?? "/", browserAuthBaseUrl);

    if (request.method === "GET" && url.pathname === "/browser-auth") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(
        [
          "<!doctype html>",
          '<html lang="en">',
          "<head><meta charset=\"utf-8\"><title>PureSOC browser auth smoke</title></head>",
          "<body><main><h1>PureSOC browser auth smoke</h1><p>Local browser cookie harness.</p></main></body>",
          "</html>"
        ].join("")
      );
      return;
    }

    if (
      url.pathname.startsWith("/auth/") ||
      /^\/organizations\/[^/]+\/provider-connections\/[^/]+\/consent\/callback$/.test(url.pathname)
    ) {
      const upstream = await proxyBrowserAuthRequest({
        request,
        apiBaseUrl,
        browserAuthBaseUrl,
        pathnameWithSearch: `${url.pathname}${url.search}`
      });
      response.statusCode = upstream.status;
      const contentType = upstream.headers.get("content-type");
      const setCookie = upstream.headers.get("set-cookie");
      if (contentType) {
        response.setHeader("content-type", contentType);
      }
      if (setCookie) {
        response.setHeader("set-cookie", setCookie);
      }
      response.end(await upstream.text());
      return;
    }

    response.statusCode = 404;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: { code: "not_found" } }));
  });

  server.listen(port, "127.0.0.1");
  await waitForListening(server);

  return {
    server,
    baseUrl: browserAuthBaseUrl
  };
}

async function proxyBrowserAuthRequest({ request, apiBaseUrl, browserAuthBaseUrl, pathnameWithSearch }) {
  const body = request.method === "POST" ? await readTextBody(request) : undefined;
  const headers = {
    "content-type": typeof request.headers["content-type"] === "string" ? request.headers["content-type"] : "application/json",
    origin: typeof request.headers.origin === "string" ? request.headers.origin : browserAuthBaseUrl,
    referer: typeof request.headers.referer === "string" ? request.headers.referer : `${browserAuthBaseUrl}/browser-auth`
  };
  if (typeof request.headers.cookie === "string") {
    headers.cookie = request.headers.cookie;
  }

  return fetch(`${apiBaseUrl}${pathnameWithSearch}`, {
    method: request.method,
    headers,
    body
  });
}

async function readTextBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function assertBrowserAuthMiddlewareSmoke({ apiBaseUrl, webBaseUrl, expectSecureCookie, emailSuffix = "default" }) {
  const email = `m39-${emailSuffix}@example.test`;
  const password = "CorrectHorseBatteryStaple42!";

  const blockedOrigin = await postJson(`${apiBaseUrl}/auth/register`, {
    email: `blocked-${email}`,
    password,
    displayName: "Blocked Origin"
  }, {
    origin: "https://evil.example.test"
  });
  record("api_rejects_untrusted_browser_origin", blockedOrigin.status === 403);
  const blockedBody = await blockedOrigin.json();
  record("api_origin_error_is_stable", blockedBody.error?.code === "origin_not_allowed");

  const trustedRegister = await postJson(`${apiBaseUrl}/auth/register`, {
    email,
    password,
    displayName: "M39 Browser Smoke"
  }, {
    origin: webBaseUrl
  });
  record("api_accepts_trusted_browser_origin", trustedRegister.status === 201);

  const trustedLogin = await postJson(`${apiBaseUrl}/auth/login`, {
    email,
    password
  }, {
    origin: webBaseUrl
  });
  record("api_login_sets_session_cookie", trustedLogin.status === 200);
  const setCookie = trustedLogin.headers.get("set-cookie") ?? "";
  record("session_cookie_is_http_only", /;\s*HttpOnly/i.test(setCookie), setCookie);
  record("session_cookie_is_samesite_lax", /;\s*SameSite=Lax/i.test(setCookie), setCookie);
  record("session_cookie_secure_matches_config", /;\s*Secure/i.test(setCookie) === expectSecureCookie, setCookie);
  record("session_cookie_does_not_expose_token_in_body", !(await trustedLogin.text()).includes("sessionToken"));

  const sessionResponse = await fetch(`${apiBaseUrl}/auth/session`, {
    headers: {
      cookie: setCookie
    }
  });
  record("session_cookie_authenticates_local_session", sessionResponse.status === 200);

  const logoutResponse = await fetch(`${apiBaseUrl}/auth/logout`, {
    method: "POST",
    headers: {
      cookie: setCookie,
      origin: webBaseUrl
    }
  });
  record("logout_clears_session_cookie", logoutResponse.status === 200);
  const clearCookie = logoutResponse.headers.get("set-cookie") ?? "";
  record("cleared_cookie_keeps_browser_safety_attributes", /HttpOnly/i.test(clearCookie) && /SameSite=Lax/i.test(clearCookie));
  record("cleared_cookie_secure_matches_config", /;\s*Secure/i.test(clearCookie) === expectSecureCookie, clearCookie);

  const oidcCallback = await postJson(`${apiBaseUrl}/auth/oidc/google/callback`, {
    state: "missing",
    code: "missing"
  }, {
    origin: "https://evil.example.test"
  });
  const oidcBody = await oidcCallback.json();
  record("oidc_callback_origin_exemption_reaches_route", oidcBody.error?.code !== "origin_not_allowed");

  const providerCallback = await postJson(
    `${apiBaseUrl}/organizations/org_m39/provider-connections/microsoft365/consent/callback`,
    {
      state: "missing",
      code: "missing"
    },
    {
      origin: "https://evil.example.test"
    }
  );
  const providerBody = await providerCallback.json();
  record("provider_callback_origin_exemption_reaches_route", providerBody.error?.code !== "origin_not_allowed");
}

async function assertOriginExemptionHttpSmoke({ apiBaseUrl }) {
  const password = "CorrectHorseBatteryStaple42!";
  const blockedOrigin = await postJson(
    `${apiBaseUrl}/auth/register`,
    {
      email: "m40-blocked-origin@example.test",
      password,
      displayName: "Blocked Origin"
    },
    {
      origin: "https://evil.example.test"
    }
  );
  record("browser_smoke_http_fallback_rejects_untrusted_origin", blockedOrigin.status === 403);
  const blockedBody = await blockedOrigin.json();
  record("browser_smoke_http_fallback_origin_error_is_stable", blockedBody.error?.code === "origin_not_allowed");

  const oidcCallback = await postJson(
    `${apiBaseUrl}/auth/oidc/google/callback`,
    {
      state: "missing",
      code: "missing"
    },
    {
      origin: "https://evil.example.test"
    }
  );
  const oidcBody = await oidcCallback.json();
  record("browser_smoke_http_fallback_oidc_callback_exemption", oidcBody.error?.code !== "origin_not_allowed");

  const providerCallback = await postJson(
    `${apiBaseUrl}/organizations/org_m40/provider-connections/microsoft365/consent/callback`,
    {
      state: "missing",
      code: "missing"
    },
    {
      origin: "https://evil.example.test"
    }
  );
  const providerBody = await providerCallback.json();
  record("browser_smoke_http_fallback_provider_callback_exemption", providerBody.error?.code !== "origin_not_allowed");
}

function resolveFirefoxExecutable() {
  const explicitPath = process.env.PURESOC_BROWSER_SMOKE_FIREFOX_BIN ?? process.env.FIREFOX_BIN;
  if (explicitPath && existsSync(explicitPath)) {
    return explicitPath;
  }

  const which = spawnSync("which", ["firefox"], {
    encoding: "utf8"
  });
  const candidate = which.status === 0 ? which.stdout.trim().split("\n")[0] : "";

  return candidate && existsSync(candidate) ? candidate : null;
}

async function startFirefoxBidiBrowser(firefoxPath) {
  const port = await getFreePort();
  const profileDir = mkdtempSync(join(tmpdir(), "puresoc-firefox-bidi-"));
  const stderrChunks = [];
  const firefoxProcess = spawn(
    firefoxPath,
    [
      "--headless",
      "--new-instance",
      "--profile",
      profileDir,
      `--remote-debugging-port=${port}`,
      "about:blank"
    ],
    {
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        ...process.env,
        MOZ_HEADLESS: "1"
      }
    }
  );

  firefoxProcess.stderr.on("data", (chunk) => {
    stderrChunks.push(String(chunk));
    if (stderrChunks.join("").length > 12_000) {
      stderrChunks.splice(0, stderrChunks.length - 4);
    }
  });

  const websocket = await connectWebSocketWithRetry(`ws://127.0.0.1:${port}/session`, 10_000);
  let commandId = 0;
  const pending = new Map();

  websocket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) {
      return;
    }

    const deferred = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(deferred.timer);

    if (message.type === "error") {
      deferred.reject(new Error(`${message.error}: ${message.message}`));
      return;
    }

    deferred.resolve(message.result);
  });

  websocket.addEventListener("close", () => {
    for (const [id, deferred] of pending) {
      clearTimeout(deferred.timer);
      deferred.reject(new Error(`Firefox BiDi connection closed before command ${id} completed.`));
    }
    pending.clear();
  });

  const command = (method, params = {}, timeoutMs = 15_000) =>
    new Promise((resolve, reject) => {
      const id = ++commandId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Firefox BiDi command timed out: ${method}`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      websocket.send(
        JSON.stringify({
          id,
          method,
          params
        })
      );
    });

  const session = await command("session.new", {
    capabilities: {
      alwaysMatch: {}
    }
  });

  return {
    capabilities: session.capabilities ?? {},
    command,
    stderrTail: () => redactSmokeText(stderrChunks.join("").slice(-2_000)),
    async close() {
      try {
        await command("session.end", {}, 5_000);
      } catch {
        // The browser may already have exited; cleanup below is still required.
      }

      try {
        websocket.close();
      } catch {
        // Ignore close races during smoke cleanup.
      }

      if (!firefoxProcess.killed) {
        firefoxProcess.kill("SIGTERM");
      }

      await waitForProcessExit(firefoxProcess, 3_000);
      rmSync(profileDir, { recursive: true, force: true });
    }
  };
}

async function createBrowserContext(browser) {
  const created = await browser.command("browsingContext.create", {
    type: "tab"
  });

  return created.context;
}

async function captureBrowserPage(browser, input) {
  await browser.command("browsingContext.setViewport", {
    context: input.context,
    viewport: {
      width: input.width,
      height: input.height
    },
    devicePixelRatio: 1
  });
  await browser.command(
    "browsingContext.navigate",
    {
      context: input.context,
      url: input.url,
      wait: "complete"
    },
    20_000
  );

  if (input.scrollTarget) {
    await evaluateBrowserJson(
      browser,
      input.context,
      `(() => {
        const target = document.querySelector(${JSON.stringify(input.scrollTarget)});
        if (target) target.scrollIntoView({ block: "start", inline: "nearest" });
        return JSON.stringify({ found: Boolean(target), scrollY: window.scrollY });
      })()`
    );
  }

  await waitForBrowserPaint(browser, input.context);
  const layout = await readBrowserLayout(browser, input.context);
  assertBrowserLayout(input.name, layout, input);

  const screenshot = await browser.command(
    "browsingContext.captureScreenshot",
    {
      context: input.context
    },
    20_000
  );
  const filePath = join(artifactsDir, `${input.name}-${input.width}x${input.height}.png`);
  writeFileSync(filePath, Buffer.from(screenshot.data, "base64"));
  const analysis = analyzePngScreenshot(filePath);
  const visualMetrics = createVisualMetrics({
    input,
    layout,
    filePath,
    analysis
  });
  assertVisualThresholds(input.name, visualMetrics);

  record(`${input.name}_browser_png_dimensions`, analysis.width === input.width && analysis.height === input.height, `${analysis.width}x${analysis.height}`);
  record(
    `${input.name}_browser_png_nonblank`,
    analysis.uniqueSampledColors >= visualMetrics.thresholds.minUniqueSampledColors &&
      analysis.nonLightRatio >= visualMetrics.thresholds.minNonLightRatio,
    JSON.stringify(analysis)
  );

  return {
    name: input.name,
    filePath,
    width: analysis.width,
    height: analysis.height,
    pngBytes: analysis.byteLength,
    routeId: visualMetrics.route.routeId,
    thresholdStatus: visualMetrics.result.status,
    uniqueSampledColors: analysis.uniqueSampledColors,
    nonLightRatio: analysis.nonLightRatio,
    edgeRatio: analysis.edgeRatio,
    luminanceStdDev: analysis.luminanceStdDev,
    visualMetrics
  };
}

function createVisualMetrics({ input, layout, filePath, analysis }) {
  const expectedRouteId = expectedRouteIdForCapture(input);
  const thresholds = visualThresholdsForCapture(input.name);
  const routePath = safeRoutePath(layout.url);
  const checks = [
    {
      id: "viewport_width",
      expected: input.width,
      actual: layout.innerWidth,
      passed: layout.innerWidth === input.width
    },
    {
      id: "viewport_height",
      expected: input.height,
      actual: layout.innerHeight,
      passed: layout.innerHeight === input.height
    },
    {
      id: "png_width",
      expected: input.width,
      actual: analysis.width,
      passed: analysis.width === input.width
    },
    {
      id: "png_height",
      expected: input.height,
      actual: analysis.height,
      passed: analysis.height === input.height
    },
    {
      id: "png_size",
      minimum: thresholds.minPngBytes,
      actual: analysis.byteLength,
      passed: analysis.byteLength >= thresholds.minPngBytes
    },
    {
      id: "color_diversity",
      minimum: thresholds.minUniqueSampledColors,
      actual: analysis.uniqueSampledColors,
      passed: analysis.uniqueSampledColors >= thresholds.minUniqueSampledColors
    },
    {
      id: "non_light_pixels",
      minimum: thresholds.minNonLightRatio,
      actual: analysis.nonLightRatio,
      passed: analysis.nonLightRatio >= thresholds.minNonLightRatio
    },
    {
      id: "edge_ratio",
      minimum: thresholds.minEdgeRatio,
      actual: analysis.edgeRatio,
      passed: analysis.edgeRatio >= thresholds.minEdgeRatio
    },
    {
      id: "luminance_std_dev",
      minimum: thresholds.minLuminanceStdDev,
      actual: analysis.luminanceStdDev,
      passed: analysis.luminanceStdDev >= thresholds.minLuminanceStdDev
    },
    {
      id: "dominant_color_ratio",
      maximum: thresholds.maxDominantColorRatio,
      actual: analysis.dominantColorRatio,
      passed: analysis.dominantColorRatio <= thresholds.maxDominantColorRatio
    }
  ];

  if (expectedRouteId) {
    checks.push({
      id: "route_id",
      expected: expectedRouteId,
      actual: layout.routeId,
      passed: layout.routeId === expectedRouteId
    });
  }

  return {
    schema: VISUAL_METRICS_SCHEMA,
    thresholdVersion: VISUAL_THRESHOLD_VERSION,
    captureId: input.name,
    route: {
      routeId: layout.routeId,
      expectedRouteId,
      path: routePath
    },
    viewport: {
      expectedWidth: input.width,
      expectedHeight: input.height,
      actualWidth: layout.innerWidth,
      actualHeight: layout.innerHeight,
      devicePixelRatio: 1
    },
    png: {
      fileName: basename(filePath),
      byteLength: analysis.byteLength,
      width: analysis.width,
      height: analysis.height
    },
    metrics: {
      sampledPixelCount: analysis.sampledPixelCount,
      uniqueSampledColors: analysis.uniqueSampledColors,
      dominantColorRatio: analysis.dominantColorRatio,
      nonLightRatio: analysis.nonLightRatio,
      edgeRatio: analysis.edgeRatio,
      luminanceMean: analysis.luminanceMean,
      luminanceStdDev: analysis.luminanceStdDev
    },
    thresholds,
    result: {
      status: checks.every((check) => check.passed) ? "passed" : "failed",
      checks
    }
  };
}

function assertVisualThresholds(captureId, visualMetrics) {
  for (const check of visualMetrics.result.checks) {
    record(`${captureId}_visual_threshold_${check.id}`, check.passed, JSON.stringify(check));
  }
}

function visualThresholdsForCapture(captureId) {
  return {
    ...DEFAULT_VISUAL_THRESHOLDS,
    ...(VISUAL_THRESHOLDS_BY_CAPTURE[captureId] ?? {})
  };
}

function expectedRouteIdForCapture(input) {
  if (input.expectOperationalConsole) {
    return "operational-console";
  }

  if (input.expectRomaniaRoute) {
    return "romania-onboarding-route";
  }

  if (input.expectLoginScreen) {
    return "login-screen";
  }

  return "";
}

function safeRoutePath(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "unknown";
  }
}

function writeVisualMetricsManifest(screenshots) {
  const manifestPath = join(artifactsDir, "visual-metrics-manifest.json");
  const captures = screenshots.map((screenshot) => screenshot.visualMetrics);
  const manifest = {
    schema: VISUAL_METRICS_SCHEMA,
    thresholdVersion: VISUAL_THRESHOLD_VERSION,
    status: captures.every((capture) => capture.result.status === "passed") ? "passed" : "failed",
    captureCount: captures.length,
    captures,
    nonLiveGuarantees: nonLiveGuarantees()
  };

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  record("browser_visual_metrics_manifest_written", true);
  record("browser_visual_metrics_manifest_capture_count", captures.length === 7, String(captures.length));
  record("browser_visual_metrics_all_thresholds_passed", manifest.status === "passed", manifest.status);

  return manifestPath;
}

function formatScreenshotArtifact(screenshot) {
  return {
    name: screenshot.name,
    filePath: screenshot.filePath,
    width: screenshot.width,
    height: screenshot.height,
    pngBytes: screenshot.pngBytes,
    routeId: screenshot.routeId,
    thresholdStatus: screenshot.thresholdStatus,
    metrics: {
      uniqueSampledColors: screenshot.uniqueSampledColors,
      nonLightRatio: screenshot.nonLightRatio,
      edgeRatio: screenshot.edgeRatio,
      luminanceStdDev: screenshot.luminanceStdDev
    }
  };
}

async function waitForBrowserPaint(browser, context) {
  await browser.command("script.evaluate", {
    expression:
      "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve('painted'))))",
    target: {
      context
    },
    awaitPromise: true
  });
}

async function readBrowserLayout(browser, context) {
  return evaluateBrowserJson(
    browser,
    context,
    `(() => {
      const isVisible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const routeElement = document.querySelector("[data-ui-smoke]");
      const overlapArea = (a, b) => {
        const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return width * height;
      };
      let overlapCount = 0;
      for (const group of document.querySelectorAll(".ps-topbar__actions,.ps-command-row,.ps-chip-row,.ps-nav,.ps-form")) {
        const rects = [...group.children].filter(isVisible).map((element) => element.getBoundingClientRect());
        for (let left = 0; left < rects.length; left += 1) {
          for (let right = left + 1; right < rects.length; right += 1) {
            if (overlapArea(rects[left], rects[right]) > 3) overlapCount += 1;
          }
        }
      }
      const overflowingControls = [...document.querySelectorAll("button,input,.ps-nav__link")]
        .filter(isVisible)
        .filter((element) => element.scrollWidth > element.clientWidth + 3)
        .map((element) => element.textContent.trim() || element.getAttribute("aria-label") || element.id || element.tagName);
      const zeroSizedControls = [...document.querySelectorAll("button,input,a[href],[tabindex]")]
        .filter((element) => getComputedStyle(element).display !== "none")
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width <= 0 || rect.height <= 0;
        })
        .map((element) => element.textContent.trim() || element.getAttribute("aria-label") || element.id || element.tagName);
      const bodyText = document.body.innerText;
      return JSON.stringify({
        url: location.href,
        title: document.title,
        text: bodyText,
        documentLang: document.documentElement.lang,
        routeId:
          routeElement?.getAttribute("data-ui-smoke") ??
          (document.querySelector('form[action="/auth/login"]') ? "login-screen" : "unknown"),
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY,
        documentScrollWidth: document.documentElement.scrollWidth,
        hasOperationalConsole: Boolean(document.querySelector('[data-ui-smoke="operational-console"]')),
        hasRomaniaRoute: Boolean(document.querySelector('[data-ui-smoke="romania-onboarding-route"]')),
        hasSkipLink: Boolean(document.querySelector('a[href="#content"]')),
        hasContentFocusTarget: Boolean(document.querySelector('#content[tabindex="-1"]')),
        overlapCount,
        overflowingControls,
        zeroSizedControls,
        approvalFactsNested: Boolean(document.querySelector(".ps-panel .ps-panel .ps-fact")),
        certificationClaim: /certified compliant|guaranteed nis2 compliance|legal compliance approved/i.test(bodyText),
        romania: {
          sourceMapVisible: bodyText.includes("Source Map Sample") && bodyText.includes("Workbook-derived mappings"),
          workbookCellsVisible:
            bodyText.includes("ro-nis2-entity_fields-entity_field_12_name_of_the_entity") &&
            bodyText.includes("Entity assessment!D66:D142"),
          legalCaveatVisible: bodyText.includes("not a legal opinion"),
          fallbackMetadataVisible:
            bodyText.includes("missing_translation") && bodyText.includes("requested ro-RO") && bodyText.includes("caveat en"),
          unsupportedStateVisible:
            bodyText.includes("Boundaries And Unsupported States") &&
            bodyText.includes("Direct DNSC submission") &&
            bodyText.includes("Legal activation") &&
            bodyText.includes("not a full React or Next.js onboarding wizard"),
          noDnscSubmissionVisible:
            bodyText.includes("no DNSC submission") &&
            bodyText.includes("Submitted to DNSC") &&
            bodyText.includes("false") &&
            bodyText.includes("PureSOC does not submit this draft to DNSC."),
          directDnscSubmitCommand: /submit\\s+(to\\s+)?dnsc/i.test(bodyText)
        }
      });
    })()`
  );
}

function assertBrowserLayout(name, layout, input) {
  const expectedRouteId = expectedRouteIdForCapture(input);
  record(`${name}_browser_viewport_width`, layout.innerWidth === input.width, `${layout.innerWidth}`);
  record(`${name}_browser_viewport_height`, layout.innerHeight === input.height, `${layout.innerHeight}`);
  if (expectedRouteId) {
    record(`${name}_browser_route_id`, layout.routeId === expectedRouteId, `${layout.routeId}`);
  }
  const minimumReadableTextLength = input.expectOperationalConsole || input.expectRomaniaRoute ? 100 : 40;
  record(`${name}_browser_has_readable_text`, layout.text.length > minimumReadableTextLength, `${layout.text.length}`);
  record(`${name}_browser_has_no_certification_claims`, layout.certificationClaim === false);
  record(`${name}_browser_has_no_document_horizontal_overflow`, layout.documentScrollWidth <= input.width + 2, `${layout.documentScrollWidth}`);
  record(`${name}_browser_has_no_obvious_group_overlap`, layout.overlapCount === 0, String(layout.overlapCount));
  record(`${name}_browser_controls_do_not_overflow`, layout.overflowingControls.length === 0, layout.overflowingControls.join(", "));
  record(`${name}_browser_controls_are_measurable`, layout.zeroSizedControls.length === 0, layout.zeroSizedControls.join(", "));
  record(`${name}_browser_approval_facts_not_nested`, layout.approvalFactsNested === false);

  if (input.expectOperationalConsole) {
    record(`${name}_browser_operational_console_marker`, layout.hasOperationalConsole === true);
    record(`${name}_browser_skip_link_present`, layout.hasSkipLink === true);
  } else if (input.expectRomaniaRoute) {
    record(`${name}_browser_romania_route_marker`, layout.hasRomaniaRoute === true);
    record(`${name}_browser_romania_route_declares_ro_locale`, layout.documentLang === "ro", layout.documentLang);
    record(`${name}_browser_romania_route_skip_link_present`, layout.hasSkipLink === true);
    record(`${name}_browser_romania_route_focus_target_present`, layout.hasContentFocusTarget === true);
    record(`${name}_browser_romania_route_source_map_visible`, layout.romania.sourceMapVisible === true);
    record(`${name}_browser_romania_route_workbook_cells_visible`, layout.romania.workbookCellsVisible === true);
    record(`${name}_browser_romania_route_legal_caveat_visible`, layout.romania.legalCaveatVisible === true);
    record(`${name}_browser_romania_route_fallback_metadata_visible`, layout.romania.fallbackMetadataVisible === true);
    record(`${name}_browser_romania_route_unsupported_state_visible`, layout.romania.unsupportedStateVisible === true);
    record(`${name}_browser_romania_route_no_dnsc_submission_visible`, layout.romania.noDnscSubmissionVisible === true);
    record(`${name}_browser_romania_route_no_direct_dnsc_submit_command`, layout.romania.directDnscSubmitCommand === false);
  } else {
    record(`${name}_browser_login_without_console_marker`, layout.hasOperationalConsole === false);
    if (input.expectLoginScreen) {
      record(`${name}_browser_login_route_marker`, layout.routeId === "login-screen", layout.routeId);
    }
  }

  for (const expected of input.expectedText ?? []) {
    record(`${name}_browser_text_${slug(expected)}`, layout.text.includes(expected), expected);
  }

  if (input.scrollTarget) {
    record(`${name}_browser_anchor_scroll_applied`, layout.scrollY > 0, `${layout.scrollY}`);
  }
}

async function assertBrowserOperationalConsoleAnchorKeyboardNavigation(browser, context, webBaseUrl) {
  await prepareOperationalConsoleAnchorStart(browser, context, webBaseUrl, "keyboard_anchor_skip_start");

  await resetBrowserFocus(browser, context);
  await pressBrowserKey(browser, context, "Tab");
  const dashboardSkipFocused = await readBrowserFocusSnapshot(browser, context);
  record(
    "browser_keyboard_anchor_dashboard_skip_link_focused_by_tab",
    dashboardSkipFocused.dataAction === "skip-to-content" && dashboardSkipFocused.href.endsWith("#content"),
    JSON.stringify(dashboardSkipFocused)
  );
  await pressBrowserKey(browser, context, "Enter");
  const dashboardSkipTarget = await waitForBrowserState(
    browser,
    context,
    `(() => {
      const active = document.activeElement;
      return JSON.stringify({
        hash: location.hash,
        activeId: active?.id ?? "",
        routeMarker: Boolean(document.querySelector('[data-ui-smoke="operational-console"]')),
        documentScrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        certificationClaim: /certified compliant|guaranteed nis2 compliance|legal compliance approved/i.test(document.body.innerText)
      });
    })()`,
    (candidate) => candidate.hash === "#content" && candidate.activeId === "content" && candidate.routeMarker === true,
    "dashboard skip link operational-console anchor keyboard focus target",
    5_000
  );
  record("browser_keyboard_anchor_dashboard_skip_link_moves_focus_to_content", dashboardSkipTarget.activeId === "content", JSON.stringify(dashboardSkipTarget));
  record(
    "browser_keyboard_anchor_dashboard_skip_link_no_horizontal_overflow",
    dashboardSkipTarget.documentScrollWidth <= dashboardSkipTarget.innerWidth + 2,
    JSON.stringify(dashboardSkipTarget)
  );
  record("browser_keyboard_anchor_dashboard_skip_link_no_certification_claims", dashboardSkipTarget.certificationClaim === false, JSON.stringify(dashboardSkipTarget));

  const anchors = [];
  for (const anchor of OPERATIONAL_CONSOLE_ANCHORS) {
    await prepareOperationalConsoleAnchorStart(browser, context, webBaseUrl, `keyboard_anchor_${anchor.id}_start`);
    const selector = operationalAnchorSelector(anchor);
    const visibleTarget = await readBrowserPointerTarget(browser, context, selector, { ensureInViewport: false });
    record(`browser_keyboard_anchor_${anchor.id}_visible_nav_link_present`, visibleTarget.visible === true, JSON.stringify(visibleTarget));
    record(`browser_keyboard_anchor_${anchor.id}_visible_nav_link_not_script_scrolled`, visibleTarget.scrolledIntoView === false, JSON.stringify(visibleTarget));

    const focused = await focusBrowserElement(browser, context, selector);
    record(
      `browser_keyboard_anchor_${anchor.id}_nav_link_focused`,
      focused.dataAction === anchor.action && focused.href.endsWith(anchor.href),
      JSON.stringify(focused)
    );
    record(`browser_keyboard_anchor_${anchor.id}_focus_target_has_bounds`, focused.bounds.width > 0 && focused.bounds.height > 0, JSON.stringify(focused));

    await pressBrowserKey(browser, context, "Enter");
    const state = await waitForOperationalConsoleAnchorState(browser, context, anchor, "keyboard");
    assertOperationalConsoleAnchorState("keyboard", anchor, state);
    anchors.push({
      id: anchor.id,
      action: focused.dataAction,
      hash: state.hash,
      scrollY: state.scrollY,
      sectionTitle: state.sectionTitle
    });
  }

  record("browser_keyboard_operational_anchor_navigation_preserves_no_live_call_posture", true);

  return {
    dashboardSkip: {
      focusedByTab: dashboardSkipFocused.dataAction,
      targetId: dashboardSkipTarget.activeId
    },
    anchors
  };
}

async function assertBrowserOperationalConsoleAnchorPointerNavigation(browser, context, webBaseUrl) {
  const anchors = [];

  for (const anchor of OPERATIONAL_CONSOLE_ANCHORS) {
    await prepareOperationalConsoleAnchorStart(browser, context, webBaseUrl, `pointer_anchor_${anchor.id}_start`);
    const target = await clickBrowserElement(browser, context, operationalAnchorSelector(anchor), `anchor_${anchor.id}_nav_link`, {
      ensureInViewport: false
    });
    record(
      `browser_pointer_anchor_${anchor.id}_nav_link_clicked`,
      target.dataAction === anchor.action && target.href.endsWith(anchor.href),
      JSON.stringify(target)
    );
    record(`browser_pointer_anchor_${anchor.id}_click_used_visible_control_without_script_scroll`, target.scrolledIntoView === false, JSON.stringify(target));

    const state = await waitForOperationalConsoleAnchorState(browser, context, anchor, "pointer");
    assertOperationalConsoleAnchorState("pointer", anchor, state);
    anchors.push({
      id: anchor.id,
      action: target.dataAction,
      hash: state.hash,
      scrollY: state.scrollY,
      targetBounds: target.bounds,
      sectionTitle: state.sectionTitle
    });
  }

  record("browser_pointer_operational_anchor_navigation_preserves_no_live_call_posture", true);

  return {
    anchors
  };
}

async function prepareOperationalConsoleAnchorStart(browser, context, webBaseUrl, label) {
  await browser.command("browsingContext.setViewport", {
    context,
    viewport: {
      width: 1024,
      height: 760
    },
    devicePixelRatio: 1
  });
  await browser.command("browsingContext.navigate", {
    context,
    url: `${webBaseUrl}/`,
    wait: "complete"
  });
  await waitForBrowserPaint(browser, context);

  const layout = await readBrowserLayout(browser, context);
  assertBrowserLayout(label, layout, {
    width: 1024,
    height: 760,
    expectedText: ["Overall internal readiness", "Onboarding And Country Packs", "Approval Queue"],
    expectOperationalConsole: true
  });
}

function operationalAnchorSelector(anchor) {
  return `[data-ui-action="${anchor.action}"]`;
}

async function waitForOperationalConsoleAnchorState(browser, context, anchor, inputMode) {
  return waitForBrowserState(
    browser,
    context,
    operationalConsoleAnchorStateExpression(anchor),
    (candidate) =>
      candidate.routeMarker === true &&
      candidate.hash === anchor.hash &&
      candidate.sectionFound === true &&
      candidate.sectionVisible === true &&
      anchor.expectedText.every((expected) => candidate.sectionText.includes(expected)),
    `${inputMode} operational-console ${anchor.id} anchor navigation`,
    5_000
  );
}

function operationalConsoleAnchorStateExpression(anchor) {
  return `(() => {
    const section = document.querySelector(${JSON.stringify(anchor.sectionSelector)});
    const rect = section?.getBoundingClientRect();
    const sectionText = section?.innerText ?? "";
    const title = section?.querySelector(".ps-section__title")?.textContent?.trim() ?? "";
    const bodyText = document.body.innerText;
    return JSON.stringify({
      url: location.href,
      path: location.pathname,
      hash: location.hash,
      routeId: document.querySelector("[data-ui-smoke]")?.getAttribute("data-ui-smoke") ?? "unknown",
      routeMarker: Boolean(document.querySelector('[data-ui-smoke="operational-console"]')),
      sectionFound: Boolean(section),
      sectionId: section?.id ?? "",
      sectionMarker: section?.getAttribute("data-ui-section") ?? "",
      sectionTitle: title,
      sectionText,
      sectionTextLength: sectionText.length,
      sectionVisible: Boolean(rect && rect.bottom > 12 && rect.top < window.innerHeight - 12),
      sectionTop: rect ? Math.round(rect.top) : null,
      sectionBottom: rect ? Math.round(rect.bottom) : null,
      scrollY: Math.round(window.scrollY),
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      certificationClaim: /certified compliant|guaranteed nis2 compliance|legal compliance approved/i.test(bodyText)
    });
  })()`;
}

function assertOperationalConsoleAnchorState(inputMode, anchor, state) {
  const prefix = `browser_${inputMode}_anchor_${anchor.id}`;
  record(`${prefix}_route_marker`, state.routeMarker === true && state.routeId === "operational-console", JSON.stringify(state));
  record(`${prefix}_hash_matches_target`, state.hash === anchor.hash, JSON.stringify(state));
  record(`${prefix}_section_found`, state.sectionFound === true && state.sectionId === anchor.id, JSON.stringify(state));
  record(`${prefix}_section_marker_matches`, state.sectionMarker === anchor.id, JSON.stringify(state));
  record(`${prefix}_section_enters_view`, state.sectionVisible === true, JSON.stringify(state));
  record(`${prefix}_section_has_readable_text`, state.sectionTextLength > 80, JSON.stringify(state));
  for (const expected of anchor.expectedText) {
    record(`${prefix}_section_text_${slug(expected)}`, state.sectionText.includes(expected), JSON.stringify(state));
  }
  record(`${prefix}_has_no_document_horizontal_overflow`, state.documentScrollWidth <= state.innerWidth + 2, JSON.stringify(state));
  record(`${prefix}_has_no_certification_claims`, state.certificationClaim === false, JSON.stringify(state));
  if (anchor.id !== "dashboard") {
    record(`${prefix}_scroll_position_changed`, state.scrollY > 0, JSON.stringify(state));
  }
}

async function assertBrowserRouteKeyboardNavigation(browser, context, webBaseUrl) {
  await browser.command("browsingContext.setViewport", {
    context,
    viewport: {
      width: 1024,
      height: 760
    },
    devicePixelRatio: 1
  });
  await browser.command("browsingContext.navigate", {
    context,
    url: `${webBaseUrl}/`,
    wait: "complete"
  });
  await waitForBrowserPaint(browser, context);

  const dashboardLayout = await readBrowserLayout(browser, context);
  assertBrowserLayout("keyboard_dashboard_start", dashboardLayout, {
    width: 1024,
    height: 760,
    expectedText: ["Overall internal readiness", "Romania onboarding"],
    expectOperationalConsole: true
  });

  await resetBrowserFocus(browser, context);
  await pressBrowserKey(browser, context, "Tab");
  const dashboardSkipFocused = await readBrowserFocusSnapshot(browser, context);
  record(
    "browser_keyboard_dashboard_skip_link_focused_by_tab",
    dashboardSkipFocused.dataAction === "skip-to-content" && dashboardSkipFocused.href.endsWith("#content"),
    JSON.stringify(dashboardSkipFocused)
  );
  await pressBrowserKey(browser, context, "Enter");
  const dashboardSkipTarget = await waitForBrowserState(
    browser,
    context,
    `(() => {
      const active = document.activeElement;
      return JSON.stringify({
        hash: location.hash,
        activeId: active?.id ?? "",
        activeTag: active?.tagName ?? "",
        path: location.pathname,
        marker: Boolean(document.querySelector('[data-ui-smoke="operational-console"]'))
      });
    })()`,
    (candidate) => candidate.hash === "#content" && candidate.activeId === "content" && candidate.marker === true,
    "dashboard skip link keyboard focus target",
    5_000
  );
  record("browser_keyboard_dashboard_skip_link_moves_focus_to_content", dashboardSkipTarget.activeId === "content", JSON.stringify(dashboardSkipTarget));

  const romaniaNavFocus = await focusBrowserElement(browser, context, '[data-ui-action="open-romania-onboarding"]');
  record(
    "browser_keyboard_dashboard_romania_nav_link_focused",
    romaniaNavFocus.activeText.includes("Romania onboarding") && romaniaNavFocus.href.endsWith("/onboarding/romania?locale=ro-RO"),
    JSON.stringify(romaniaNavFocus)
  );
  await pressBrowserKey(browser, context, "Enter");
  const romaniaLanding = await waitForBrowserState(
    browser,
    context,
    `(() => {
      const text = document.body.innerText;
      return JSON.stringify({
        path: location.pathname,
        search: location.search,
        hash: location.hash,
        routeMarker: Boolean(document.querySelector('[data-ui-smoke="romania-onboarding-route"]')),
        hasSourceMap: text.includes("Source Map Sample"),
        hasNoDnscNotice: text.includes("PureSOC does not submit this draft to DNSC."),
        hasCertificationClaim: /certified compliant|guaranteed nis2 compliance|legal compliance approved/i.test(text),
        hasDirectDnscSubmitCommand: /submit\\s+(to\\s+)?dnsc/i.test(text)
      });
    })()`,
    (candidate) =>
      candidate.path === "/onboarding/romania" &&
      candidate.search === "?locale=ro-RO" &&
      candidate.routeMarker === true &&
      candidate.hasSourceMap === true,
    "dashboard to Romania onboarding keyboard navigation",
    5_000
  );
  record("browser_keyboard_dashboard_to_romania_url_changed", romaniaLanding.path === "/onboarding/romania", JSON.stringify(romaniaLanding));
  record("browser_keyboard_dashboard_to_romania_route_marker", romaniaLanding.routeMarker === true, JSON.stringify(romaniaLanding));
  record("browser_keyboard_dashboard_to_romania_keeps_no_dnsc_notice", romaniaLanding.hasNoDnscNotice === true, JSON.stringify(romaniaLanding));
  record("browser_keyboard_dashboard_to_romania_no_certification_claims", romaniaLanding.hasCertificationClaim === false, JSON.stringify(romaniaLanding));
  record("browser_keyboard_dashboard_to_romania_no_direct_dnsc_submit_command", romaniaLanding.hasDirectDnscSubmitCommand === false, JSON.stringify(romaniaLanding));

  await waitForBrowserPaint(browser, context);
  const romaniaLayout = await readBrowserLayout(browser, context);
  assertBrowserLayout("keyboard_romania_route", romaniaLayout, {
    width: 1024,
    height: 760,
    expectedText: ["Romania NIS2 Onboarding", "missing_translation", "PureSOC does not submit this draft to DNSC."],
    expectRomaniaRoute: true
  });

  await resetBrowserFocus(browser, context);
  await pressBrowserKey(browser, context, "Tab");
  const romaniaSkipFocused = await readBrowserFocusSnapshot(browser, context);
  record(
    "browser_keyboard_romania_skip_link_focused_by_tab",
    romaniaSkipFocused.dataAction === "skip-to-content" && romaniaSkipFocused.href.endsWith("#content"),
    JSON.stringify(romaniaSkipFocused)
  );
  await pressBrowserKey(browser, context, "Enter");
  const romaniaSkipTarget = await waitForBrowserState(
    browser,
    context,
    `(() => {
      const active = document.activeElement;
      return JSON.stringify({
        hash: location.hash,
        activeId: active?.id ?? "",
        activeTag: active?.tagName ?? "",
        path: location.pathname,
        marker: Boolean(document.querySelector('[data-ui-smoke="romania-onboarding-route"]'))
      });
    })()`,
    (candidate) => candidate.hash === "#content" && candidate.activeId === "content" && candidate.marker === true,
    "Romania skip link keyboard focus target",
    5_000
  );
  record("browser_keyboard_romania_skip_link_moves_focus_to_content", romaniaSkipTarget.activeId === "content", JSON.stringify(romaniaSkipTarget));

  const backLinkFocus = await focusBrowserElement(browser, context, '[data-ui-action="back-to-dashboard"]');
  record(
    "browser_keyboard_romania_back_link_focused",
    backLinkFocus.activeText.includes("Back to dashboard") && backLinkFocus.href.endsWith("/"),
    JSON.stringify(backLinkFocus)
  );
  await pressBrowserKey(browser, context, "Enter");
  const dashboardReturn = await waitForBrowserState(
    browser,
    context,
    `(() => {
      const text = document.body.innerText;
      return JSON.stringify({
        path: location.pathname,
        search: location.search,
        hash: location.hash,
        dashboardMarker: Boolean(document.querySelector('[data-ui-smoke="operational-console"]')),
        hasDashboardText: text.includes("Overall internal readiness"),
        hasRomaniaMarker: Boolean(document.querySelector('[data-ui-smoke="romania-onboarding-route"]')),
        hasCertificationClaim: /certified compliant|guaranteed nis2 compliance|legal compliance approved/i.test(text)
      });
    })()`,
    (candidate) => candidate.path === "/" && candidate.dashboardMarker === true && candidate.hasDashboardText === true,
    "Romania back to dashboard keyboard navigation",
    5_000
  );
  record("browser_keyboard_romania_back_link_returns_to_dashboard_url", dashboardReturn.path === "/", JSON.stringify(dashboardReturn));
  record("browser_keyboard_romania_back_link_returns_to_dashboard_marker", dashboardReturn.dashboardMarker === true, JSON.stringify(dashboardReturn));
  record("browser_keyboard_romania_back_link_no_certification_claims", dashboardReturn.hasCertificationClaim === false, JSON.stringify(dashboardReturn));

  await waitForBrowserPaint(browser, context);
  const returnedDashboardLayout = await readBrowserLayout(browser, context);
  assertBrowserLayout("keyboard_dashboard_return", returnedDashboardLayout, {
    width: 1024,
    height: 760,
    expectedText: ["Overall internal readiness", "Romania onboarding"],
    expectOperationalConsole: true
  });
  record("browser_keyboard_navigation_preserves_no_live_call_posture", true);

  return {
    dashboardSkip: {
      focusedByTab: dashboardSkipFocused.dataAction,
      targetId: dashboardSkipTarget.activeId
    },
    dashboardToRomania: {
      activatedLink: romaniaNavFocus.dataAction,
      path: romaniaLanding.path,
      search: romaniaLanding.search
    },
    romaniaSkip: {
      focusedByTab: romaniaSkipFocused.dataAction,
      targetId: romaniaSkipTarget.activeId
    },
    romaniaBackToDashboard: {
      activatedLink: backLinkFocus.dataAction,
      path: dashboardReturn.path
    }
  };
}

async function assertBrowserRoutePointerNavigation(browser, context, webBaseUrl) {
  await browser.command("browsingContext.setViewport", {
    context,
    viewport: {
      width: 1024,
      height: 760
    },
    devicePixelRatio: 1
  });
  await browser.command("browsingContext.navigate", {
    context,
    url: `${webBaseUrl}/`,
    wait: "complete"
  });
  await waitForBrowserPaint(browser, context);

  const dashboardLayout = await readBrowserLayout(browser, context);
  assertBrowserLayout("pointer_dashboard_start", dashboardLayout, {
    width: 1024,
    height: 760,
    expectedText: ["Overall internal readiness", "Romania onboarding"],
    expectOperationalConsole: true
  });

  const romaniaNavTarget = await clickBrowserElement(browser, context, '[data-ui-action="open-romania-onboarding"]', "dashboard_romania_nav_link");
  record(
    "browser_pointer_dashboard_romania_nav_link_clicked",
    romaniaNavTarget.text.includes("Romania onboarding") && romaniaNavTarget.href.endsWith("/onboarding/romania?locale=ro-RO"),
    JSON.stringify(romaniaNavTarget)
  );
  const romaniaLanding = await waitForBrowserState(
    browser,
    context,
    `(() => {
      const text = document.body.innerText;
      return JSON.stringify({
        path: location.pathname,
        search: location.search,
        hash: location.hash,
        routeMarker: Boolean(document.querySelector('[data-ui-smoke="romania-onboarding-route"]')),
        hasSourceMap: text.includes("Source Map Sample"),
        hasNoDnscNotice: text.includes("PureSOC does not submit this draft to DNSC."),
        hasCertificationClaim: /certified compliant|guaranteed nis2 compliance|legal compliance approved/i.test(text),
        hasDirectDnscSubmitCommand: /submit\\s+(to\\s+)?dnsc/i.test(text)
      });
    })()`,
    (candidate) =>
      candidate.path === "/onboarding/romania" &&
      candidate.search === "?locale=ro-RO" &&
      candidate.routeMarker === true &&
      candidate.hasSourceMap === true,
    "dashboard to Romania onboarding pointer navigation",
    5_000
  );
  record("browser_pointer_dashboard_to_romania_url_changed", romaniaLanding.path === "/onboarding/romania", JSON.stringify(romaniaLanding));
  record("browser_pointer_dashboard_to_romania_route_marker", romaniaLanding.routeMarker === true, JSON.stringify(romaniaLanding));
  record("browser_pointer_dashboard_to_romania_keeps_no_dnsc_notice", romaniaLanding.hasNoDnscNotice === true, JSON.stringify(romaniaLanding));
  record("browser_pointer_dashboard_to_romania_no_certification_claims", romaniaLanding.hasCertificationClaim === false, JSON.stringify(romaniaLanding));
  record("browser_pointer_dashboard_to_romania_no_direct_dnsc_submit_command", romaniaLanding.hasDirectDnscSubmitCommand === false, JSON.stringify(romaniaLanding));

  await waitForBrowserPaint(browser, context);
  const romaniaLayout = await readBrowserLayout(browser, context);
  assertBrowserLayout("pointer_romania_route", romaniaLayout, {
    width: 1024,
    height: 760,
    expectedText: ["Romania NIS2 Onboarding", "missing_translation", "PureSOC does not submit this draft to DNSC."],
    expectRomaniaRoute: true
  });

  const backLinkTarget = await clickBrowserElement(browser, context, '[data-ui-action="back-to-dashboard"]', "romania_back_link");
  record(
    "browser_pointer_romania_back_link_clicked",
    backLinkTarget.text.includes("Back to dashboard") && backLinkTarget.href.endsWith("/"),
    JSON.stringify(backLinkTarget)
  );
  const dashboardReturn = await waitForBrowserState(
    browser,
    context,
    `(() => {
      const text = document.body.innerText;
      return JSON.stringify({
        path: location.pathname,
        search: location.search,
        hash: location.hash,
        dashboardMarker: Boolean(document.querySelector('[data-ui-smoke="operational-console"]')),
        hasDashboardText: text.includes("Overall internal readiness"),
        hasRomaniaMarker: Boolean(document.querySelector('[data-ui-smoke="romania-onboarding-route"]')),
        hasCertificationClaim: /certified compliant|guaranteed nis2 compliance|legal compliance approved/i.test(text)
      });
    })()`,
    (candidate) => candidate.path === "/" && candidate.dashboardMarker === true && candidate.hasDashboardText === true,
    "Romania back to dashboard pointer navigation",
    5_000
  );
  record("browser_pointer_romania_back_link_returns_to_dashboard_url", dashboardReturn.path === "/", JSON.stringify(dashboardReturn));
  record("browser_pointer_romania_back_link_returns_to_dashboard_marker", dashboardReturn.dashboardMarker === true, JSON.stringify(dashboardReturn));
  record("browser_pointer_romania_back_link_no_certification_claims", dashboardReturn.hasCertificationClaim === false, JSON.stringify(dashboardReturn));

  await waitForBrowserPaint(browser, context);
  const returnedDashboardLayout = await readBrowserLayout(browser, context);
  assertBrowserLayout("pointer_dashboard_return", returnedDashboardLayout, {
    width: 1024,
    height: 760,
    expectedText: ["Overall internal readiness", "Romania onboarding"],
    expectOperationalConsole: true
  });
  record("browser_pointer_navigation_preserves_no_live_call_posture", true);

  return {
    dashboardToRomania: {
      clickedAction: romaniaNavTarget.dataAction,
      href: romaniaNavTarget.href,
      path: romaniaLanding.path,
      search: romaniaLanding.search,
      targetBounds: romaniaNavTarget.bounds
    },
    romaniaBackToDashboard: {
      clickedAction: backLinkTarget.dataAction,
      href: backLinkTarget.href,
      path: dashboardReturn.path,
      targetBounds: backLinkTarget.bounds
    }
  };
}

async function resetBrowserFocus(browser, context) {
  await evaluateBrowserJson(
    browser,
    context,
    `(() => {
      window.scrollTo(0, 0);
      if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }
      return JSON.stringify({
        activeTag: document.activeElement?.tagName ?? "",
        path: location.pathname
      });
    })()`
  );
}

async function clickBrowserElement(browser, context, selector, label, options = {}) {
  const target = await readBrowserPointerTarget(browser, context, selector, options);
  record(`browser_pointer_${label}_target_found`, target.found === true, JSON.stringify(target));
  record(`browser_pointer_${label}_target_visible`, target.visible === true, JSON.stringify(target));
  record(`browser_pointer_${label}_target_has_bounds`, target.bounds.width > 0 && target.bounds.height > 0, JSON.stringify(target));
  record(
    `browser_pointer_${label}_target_center_in_viewport`,
    target.center.x >= 0 &&
      target.center.x <= target.viewport.width &&
      target.center.y >= 0 &&
      target.center.y <= target.viewport.height,
    JSON.stringify(target)
  );

  await browser.command("input.performActions", {
    context,
    actions: [
      {
        type: "pointer",
        id: `pointer-${slug(label)}`,
        parameters: {
          pointerType: "mouse"
        },
        actions: [
          {
            type: "pointerMove",
            x: target.center.x,
            y: target.center.y,
            origin: "viewport",
            duration: 0
          },
          {
            type: "pointerDown",
            button: 0
          },
          {
            type: "pointerUp",
            button: 0
          }
        ]
      }
    ]
  });
  record(`browser_pointer_${label}_click_performed`, true);

  return target;
}

async function readBrowserPointerTarget(browser, context, selector, options = {}) {
  const ensureInViewport = options.ensureInViewport !== false;

  return evaluateBrowserJson(
    browser,
    context,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) {
        return JSON.stringify({
          found: false,
          selector: ${JSON.stringify(selector)},
          scrolledIntoView: false,
          visible: false,
          bounds: { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 },
          center: { x: -1, y: -1 },
          viewport: { width: window.innerWidth, height: window.innerHeight }
        });
      }
      const measure = () => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const center = {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2)
        };
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0 &&
          center.x >= 0 &&
          center.x <= window.innerWidth &&
          center.y >= 0 &&
          center.y <= window.innerHeight;
        return { style, rect, center, visible };
      };
      let scrolledIntoView = false;
      let measured = measure();
      if (${JSON.stringify(ensureInViewport)} && !measured.visible) {
        element.scrollIntoView({ block: "center", inline: "center" });
        scrolledIntoView = true;
        measured = measure();
      }
      const rect = measured.rect;
      const center = measured.center;
      return JSON.stringify({
        found: true,
        selector: ${JSON.stringify(selector)},
        tag: element.tagName,
        text: element.textContent?.trim() ?? "",
        dataAction: element.getAttribute("data-ui-action") ?? "",
        href: element instanceof HTMLAnchorElement ? element.href : "",
        scrolledIntoView,
        visible: measured.visible,
        bounds: {
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        center,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        path: location.pathname
      });
    })()`
  );
}

async function focusBrowserElement(browser, context, selector) {
  const focused = await evaluateBrowserJson(
    browser,
    context,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element || typeof element.focus !== "function") {
        return JSON.stringify({
          found: false,
          selector: ${JSON.stringify(selector)}
        });
      }
      element.focus();
      const active = document.activeElement;
      const rect = active?.getBoundingClientRect();
      const style = active ? getComputedStyle(active) : null;
      const center = rect
        ? {
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
          }
        : { x: -1, y: -1 };
      const visible = Boolean(
        rect &&
          rect.width > 0 &&
          rect.height > 0 &&
          center.x >= 0 &&
          center.x <= window.innerWidth &&
          center.y >= 0 &&
          center.y <= window.innerHeight &&
          style?.visibility !== "hidden" &&
          style?.display !== "none"
      );
      return JSON.stringify({
        found: true,
        selector: ${JSON.stringify(selector)},
        activeTag: active?.tagName ?? "",
        activeId: active?.id ?? "",
        activeText: active?.textContent?.trim() ?? "",
        dataAction: active?.getAttribute("data-ui-action") ?? "",
        href: active instanceof HTMLAnchorElement ? active.href : "",
        visible,
        bounds: rect
          ? {
              top: Math.round(rect.top),
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom),
              left: Math.round(rect.left),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          : { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 },
        center,
        path: location.pathname
      });
    })()`
  );
  record(`browser_focus_element_${slug(selector)}`, focused.found === true, JSON.stringify(focused));
  record(`browser_focus_element_${slug(selector)}_is_active`, focused.dataAction.length > 0 || focused.activeId.length > 0, JSON.stringify(focused));

  return focused;
}

async function readBrowserFocusSnapshot(browser, context) {
  return evaluateBrowserJson(
    browser,
    context,
    `(() => {
      const active = document.activeElement;
      return JSON.stringify({
        activeTag: active?.tagName ?? "",
        activeId: active?.id ?? "",
        activeText: active?.textContent?.trim() ?? "",
        dataAction: active?.getAttribute("data-ui-action") ?? "",
        href: active instanceof HTMLAnchorElement ? active.href : "",
        path: location.pathname,
        hash: location.hash
      });
    })()`
  );
}

async function pressBrowserKey(browser, context, key) {
  const valueByKey = {
    Enter: "\uE007",
    Tab: "\uE004"
  };
  const value = valueByKey[key] ?? key;
  await browser.command("input.performActions", {
    context,
    actions: [
      {
        type: "key",
        id: "keyboard",
        actions: [
          {
            type: "keyDown",
            value
          },
          {
            type: "keyUp",
            value
          }
        ]
      }
    ]
  });
  record(`browser_key_${slug(key)}_performed`, true);
}

async function assertBrowserWebRuntimeLogin(browser, context, webBaseUrl, seeded) {
  await browser.command("browsingContext.setViewport", {
    context,
    viewport: {
      width: 900,
      height: 700
    },
    devicePixelRatio: 1
  });
  await browser.command("browsingContext.navigate", {
    context,
    url: `${webBaseUrl}/login`,
    wait: "complete"
  });

  const submitted = await evaluateBrowserJson(
    browser,
    context,
    `(() => {
      const form = document.querySelector('form[action="/auth/login"]');
      const email = document.querySelector('#email');
      const password = document.querySelector('#password');
      if (!form || !email || !password) {
        return JSON.stringify({ submitted: false, reason: "login_form_missing" });
      }
      email.value = ${JSON.stringify(seeded.email)};
      password.value = ${JSON.stringify(seeded.password)};
      form.requestSubmit();
      return JSON.stringify({ submitted: true });
    })()`
  );
  record("browser_web_login_form_submitted", submitted.submitted === true, JSON.stringify(submitted));

  const selection = await waitForBrowserState(
    browser,
    context,
    `((async () => {
      const session = await fetch("/auth/session", {
        credentials: "include"
      });
      const sessionText = await session.text();
      const bodyText = document.body.innerText;
      return JSON.stringify({
        currentUrl: location.href,
        workspaceSelectionVisible: Boolean(document.querySelector('[data-ui-smoke="workspace-selection"]')),
        primaryWorkspaceVisible: bodyText.includes(${JSON.stringify(seeded.primaryOrganization.name)}),
        selectedWorkspaceVisible: bodyText.includes(${JSON.stringify(seeded.selectedOrganization.name)}),
        sessionStatus: session.status,
        sessionHasNoActiveOrganization: sessionText.includes('"activeOrganizationId":null'),
        documentCookieAfterLogin: document.cookie
      });
    })())`,
    (candidate) => candidate.workspaceSelectionVisible === true && candidate.sessionStatus === 200,
    "browser web login redirect and workspace selection",
    5_000
  );

  record("browser_web_login_proxy_renders_workspace_selection", selection.workspaceSelectionVisible === true, JSON.stringify(selection));
  record("browser_web_login_lands_on_workspace_selection_url", new URL(selection.currentUrl).pathname === "/", JSON.stringify(selection));
  record("browser_web_workspace_selection_lists_primary_workspace", selection.primaryWorkspaceVisible === true, JSON.stringify(selection));
  record("browser_web_workspace_selection_lists_selected_workspace", selection.selectedWorkspaceVisible === true, JSON.stringify(selection));
  record("browser_web_session_proxy_status_ok", selection.sessionStatus === 200, JSON.stringify(selection));
  record("browser_web_session_starts_without_active_organization", selection.sessionHasNoActiveOrganization === true, JSON.stringify(selection));
  record("browser_web_document_cookie_cannot_read_http_only_session", !selection.documentCookieAfterLogin.includes("puresoc_session"), selection.documentCookieAfterLogin);

  const workspaceTarget = await clickBrowserElement(
    browser,
    context,
    `[data-ui-action="select-workspace"][data-organization-id="${seeded.selectedOrganization.organizationId}"]`,
    "workspace_selection_selected_workspace"
  );
  record(
    "browser_workspace_selection_visible_control_clicked",
    workspaceTarget.text.includes("Open workspace") && workspaceTarget.dataAction === "select-workspace",
    JSON.stringify(workspaceTarget)
  );

  const result = await waitForBrowserState(
    browser,
    context,
    `((async () => {
      const session = await fetch("/auth/session", {
        credentials: "include"
      });
      const sessionText = await session.text();
      const bodyText = document.body.innerText;
      return JSON.stringify({
        currentUrl: location.href,
        loginRenderedDashboard:
          bodyText.includes("Overall internal readiness") &&
          bodyText.includes(${JSON.stringify(seeded.expectedDashboardText)}),
        selectedWorkspaceNameVisible: bodyText.includes(${JSON.stringify(seeded.selectedOrganization.name)}),
        primaryWorkspaceNameVisible: bodyText.includes(${JSON.stringify(seeded.primaryOrganization.name)}),
        selectedSnapshotVisible: bodyText.includes(${JSON.stringify(`snapshot ${seeded.selectedOrganization.organizationId}`)}),
        sessionStatus: session.status,
        sessionHasSelectedOrganization: sessionText.includes(${JSON.stringify(seeded.selectedOrganization.organizationId)})
      });
    })())`,
    (candidate) =>
      candidate.loginRenderedDashboard === true &&
      candidate.sessionStatus === 200 &&
      candidate.selectedWorkspaceNameVisible === true,
    "browser workspace selection renders selected dashboard",
    5_000
  );

  record("browser_web_workspace_selection_renders_dashboard", result.loginRenderedDashboard === true, JSON.stringify(result));
  record("browser_web_workspace_selection_lands_on_dashboard_url", new URL(result.currentUrl).pathname === "/", JSON.stringify(result));
  record("browser_web_workspace_selection_shows_selected_workspace", result.selectedWorkspaceNameVisible === true, JSON.stringify(result));
  record("browser_web_workspace_selection_hides_unselected_workspace", result.primaryWorkspaceNameVisible === false, JSON.stringify(result));
  record("browser_web_workspace_selection_uses_selected_snapshot", result.selectedSnapshotVisible === true, JSON.stringify(result));
  record("browser_web_session_contains_selected_active_organization", result.sessionHasSelectedOrganization === true, JSON.stringify(result));
}

async function assertBrowserAuthSessionSmoke(browser, context, browserAuthBaseUrl) {
  await browser.command("browsingContext.setViewport", {
    context,
    viewport: {
      width: 900,
      height: 700
    },
    devicePixelRatio: 1
  });
  await browser.command("browsingContext.navigate", {
    context,
    url: `${browserAuthBaseUrl}/browser-auth`,
    wait: "complete"
  });

  const credentials = {
    email: "m40-browser@example.test",
    password: "CorrectHorseBatteryStaple42!"
  };
  const loginResult = await evaluateBrowserJson(
    browser,
    context,
    `((async () => {
      const postJson = async (path, body) => {
        const response = await fetch(path, {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(body)
        });
        const text = await response.text();
        return {
          status: response.status,
          text,
          containsSessionToken: text.includes("sessionToken")
        };
      };
      const register = await postJson("/auth/register", {
        email: ${JSON.stringify(credentials.email)},
        password: ${JSON.stringify(credentials.password)},
        displayName: "M40 Browser Smoke"
      });
      const login = await postJson("/auth/login", {
        email: ${JSON.stringify(credentials.email)},
        password: ${JSON.stringify(credentials.password)}
      });
      return JSON.stringify({
        registerStatus: register.status,
        loginStatus: login.status,
        loginBodyContainsSessionToken: login.containsSessionToken,
        documentCookieAfterLogin: document.cookie
      });
    })())`
  );

  record("browser_register_accepts_trusted_same_origin", loginResult.registerStatus === 201, JSON.stringify(loginResult));
  record("browser_login_accepts_trusted_same_origin", loginResult.loginStatus === 200, JSON.stringify(loginResult));
  record("browser_login_body_keeps_session_token_secret", loginResult.loginBodyContainsSessionToken === false);
  record("browser_document_cookie_cannot_read_http_only_session", !loginResult.documentCookieAfterLogin.includes("puresoc_session"), loginResult.documentCookieAfterLogin);

  const cookiesAfterLogin = await getBrowserCookies(browser, context);
  const sessionCookie = cookiesAfterLogin.find((cookie) => cookie.name === "puresoc_session");
  record("browser_storage_session_cookie_present_after_login", Boolean(sessionCookie), JSON.stringify(cookiesAfterLogin));
  record("browser_storage_session_cookie_http_only", sessionCookie?.httpOnly === true, JSON.stringify(sessionCookie));
  record("browser_storage_session_cookie_samesite_lax", String(sessionCookie?.sameSite ?? "").toLowerCase() === "lax", JSON.stringify(sessionCookie));
  record("browser_storage_session_cookie_not_secure_in_local_http_mode", sessionCookie?.secure === false, JSON.stringify(sessionCookie));

  const sessionResult = await evaluateBrowserJson(
    browser,
    context,
    `((async () => {
      const sessionBefore = await fetch("/auth/session", { credentials: "include" });
      const sessionBeforeText = await sessionBefore.text();
      const logout = await fetch("/auth/logout", {
        method: "POST",
        credentials: "include"
      });
      const logoutText = await logout.text();
      const sessionAfter = await fetch("/auth/session", { credentials: "include" });
      const sessionAfterText = await sessionAfter.text();
      return JSON.stringify({
        sessionBeforeStatus: sessionBefore.status,
        sessionBeforeHasEmail: sessionBeforeText.includes(${JSON.stringify(credentials.email)}),
        logoutStatus: logout.status,
        logoutBodyMentionsRevoked: logoutText.includes("revoked"),
        sessionAfterStatus: sessionAfter.status,
        sessionAfterBody: sessionAfterText.slice(0, 240),
        documentCookieAfterLogout: document.cookie
      });
    })())`
  );
  record("browser_session_cookie_authenticates_fetch", sessionResult.sessionBeforeStatus === 200, JSON.stringify(sessionResult));
  record("browser_session_body_matches_browser_user", sessionResult.sessionBeforeHasEmail === true, JSON.stringify(sessionResult));
  record("browser_logout_accepts_trusted_same_origin", sessionResult.logoutStatus === 200, JSON.stringify(sessionResult));
  record("browser_logout_body_reports_revoked_session", sessionResult.logoutBodyMentionsRevoked === true, JSON.stringify(sessionResult));
  record("browser_logout_clears_session_for_subsequent_navigation", sessionResult.sessionAfterStatus !== 200, JSON.stringify(sessionResult));
  record("browser_document_cookie_remains_unreadable_after_logout", !sessionResult.documentCookieAfterLogout.includes("puresoc_session"), sessionResult.documentCookieAfterLogout);

  const cookiesAfterLogout = await getBrowserCookies(browser, context);
  record(
    "browser_storage_session_cookie_removed_after_logout",
    !cookiesAfterLogout.some((cookie) => cookie.name === "puresoc_session"),
    JSON.stringify(cookiesAfterLogout)
  );

  return {
    registerStatus: loginResult.registerStatus,
    loginStatus: loginResult.loginStatus,
    sessionBeforeStatus: sessionResult.sessionBeforeStatus,
    logoutStatus: sessionResult.logoutStatus,
    sessionAfterStatus: sessionResult.sessionAfterStatus,
    cookieAttributes: {
      httpOnly: sessionCookie?.httpOnly,
      secure: sessionCookie?.secure,
      sameSite: sessionCookie?.sameSite
    }
  };
}

async function getBrowserCookies(browser, context) {
  const result = await browser.command("storage.getCookies", {
    partition: {
      type: "context",
      context
    }
  });

  return result.cookies ?? [];
}

async function evaluateBrowserJson(browser, context, expression) {
  const result = await browser.command("script.evaluate", {
    expression,
    target: {
      context
    },
    awaitPromise: true
  });

  if (result.type !== "success" || result.result?.type !== "string") {
    throw new Error(`Expected browser script to return a JSON string: ${JSON.stringify(result)}`);
  }

  return JSON.parse(result.result.value);
}

async function waitForBrowserState(browser, context, expression, predicate, label, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastResult = null;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const result = await evaluateBrowserJson(browser, context, expression);
      lastResult = result;
      if (predicate(result)) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }

    await delay(100);
  }

  throw new Error(
    `${label} timed out${lastResult ? `: ${JSON.stringify(lastResult)}` : lastError instanceof Error ? `: ${lastError.message}` : ""}`
  );
}

function assertOperationalConsole(consoleHtml, loginHtml) {
  const text = htmlText(consoleHtml);
  record("console_html_is_nonblank", consoleHtml.length > 12_000);
  record("first_screen_is_operational_console", consoleHtml.includes('data-ui-smoke="operational-console"'));
  record("dashboard_readiness_copy_is_present", text.includes("Overall internal readiness"));
  record("legal_caveat_is_present", text.includes("not a legal opinion"));
  record("provider_write_execution_not_exposed", !consoleHtml.includes(">Apply<") && consoleHtml.includes("Queue unavailable"));
  record("login_form_has_accessible_labels", loginHtml.includes('<label for="email">Email</label>') && loginHtml.includes('autocomplete="current-password"'));
  record("ui_does_not_make_certification_claims", !/certified compliant|guaranteed nis2 compliance|legal compliance approved/i.test(text));
  record("html_has_no_undefined_or_object_leaks", !/(undefined|\[object Object\])/.test(consoleHtml));
  record("html_ids_are_unique", duplicateIds(consoleHtml).length === 0, duplicateIds(consoleHtml).join(", "));
}

function assertResponsiveLayout(html) {
  const css = styleBlock(html);
  record("desktop_grid_uses_stable_minmax_tracks", css.includes("grid-template-columns: 17.5rem minmax(0, 1fr)") && css.includes("repeat(6, minmax(0, 1fr))"));
  record("mobile_breakpoints_are_present", css.includes("@media (max-width: 980px)") && css.includes("@media (max-width: 640px)") && css.includes("@media (max-width: 420px)"));
  record("tables_scroll_instead_of_squeezing_text", css.includes(".ps-table-wrap") && css.includes("overflow-x: auto"));
  record("chips_and_buttons_wrap_long_text", css.includes("overflow-wrap: anywhere") && css.includes("white-space: normal"));
  record("focus_visible_affordance_is_present", css.includes(":focus-visible") && html.includes('href="#content"'));
  record("font_size_does_not_scale_with_viewport_width", !/font-size:\s*[^;]*vw/.test(css));
  record("letter_spacing_is_not_negative", !/letter-spacing:\s*-/.test(css));
}

function assertNoObviousOverlapRegression(html) {
  const nestedPanel = /<article class="ps-panel">[\s\S]*?<div class="ps-panel"><h4/.test(html);
  record("approval_facts_are_not_nested_cards", !nestedPanel);
  record("absolute_positioning_is_limited_to_skip_link", (styleBlock(html).match(/position:\s*absolute/g) ?? []).length === 1);
  const longButtonLabels = [...html.matchAll(/<button[^>]*>[\s\S]*?<span>([^<]+)<\/span><\/button>/g)]
    .map((match) => match[1] ?? "")
    .filter((label) => label.length > 32);
  record("button_labels_fit_compact_controls", longButtonLabels.length === 0, longButtonLabels.join(", "));
}

function assertRomaniaOnboardingRoute(html) {
  const text = htmlText(html);
  record("romania_route_html_is_nonblank", html.length > 14_000, String(html.length));
  record("romania_route_marker_present", html.includes('data-ui-smoke="romania-onboarding-route"'));
  record("romania_route_declares_ro_locale", html.includes('<html lang="ro">'));
  record("romania_route_source_map_sample_visible", text.includes("Source Map Sample") && text.includes("Workbook-derived mappings"));
  record(
    "romania_route_workbook_source_map_cells_visible",
    html.includes("ro-nis2-entity_fields-entity_field_12_name_of_the_entity") && html.includes("Entity assessment!D66:D142")
  );
  record("romania_route_legal_caveat_visible", text.includes("not a legal opinion"));
  record(
    "romania_route_locale_fallback_metadata_visible",
    text.includes("missing_translation") && text.includes("requested ro-RO") && text.includes("caveat en")
  );
  record(
    "romania_route_unsupported_states_visible",
    text.includes("Boundaries And Unsupported States") &&
      text.includes("Direct DNSC submission") &&
      text.includes("Legal activation") &&
      text.includes("not a full React or Next.js onboarding wizard")
  );
  record(
    "romania_route_no_dnsc_submission_visible",
    text.includes("no DNSC submission") &&
      text.includes("Submitted to DNSC") &&
      text.includes("false") &&
      text.includes("PureSOC does not submit this draft to DNSC.")
  );
  record("romania_route_no_dnsc_direct_submit_command", !/submit\s+(to\s+)?dnsc/i.test(text));
  record("romania_route_has_no_certification_claims", !/certified compliant|guaranteed nis2 compliance|legal compliance approved/i.test(text));
  record("romania_route_html_has_no_undefined_or_object_leaks", !/(undefined|\[object Object\])/.test(html));
  record("romania_route_html_ids_are_unique", duplicateIds(html).length === 0, duplicateIds(html).join(", "));
  assertRomaniaRouteResponsiveFocus(html);
}

function assertRomaniaRouteResponsiveFocus(html) {
  const css = styleBlock(html);
  record("romania_route_mobile_breakpoints_present", css.includes("@media (max-width: 980px)") && css.includes("@media (max-width: 640px)"));
  record("romania_route_tables_scroll_instead_of_squeezing_text", css.includes(".ps-table-wrap") && css.includes("overflow-x: auto"));
  record("romania_route_chips_and_buttons_wrap_long_text", css.includes("overflow-wrap: anywhere") && css.includes("white-space: normal"));
  record("romania_route_focus_visible_affordance_present", css.includes(":focus-visible") && html.includes('href="#content"') && html.includes('id="content" tabindex="-1"'));
  record("romania_route_font_size_does_not_scale_with_viewport_width", !/font-size:\s*[^;]*vw/.test(css));
  record("romania_route_letter_spacing_is_not_negative", !/letter-spacing:\s*-/.test(css));
}

function writeViewportSnapshot({ name, width, height, html }) {
  const filePath = join(artifactsDir, `${name}-${width}x${height}.html`);
  const digest = createHash("sha256").update(html).digest("hex").slice(0, 16);
  writeFileSync(
    filePath,
    [
      `<!-- PureSOC M39 UI smoke ${name} viewport ${width}x${height}.`,
      "This is a deterministic HTTP-rendered snapshot fallback, not a browser PNG.",
      `HTML SHA-256 prefix: ${digest}. -->`,
      html
    ].join("\n"),
    "utf8"
  );
  record(`${name}_viewport_snapshot_written`, true);
  return filePath;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  record(`fetch_${routeLabel(url)}_status_ok`, response.status === 200);
  return response.text();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  record(`fetch_${routeLabel(url)}_status_ok`, response.status === 200);
  return response.json();
}

function postJson(url, body, headers = {}) {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function styleBlock(html) {
  return html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
}

function htmlText(html) {
  return html.replace(/<style>[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function routeLabel(url) {
  return (new URL(url).pathname || "root").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "root";
}

function duplicateIds(html) {
  const seen = new Set();
  const duplicates = new Set();
  for (const match of html.matchAll(/\sid="([^"]+)"/g)) {
    const id = match[1];
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  return [...duplicates];
}

function analyzePngScreenshot(filePath) {
  const png = readFileSync(filePath);
  const signature = "89504e470d0a1a0a";
  if (png.subarray(0, 8).toString("hex") !== signature) {
    throw new Error(`Screenshot is not a PNG: ${filePath}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlaceMethod = 0;
  const idatChunks = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === "IHDR") {
      width = png.readUInt32BE(dataStart);
      height = png.readUInt32BE(dataStart + 4);
      bitDepth = png[dataStart + 8];
      colorType = png[dataStart + 9];
      interlaceMethod = png[dataStart + 12];
    } else if (type === "IDAT") {
      idatChunks.push(png.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType) || interlaceMethod !== 0) {
    throw new Error(`Unsupported PNG format for screenshot analysis: bitDepth=${bitDepth} colorType=${colorType} interlace=${interlaceMethod}`);
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const scanlineLength = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const pixels = Buffer.alloc(scanlineLength * height);
  let inputOffset = 0;
  let outputOffset = 0;
  let previousLine = Buffer.alloc(scanlineLength);

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;
    const rawLine = inflated.subarray(inputOffset, inputOffset + scanlineLength);
    inputOffset += scanlineLength;
    const line = Buffer.alloc(scanlineLength);

    for (let x = 0; x < scanlineLength; x += 1) {
      const left = x >= bytesPerPixel ? line[x - bytesPerPixel] : 0;
      const up = previousLine[x] ?? 0;
      const upLeft = x >= bytesPerPixel ? previousLine[x - bytesPerPixel] ?? 0 : 0;
      const raw = rawLine[x] ?? 0;
      line[x] = (raw + pngFilterPrediction(filterType, left, up, upLeft)) & 0xff;
    }

    line.copy(pixels, outputOffset);
    outputOffset += scanlineLength;
    previousLine = line;
  }

  const sampleStride = Math.max(1, Math.floor((width * height) / 6_000));
  const uniqueColors = new Map();
  let nonLightSamples = 0;
  let samples = 0;
  let luminanceSum = 0;
  let luminanceSquaredSum = 0;

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += sampleStride) {
    const offsetForPixel = pixelIndex * bytesPerPixel;
    const red = pixels[offsetForPixel] ?? 0;
    const green = pixels[offsetForPixel + 1] ?? 0;
    const blue = pixels[offsetForPixel + 2] ?? 0;
    const alpha = colorType === 6 ? pixels[offsetForPixel + 3] ?? 255 : 255;
    if (alpha < 16) {
      continue;
    }

    const colorBucket = `${red >> 4}-${green >> 4}-${blue >> 4}`;
    uniqueColors.set(colorBucket, (uniqueColors.get(colorBucket) ?? 0) + 1);
    const lightness = luminance(red, green, blue);
    if (lightness < 238) {
      nonLightSamples += 1;
    }
    luminanceSum += lightness;
    luminanceSquaredSum += lightness * lightness;
    samples += 1;
  }

  const edgeStepX = Math.max(1, Math.floor(width / 120));
  const edgeStepY = Math.max(1, Math.floor(height / 80));
  let edgeComparisons = 0;
  let edgeTransitions = 0;
  for (let y = 0; y < height - 1; y += edgeStepY) {
    for (let x = 0; x < width - 1; x += edgeStepX) {
      const current = pixelLuminance(pixels, bytesPerPixel, width, x, y);
      const right = pixelLuminance(pixels, bytesPerPixel, width, Math.min(width - 1, x + edgeStepX), y);
      const down = pixelLuminance(pixels, bytesPerPixel, width, x, Math.min(height - 1, y + edgeStepY));
      if (Math.abs(current - right) > 10 || Math.abs(current - down) > 10) {
        edgeTransitions += 1;
      }
      edgeComparisons += 1;
    }
  }

  const luminanceMean = samples > 0 ? luminanceSum / samples : 0;
  const luminanceVariance = samples > 0 ? Math.max(0, luminanceSquaredSum / samples - luminanceMean * luminanceMean) : 0;
  const dominantColorCount = Math.max(0, ...uniqueColors.values());

  return {
    byteLength: png.length,
    width,
    height,
    sampledPixelCount: samples,
    uniqueSampledColors: uniqueColors.size,
    dominantColorRatio: samples > 0 ? Number((dominantColorCount / samples).toFixed(4)) : 1,
    nonLightRatio: samples > 0 ? Number((nonLightSamples / samples).toFixed(4)) : 0,
    edgeRatio: edgeComparisons > 0 ? Number((edgeTransitions / edgeComparisons).toFixed(4)) : 0,
    luminanceMean: Number(luminanceMean.toFixed(2)),
    luminanceStdDev: Number(Math.sqrt(luminanceVariance).toFixed(2))
  };
}

function pixelLuminance(pixels, bytesPerPixel, width, x, y) {
  const offsetForPixel = (y * width + x) * bytesPerPixel;
  return luminance(pixels[offsetForPixel] ?? 0, pixels[offsetForPixel + 1] ?? 0, pixels[offsetForPixel + 2] ?? 0);
}

function luminance(red, green, blue) {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function pngFilterPrediction(filterType, left, up, upLeft) {
  if (filterType === 0) {
    return 0;
  }

  if (filterType === 1) {
    return left;
  }

  if (filterType === 2) {
    return up;
  }

  if (filterType === 3) {
    return Math.floor((left + up) / 2);
  }

  if (filterType === 4) {
    const predictor = left + up - upLeft;
    const leftDistance = Math.abs(predictor - left);
    const upDistance = Math.abs(predictor - up);
    const upLeftDistance = Math.abs(predictor - upLeft);

    if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
      return left;
    }

    return upDistance <= upLeftDistance ? up : upLeft;
  }

  throw new Error(`Unsupported PNG filter type: ${filterType}`);
}

async function connectWebSocketWithRetry(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      return await openWebSocket(url, 1_500);
    } catch (error) {
      lastError = error;
      await delay(150);
    }
  }

  throw new Error(`Unable to connect to Firefox BiDi at ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function openWebSocket(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const websocket = new WebSocket(url);
    const timer = setTimeout(() => {
      try {
        websocket.close();
      } catch {
        // Ignore close races while probing startup.
      }
      reject(new Error("WebSocket connection timed out."));
    }, timeoutMs);

    websocket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve(websocket);
    });
    websocket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("WebSocket connection failed."));
    });
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = createTcpServer();
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close(() => reject(new Error("Expected a TCP port from the probe server.")));
        return;
      }

      const port = address.port;
      probe.close((error) => (error ? reject(error) : resolve(port)));
    });
    probe.once("error", reject);
  });
}

function serverBaseUrl(server) {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected local TCP server address.");
  }

  return `http://127.0.0.1:${address.port}`;
}

function waitForListening(server) {
  if (server.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
}

function closeServer(server) {
  if (!server?.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function closeAllServers() {
  await Promise.allSettled(servers.map((server) => closeServer(server)));
  servers = [];
}

function waitForProcessExit(processToWaitFor, timeoutMs) {
  if (processToWaitFor.exitCode !== null || processToWaitFor.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (!processToWaitFor.killed) {
        processToWaitFor.kill("SIGKILL");
      }
      resolve();
    }, timeoutMs);

    processToWaitFor.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "text";
}

function redactSmokeText(value) {
  return String(value)
    .replace(/puresoc_session=[^;\s"]+/gi, "puresoc_session=[redacted]")
    .replace(/"sessionToken"\s*:\s*"[^"]+"/gi, '"sessionToken":"[redacted]"')
    .replace(/(token|secret|password|authorization|cookie)=([^;\s"]+)/gi, "$1=[redacted]");
}

function resolvePnpmPackageDir(packageName) {
  const pnpmStore = join(process.cwd(), "node_modules", ".pnpm");
  const packagePrefix = `${packageName}@`;
  const packageEntry = readdirSync(pnpmStore)
    .filter((entry) => entry.startsWith(packagePrefix))
    .sort()
    .at(-1);

  if (!packageEntry) {
    throw new Error(`Unable to resolve ${packageName} from ${pnpmStore}.`);
  }

  return join(pnpmStore, packageEntry, "node_modules", packageName);
}
