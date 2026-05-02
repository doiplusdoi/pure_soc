import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const grepIndex = process.argv.indexOf("--grep");
const grepPattern = grepIndex >= 0 ? process.argv[grepIndex + 1] : "@ui-smoke";

if (!grepPattern.includes("@ui-smoke")) {
  console.log(
    JSON.stringify({
      schema: "puresoc.ui_smoke.served_web.v1",
      status: "skipped",
      reason: "run-ui-smoke only owns the @ui-smoke served web/runtime smoke"
    })
  );
  process.exit(0);
}

const { createJiti } = await import(pathToFileURL(join(resolvePnpmPackageDir("jiti"), "lib", "jiti.mjs")).href);
const jiti = createJiti(import.meta.url);
const { loadConfig } = await jiti.import("../packages/config/src/index.ts");
const { createApiServices } = await jiti.import("../apps/api/src/auth/services.ts");
const { startApiServer } = await jiti.import("../apps/api/src/server.ts");
const { startWebServer } = await jiti.import("../apps/web/src/server.ts");

const artifactsDir = mkdtempSync(join(tmpdir(), "puresoc-ui-smoke-"));
const checks = [];
const servers = [];

try {
  const webServer = startWebServer(0);
  servers.push(webServer);
  await waitForListening(webServer);
  const webBaseUrl = serverBaseUrl(webServer);

  const apiServer = await startApiSmokeServer({
    webBaseUrl,
    secureCookie: false
  });
  servers.push(apiServer.server);
  const apiBaseUrl = apiServer.baseUrl;

  const consoleHtml = await fetchText(`${webBaseUrl}/`);
  const loginHtml = await fetchText(`${webBaseUrl}/login`);
  const health = await fetchJson(`${webBaseUrl}/health`);
  record("web_health_contract", health.service === "puresoc-web" && health.status === "ok");

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
          mobileSnapshot
        },
        checks: checkNames(),
        nonLiveGuarantees: [
          "no Microsoft Graph calls",
          "no Stripe API calls",
          "no OIDC provider calls",
          "no object-storage or scanner calls",
          "no KMS/secret-manager calls",
          "no public regulatory fetches",
          "no provider write execution"
        ]
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
  await Promise.allSettled(servers.map((server) => closeServer(server)));
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

async function startApiSmokeServer({ webBaseUrl, secureCookie }) {
  const config = loadConfig({
    env: {
      ...process.env,
      PURESOC_APP_ENV: "development",
      PURESOC_PERSISTENCE_MODE: "memory",
      PURESOC_AUTH_COOKIE_SECURE: secureCookie ? "true" : "false",
      PURESOC_API_TRUSTED_ORIGINS: webBaseUrl,
      PURESOC_API_RATE_LIMIT_ENABLED: "true",
      PURESOC_API_RATE_LIMIT_MAX_REQUESTS: "500",
      PURESOC_BILLING_PROVIDER: "none"
    }
  });
  const services = createApiServices({
    config,
    now: () => new Date("2026-05-02T10:00:00.000Z")
  });
  const server = startApiServer(0, services);
  await waitForListening(server);

  return {
    server,
    services,
    baseUrl: serverBaseUrl(server)
  };
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

async function fetchText(url) {
  const response = await fetch(url);
  record(`fetch_${routeLabel(url)}_status_ok`, response.status === 200);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url);
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
