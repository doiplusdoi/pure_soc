import { once } from "node:events";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";

import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";

import {
  createOperationalConsoleDemoModel,
  createOperationalConsoleRuntimeModel,
  createRomaniaOnboardingRouteModel,
  renderLoginScreen,
  renderOperationalConsole,
  renderRomaniaOnboardingRoute,
  renderWorkspaceSelectionScreen
} from "../index";
import { startWebServer } from "../server";

describe("web dashboard reports operational UI", () => {
  it("renders the operational console from stored aggregate data with source indicators and the legal caveat", () => {
    const model = createOperationalConsoleDemoModel();
    const html = renderOperationalConsole(model);

    expect(html).toContain('data-ui-smoke="operational-console"');
    expect(html).toContain("Dashboard source");
    expect(html).toContain("stored_analysis");
    expect(html).toContain("compliance_gaps + provider_recommendations");
    expect(html).toContain(PURESOC_LEGAL_CAVEAT);
    expect(html).toContain("not a legal opinion");
    expect(html).toContain("NIS2 Article 21");
    expect(html).toContain("Romania NIS2 workbook notification form");
    expect(html).toContain("Internal readiness report");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
  });

  it("surfaces remediation approval state without exposing provider write execution", () => {
    const html = renderOperationalConsole(createOperationalConsoleDemoModel());

    expect(html).toContain("approval requested");
    expect(html).toContain("preflight passed");
    expect(html).toContain("Blast radius");
    expect(html).toContain("Pre-state snapshot");
    expect(html).toContain("Queue unavailable");
    expect(html).toContain("Provider write execution remains disabled");
    expect(html).toContain('class="ps-fact"');
    expect(html).not.toContain(">Apply<");
    expect(html).not.toContain('<div class="ps-panel"><h4');
  });

  it("@ui-smoke renders responsive desktop and mobile affordances without hiding keyboard focus", () => {
    const html = renderOperationalConsole(createOperationalConsoleDemoModel());
    const login = renderLoginScreen();

    expect(html).toContain("@media (max-width: 980px)");
    expect(html).toContain("@media (max-width: 640px)");
    expect(html).toContain("@media (max-width: 420px)");
    expect(html).toContain(":focus-visible");
    expect(html).toContain("overflow-wrap: anywhere");
    expect(html).toContain("white-space: normal");
    expect(html).toContain('href="#content"');
    expect(html).toContain('data-ui-action="skip-to-content"');
    expect(html).toContain('id="content" tabindex="-1"');
    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('data-ui-action="open-romania-onboarding"');
    expect(login).toContain('<label for="email">Email</label>');
    expect(login).toContain('data-ui-smoke="login-screen"');
    expect(login).toContain('<label for="password">Password</label>');
    expect(login).toContain('autocomplete="current-password"');
    expect(login).toContain('type="submit"');

    const buttonLabels = [...html.matchAll(/<button[^>]*>\s*(?:<span[^>]*>[^<]*<\/span>)?<span>([^<]+)<\/span>/g)].map(
      (match) => match[1] ?? ""
    );
    expect(buttonLabels.every((label) => label.length <= 32)).toBe(true);
  });

  it("wires browser screenshot visual threshold manifest coverage without golden image baselines", () => {
    const smokeScript = readFileSync(new URL("../../../../scripts/run-ui-smoke.mjs", import.meta.url), "utf8");

    expect(smokeScript).toContain('const VISUAL_METRICS_SCHEMA = "puresoc.ui_smoke.visual_metrics.v1"');
    expect(smokeScript).toContain('"visual-metrics-manifest.json"');
    expect(smokeScript).toContain("createVisualMetrics");
    expect(smokeScript).toContain("assertVisualThresholds");
    expect(smokeScript).toContain("edgeRatio");
    expect(smokeScript).toContain("dominantColorRatio");
    expect(smokeScript).toContain("route_id");
    expect(smokeScript).toContain("dashboard-desktop");
    expect(smokeScript).toContain("dashboard-mobile");
    expect(smokeScript).toContain("login-mobile");
    expect(smokeScript).toContain("evidence-desktop");
    expect(smokeScript).toContain("approvals-desktop");
    expect(smokeScript).toContain("romania-route-desktop");
    expect(smokeScript).toContain("romania-route-mobile");
    expect(smokeScript).not.toContain("golden-image");
  });

  it("renders browser-traversable route anchors for keyboard and pointer smoke", () => {
    const dashboardHtml = renderOperationalConsole(createOperationalConsoleDemoModel());
    const romaniaHtml = renderRomaniaOnboardingRoute(createRomaniaOnboardingRouteModel({ locale: "ro-RO" }));

    expect(dashboardHtml).toContain(
      '<a class="ps-nav__link" href="/onboarding/romania?locale=ro-RO" data-ui-action="open-romania-onboarding">'
    );
    expect(dashboardHtml).toContain('<a class="ps-command" href="/workspaces" data-ui-action="open-workspace-selector">Switch workspace</a>');
    expect(dashboardHtml).not.toContain('onclick="');
    expect(romaniaHtml).toContain('<a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a>');
    expect(romaniaHtml).not.toContain('onclick="');
  });

  it("renders a visible API-backed organization selection workspace selector without exposing session secrets", () => {
    const html = renderWorkspaceSelectionScreen({
      session: {
        user: {
          id: "user_workspace",
          email: "workspace@example.test",
          displayName: "Workspace User"
        },
        session: {
          activeOrganizationId: "org_secondary"
        }
      },
      organizations: [
        {
          id: "org_primary",
          name: "Primary Workspace",
          primaryCountryCode: "RO",
          billingStatus: "none",
          membershipStatus: "active",
          roleKeys: ["owner"],
          isActive: false
        },
        {
          id: "org_secondary",
          name: "Selected Workspace",
          primaryCountryCode: "DE",
          billingStatus: "api",
          membershipStatus: "active",
          roleKeys: ["auditor"],
          isActive: true
        }
      ]
    });

    expect(html).toContain('data-ui-smoke="workspace-selection"');
    expect(html).toContain("Workspace User");
    expect(html).toContain("Primary Workspace");
    expect(html).toContain("Selected Workspace");
    expect(html).toContain('action="/workspaces/select"');
    expect(html).toContain('name="organizationId" value="org_secondary"');
    expect(html).toContain("Open active workspace");
    expect(html).toContain('data-ui-action="back-to-dashboard"');
    expect(html).not.toContain("sessionToken");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
  });

  it("can render the console from an API session and dashboard snapshot contract", () => {
    const demo = createOperationalConsoleDemoModel();
    const html = renderOperationalConsole(
      createOperationalConsoleRuntimeModel({
        session: {
          user: {
            id: "user_runtime",
            email: "runtime@example.test",
            displayName: "Runtime User"
          },
          session: {
            activeOrganizationId: "org_runtime"
          }
        },
        dashboard: {
          ...demo.dashboard,
          widgets: [
            {
              key: "widget_api_runtime",
              title: "API dashboard snapshot",
              value: "ready",
              severity: "low",
              sourceQuery: "GET /organizations/:orgId/dashboards/snapshots/latest"
            }
          ]
        }
      })
    );

    expect(html).toContain("Runtime User");
    expect(html).toContain("API dashboard snapshot");
    expect(html).toContain("GET /organizations/:orgId/dashboards/snapshots/latest");
    expect(html).toContain('data-ui-action="open-workspace-selector"');
    expect(html).toContain("stored_analysis");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
  });

  it("can resolve demo-safe Romanian product copy without translating legal caveats", () => {
    const html = renderOperationalConsole(createOperationalConsoleDemoModel(), {
      locale: "ro-RO"
    });
    const login = renderLoginScreen({
      locale: "ro-RO"
    });

    expect(html).toContain('<html lang="ro">');
    expect(html).toContain("Tablou de bord");
    expect(html).toContain("Dovezi si rapoarte");
    expect(html).toContain("Coada de aprobari");
    expect(html).toContain('href="/onboarding/romania?locale=ro-RO"');
    expect(html).toContain(PURESOC_LEGAL_CAVEAT);
    expect(login).toContain('<html lang="ro">');
    expect(login).toContain("Autentificare");
    expect(login).toContain("Sesiune API");
    expect(login).toContain('<label for="password">Parola</label>');
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
  });

  it("renders the Romania onboarding route from country-pack contracts with fallback and no-submission metadata", () => {
    const model = createRomaniaOnboardingRouteModel({
      locale: "ro-RO"
    });
    const html = renderRomaniaOnboardingRoute(model);

    expect(html).toContain('data-ui-smoke="romania-onboarding-route"');
    expect(html).toContain('<html lang="ro">');
    expect(html).toContain("@media (max-width: 980px)");
    expect(html).toContain("@media (max-width: 640px)");
    expect(html).toContain(":focus-visible");
    expect(html).toContain('href="#content"');
    expect(html).toContain('data-ui-action="skip-to-content"');
    expect(html).toContain('id="content" tabindex="-1"');
    expect(html).toContain("Romania NIS2 Onboarding");
    expect(html).toContain("roNis2OnboardingSchema");
    expect(html).toContain("ro-nis2-entity_fields-entity_field_12_name_of_the_entity");
    expect(html).toContain("Entity assessment!D66:D142");
    expect(html).toContain("missing_translation");
    expect(html).toContain("requested ro-RO");
    expect(html).toContain(PURESOC_LEGAL_CAVEAT);
    expect(html).toContain("not a legal opinion");
    expect(html).toContain("Direct DNSC submission");
    expect(html).toContain("Not performed by PureSOC");
    expect(html).toContain("Submitted to DNSC");
    expect(html).toContain("false");
    expect(html).toContain("PureSOC does not submit this draft to DNSC.");
    expect(html).toContain('id="romania-source-map"');
    expect(html).toContain('id="romania-unsupported"');
    expect(html).toContain('id="romania-draft"');
    expect(html).toContain('<a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a>');
    expect(html).toContain("not a full React or Next.js onboarding wizard");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
    expect(html).not.toContain("Submitted to DNSC true");
  });

  it("serves GET /onboarding/romania without requiring live API or external integrations", async () => {
    const server = startWebServer(0, {
      apiBaseUrl: "http://127.0.0.1:1",
      publicBaseUrl: "http://127.0.0.1"
    });
    await once(server, "listening");
    const address = server.address() as AddressInfo;

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/onboarding/romania?locale=ro-RO`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain("Romania NIS2 Onboarding");
      expect(html).toContain("missing_translation");
      expect(html).toContain("no DNSC submission");
      expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
