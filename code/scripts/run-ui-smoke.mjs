import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
      ...apiBackedDashboard
    });
    const webSession = await fetchJson(`${webBaseUrl}/auth/session`, {
      headers: {
        cookie: webLogin.cookie
      }
    });
    record("web_session_proxy_returns_active_organization", webSession.session?.activeOrganizationId === apiBackedDashboard.organizationId);
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
              "Run pnpm test:e2e -- --grep @ui-smoke for the deterministic M39 HTTP fallback. Browser PNG/auth coverage is not claimed when this blocker is present.",
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
            screenshots
          },
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
    now: () => new Date("2026-05-02T10:00:00.000Z")
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
      displayName: "M53 Web Runtime"
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

  const organization = await postJson(
    `${apiBaseUrl}/organizations`,
    {
      name: "M53 API Backed Workspace",
      primaryCountryCode: "RO"
    },
    {
      ...requestHeaders,
      cookie: seedCookie
    }
  );
  record("web_runtime_api_create_organization_status_created", organization.status === 201, String(organization.status));
  const organizationBody = await organization.json();
  const organizationId = organizationBody.organization?.id;
  record("web_runtime_api_organization_id_present", typeof organizationId === "string" && organizationId.length > 0);

  const assessmentId = `${organizationId}:m53-web-runtime`;
  const evaluation = await postJson(
    `${apiBaseUrl}/organizations/${organizationId}/compliance/evaluate`,
    {
      assessmentId,
      jurisdiction: "EU",
      countryPack: {
        countryCode: "RO",
        completeness: "planned_full_pack",
        warnings: ["M53 served web runtime smoke"]
      },
      providerFindings: [
        {
          id: "finding_m53_mfa",
          providerKey: "microsoft365",
          signalKey: "entra.admin_mfa_gap",
          severity: "high",
          summary: "Synthetic read-only MFA finding for local web runtime smoke."
        }
      ],
      evidenceArtifacts: [
        {
          id: "evidence_m53_dashboard",
          title: "M53 dashboard source evidence",
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
  record("web_runtime_api_evaluate_status_ok", evaluation.status === 200, String(evaluation.status));

  const dashboard = await postJson(
    `${apiBaseUrl}/organizations/${organizationId}/dashboards/snapshots`,
    {
      assessmentId,
      countryPackCompleteness: 77
    },
    {
      ...requestHeaders,
      cookie: seedCookie
    }
  );
  record("web_runtime_api_dashboard_snapshot_status_created", dashboard.status === 201, String(dashboard.status));
  const dashboardBody = await dashboard.json();
  record("web_runtime_api_dashboard_source_is_stored_analysis", dashboardBody.snapshot?.source === "stored_analysis");

  return {
    ...credentials,
    organizationId,
    assessmentId,
    expectedDashboardText: "Open gaps"
  };
}

async function loginThroughWeb({ webBaseUrl, email, password, organizationId }) {
  const response = await fetch(`${webBaseUrl}/auth/login`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      email,
      password,
      activeOrganizationId: organizationId
    })
  });

  record("web_login_proxy_redirects_after_api_login", response.status === 303, String(response.status));
  record("web_login_proxy_redirect_location_dashboard", response.headers.get("location") === "/");
  const cookie = response.headers.get("set-cookie") ?? "";
  record("web_login_proxy_sets_api_session_cookie", cookie.includes("puresoc_session"));
  return {
    cookie
  };
}

