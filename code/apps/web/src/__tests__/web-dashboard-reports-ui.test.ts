import { describe, expect, it } from "vitest";

import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";

import {
  createOperationalConsoleDemoModel,
  createOperationalConsoleRuntimeModel,
  renderLoginScreen,
  renderOperationalConsole
} from "../index";

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
    expect(html).toContain('id="content" tabindex="-1"');
    expect(html).toContain('aria-label="Primary navigation"');
    expect(login).toContain('<label for="email">Email</label>');
    expect(login).toContain('<label for="password">Password</label>');
    expect(login).toContain('autocomplete="current-password"');
    expect(login).toContain('type="submit"');

    const buttonLabels = [...html.matchAll(/<button[^>]*>\s*(?:<span[^>]*>[^<]*<\/span>)?<span>([^<]+)<\/span>/g)].map(
      (match) => match[1] ?? ""
    );
    expect(buttonLabels.every((label) => label.length <= 32)).toBe(true);
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
    expect(html).toContain("stored_analysis");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
  });
});