function assertApiBackedDashboardHtml(html, seeded) {
  const text = htmlText(html);
  record("web_dashboard_uses_api_latest_snapshot_route", text.includes("GET /organizations/:orgId/dashboards/snapshots/latest"));
  record("web_dashboard_contains_seeded_api_widget", text.includes(seeded.expectedDashboardText));
  record("web_dashboard_contains_active_workspace_marker", text.includes(`Workspace ${seeded.organizationId.slice(0, 8)}`));
  record("web_dashboard_contains_api_session_user", text.includes("M53 Web Runtime"));
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

  record(`${input.name}_browser_png_dimensions`, analysis.width === input.width && analysis.height === input.height, `${analysis.width}x${analysis.height}`);
  record(`${input.name}_browser_png_nonblank`, analysis.uniqueSampledColors >= 24 && analysis.nonLightRatio > 0.01, JSON.stringify(analysis));

  return {
    name: input.name,
    filePath,
    width: analysis.width,
    height: analysis.height,
    uniqueSampledColors: analysis.uniqueSampledColors,
    nonLightRatio: analysis.nonLightRatio
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
      return JSON.stringify({
        url: location.href,
        title: document.title,
        text: document.body.innerText,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY,
        documentScrollWidth: document.documentElement.scrollWidth,
        hasOperationalConsole: Boolean(document.querySelector('[data-ui-smoke="operational-console"]')),
        hasSkipLink: Boolean(document.querySelector('a[href="#content"]')),
        overlapCount,
        overflowingControls,
        zeroSizedControls,
        approvalFactsNested: Boolean(document.querySelector(".ps-panel .ps-panel .ps-fact")),
        certificationClaim: /certified compliant|guaranteed nis2 compliance|legal compliance approved/i.test(document.body.innerText)
      });
    })()`
  );
}

function assertBrowserLayout(name, layout, input) {
  record(`${name}_browser_viewport_width`, layout.innerWidth === input.width, `${layout.innerWidth}`);
  record(`${name}_browser_viewport_height`, layout.innerHeight === input.height, `${layout.innerHeight}`);
  const minimumReadableTextLength = input.expectOperationalConsole ? 100 : 40;
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
  } else {
    record(`${name}_browser_login_without_console_marker`, layout.hasOperationalConsole === false);
  }

  for (const expected of input.expectedText ?? []) {
    record(`${name}_browser_text_${slug(expected)}`, layout.text.includes(expected), expected);
  }

  if (input.scrollTarget) {
    record(`${name}_browser_anchor_scroll_applied`, layout.scrollY > 0, `${layout.scrollY}`);
  }
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

  const result = await evaluateBrowserJson(
    browser,
    context,
    `((async () => {
      const response = await fetch("/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          email: ${JSON.stringify(seeded.email)},
          password: ${JSON.stringify(seeded.password)},
          activeOrganizationId: ${JSON.stringify(seeded.organizationId)}
        })
      });
      const loginText = await response.text();
      const session = await fetch("/auth/session", {
        credentials: "include"
      });
      const sessionText = await session.text();
      return JSON.stringify({
        loginStatus: response.status,
        loginUrl: response.url,
        loginRenderedDashboard: loginText.includes("Overall internal readiness") && loginText.includes(${JSON.stringify(seeded.expectedDashboardText)}),
        sessionStatus: session.status,
        sessionHasActiveOrganization: sessionText.includes(${JSON.stringify(seeded.organizationId)}),
        documentCookieAfterLogin: document.cookie
      });
    })())`
  );

  record("browser_web_login_proxy_renders_dashboard", result.loginStatus === 200 && result.loginRenderedDashboard === true, JSON.stringify(result));
  record("browser_web_login_lands_on_dashboard_url", result.loginUrl.endsWith("/"), JSON.stringify(result));
  record("browser_web_session_proxy_status_ok", result.sessionStatus === 200, JSON.stringify(result));
  record("browser_web_session_contains_active_organization", result.sessionHasActiveOrganization === true, JSON.stringify(result));
  record("browser_web_document_cookie_cannot_read_http_only_session", !result.documentCookieAfterLogin.includes("puresoc_session"), result.documentCookieAfterLogin);
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
  const uniqueColors = new Set();
  let nonLightSamples = 0;
  let samples = 0;

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += sampleStride) {
    const offsetForPixel = pixelIndex * bytesPerPixel;
    const red = pixels[offsetForPixel] ?? 0;
    const green = pixels[offsetForPixel + 1] ?? 0;
    const blue = pixels[offsetForPixel + 2] ?? 0;
    const alpha = colorType === 6 ? pixels[offsetForPixel + 3] ?? 255 : 255;
    if (alpha < 16) {
      continue;
    }

    uniqueColors.add(`${red >> 4}-${green >> 4}-${blue >> 4}`);
    const lightness = (red + green + blue) / 3;
    if (lightness < 238) {
      nonLightSamples += 1;
    }
    samples += 1;
  }

  return {
    width,
    height,
    uniqueSampledColors: uniqueColors.size,
    nonLightRatio: samples > 0 ? Number((nonLightSamples / samples).toFixed(4)) : 0
  };
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
