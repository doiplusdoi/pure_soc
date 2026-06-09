import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";

import {
  createOperationalConsoleDemoModel,
  createOperationalConsoleRuntimeModel,
  createRomaniaOnboardingRouteModel,
  renderEmailVerificationScreen,
  renderLoginScreen,
  renderOrganizationInvitationsScreen,
  renderOperationalConsole,
  renderRegisterScreen,
  renderRomaniaOnboardingRoute,
  renderWorkspaceSelectionScreen
} from "../index";
import { resolvePublicRequestOrigin } from "../server";

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
    expect(html).toContain("Romania NIS2 registration workflow");
    expect(html).toContain("Internal readiness report");
    expect(html).toContain("Microsoft 365 provider disabled");
    expect(html).toContain("Basic Romania/local readiness does not require Microsoft 365 setup.");
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
    expect(html).toContain('href="#dashboard" aria-current="page" data-ui-action="open-dashboard-anchor"');
    expect(html).toContain('href="#onboarding" data-ui-action="open-onboarding-anchor"');
    expect(html).toContain('href="#microsoft365" data-ui-action="open-microsoft365-anchor"');
    expect(html).toContain('href="#gaps" data-ui-action="open-gaps-anchor"');
    expect(html).toContain('href="#evidence" data-ui-action="open-evidence-reports-anchor"');
    expect(html).toContain('href="#approvals" data-ui-action="open-approval-queue-anchor"');
    expect(html).toContain('id="dashboard" data-ui-section="dashboard"');
    expect(html).toContain('id="onboarding" data-ui-section="onboarding"');
    expect(html).toContain('id="microsoft365" data-ui-section="microsoft365"');
    expect(html).toContain('id="gaps" data-ui-section="gaps"');
    expect(html).toContain('id="evidence" data-ui-section="evidence"');
    expect(html).toContain('id="approvals" data-ui-section="approvals"');
    expect(html).toContain('data-ui-action="open-romania-onboarding"');
    expect(login).toContain('<label for="email">Email</label>');
    expect(login).toContain('data-ui-smoke="login-screen"');
    expect(login).toContain('<label for="password">Password</label>');
    expect(login).toContain('autocomplete="current-password"');
    expect(login).toContain('type="submit"');
    expect(renderRegisterScreen()).toContain('minlength="12"');

    const buttonLabels = [...html.matchAll(/<button[^>]*>\s*(?:<span[^>]*>[^<]*<\/span>)?<span>([^<]+)<\/span>/g)].map(
      (match) => match[1] ?? ""
    );
    expect(buttonLabels.every((label) => label.length <= 32)).toBe(true);
  });

  it("wires browser screenshot visual threshold manifest coverage without golden image baselines", () => {
    const smokeScript = readFileSync(new URL("../../../../scripts/run-ui-smoke.mjs", import.meta.url), "utf8");

    expect(smokeScript).toContain('const VISUAL_METRICS_SCHEMA = "puresoc.ui_smoke.visual_metrics.v1"');
    expect(smokeScript).toContain('"visual-metrics-manifest.json"');
    expect(smokeScript).toContain("EXPECTED_BROWSER_VISUAL_CAPTURE_COUNT = 10");
    expect(smokeScript).toContain("createVisualMetrics");
    expect(smokeScript).toContain("assertVisualThresholds");
    expect(smokeScript).toContain("edgeRatio");
    expect(smokeScript).toContain("dominantColorRatio");
    expect(smokeScript).toContain("route_id");
    expect(smokeScript).toContain("dashboard-desktop");
    expect(smokeScript).toContain("dashboard-mobile");
    expect(smokeScript).toContain("login-mobile");
    expect(smokeScript).toContain("onboarding-section-desktop");
    expect(smokeScript).toContain("microsoft365-section-desktop");
    expect(smokeScript).toContain("gaps-section-desktop");
    expect(smokeScript).toContain("evidence-desktop");
    expect(smokeScript).toContain("approvals-desktop");
    expect(smokeScript).toContain("romania-route-desktop");
    expect(smokeScript).toContain("romania-route-mobile");
    expect(smokeScript).not.toContain("golden-image");
  });

  it("wires browser operational-console section anchor workflow coverage", () => {
    const smokeScript = readFileSync(new URL("../../../../scripts/run-ui-smoke.mjs", import.meta.url), "utf8");

    expect(smokeScript).toContain("OPERATIONAL_CONSOLE_ANCHORS");
    expect(smokeScript).toContain("assertBrowserOperationalConsoleAnchorKeyboardNavigation");
    expect(smokeScript).toContain("assertBrowserOperationalConsoleAnchorPointerNavigation");
    expect(smokeScript).toContain("open-dashboard-anchor");
    expect(smokeScript).toContain("open-onboarding-anchor");
    expect(smokeScript).toContain("open-microsoft365-anchor");
    expect(smokeScript).toContain("open-gaps-anchor");
    expect(smokeScript).toContain("open-evidence-reports-anchor");
    expect(smokeScript).toContain("open-approval-queue-anchor");
    expect(smokeScript).toContain("section_enters_view");
    expect(smokeScript).toContain("click_used_visible_control_without_script_scroll");
    expect(smokeScript).toContain("anchorNavigation");
  });

  it("wires anchor-driven browser section screenshot metadata without direct section scroll captures", () => {
    const smokeScript = readFileSync(new URL("../../../../scripts/run-ui-smoke.mjs", import.meta.url), "utf8");

    expect(smokeScript).toContain('const ANCHOR_SECTION_CAPTURE_SCHEMA = "puresoc.ui_smoke.anchor_section_capture.v1"');
    expect(smokeScript).toContain("activateOperationalConsoleSectionForScreenshot");
    expect(smokeScript).toContain("anchorActivation: operationalConsoleAnchorById(\"dashboard\")");
    expect(smokeScript).toContain("anchorActivation: operationalConsoleAnchorById(\"onboarding\")");
    expect(smokeScript).toContain("anchorActivation: operationalConsoleAnchorById(\"microsoft365\")");
    expect(smokeScript).toContain("anchorActivation: operationalConsoleAnchorById(\"gaps\")");
    expect(smokeScript).toContain("anchorActivation: operationalConsoleAnchorById(\"evidence\")");
    expect(smokeScript).toContain("anchorActivation: operationalConsoleAnchorById(\"approvals\")");
    expect(smokeScript).toContain("browser_section_screenshot_");
    expect(smokeScript).toContain("metadata_records_anchor_action");
    expect(smokeScript).toContain("metadata_records_section_title");
    expect(smokeScript).toContain("metadata_records_readable_text");
    expect(smokeScript).toContain("metadata_secret_free");
    expect(smokeScript).toContain("expectedTextMatched");
    expect(smokeScript).not.toContain('scrollTarget: "#evidence"');
    expect(smokeScript).not.toContain('scrollTarget: "#approvals"');
  });

  it("wires a secret-free browser smoke artifact index beside the visual metrics manifest", () => {
    const smokeScript = readFileSync(new URL("../../../../scripts/run-ui-smoke.mjs", import.meta.url), "utf8");

    expect(smokeScript).toContain('const BROWSER_SMOKE_ARTIFACT_INDEX_SCHEMA = "puresoc.ui_smoke.browser_artifact_index.v1"');
    expect(smokeScript).toContain('const BROWSER_SMOKE_ARTIFACT_INDEX_FILE = "browser-smoke-artifact-index.json"');
    expect(smokeScript).toContain("writeBrowserSmokeArtifactIndex");
    expect(smokeScript).toContain("formatBrowserArtifactIndexScreenshot");
    expect(smokeScript).toContain("m67AnchorDrivenSectionCaptures");
    expect(smokeScript).toContain("m66AnchorWorkflows");
    expect(smokeScript).toContain("routeTraversal");
    expect(smokeScript).toContain("sanitizeBrowserAuthSummary");
    expect(smokeScript).toContain("secretFreePolicy");
    expect(smokeScript).toContain("isBrowserArtifactIndexSecretFree");
    expect(smokeScript).toContain("browser_smoke_artifact_index_secret_free");
    expect(smokeScript).toContain("browser_smoke_artifact_index_written");
    expect(smokeScript).toContain("session cookies");
    expect(smokeScript).toContain("full user emails");
    expect(smokeScript).not.toContain("browser-smoke-golden");
  });

  it("wires a secret-free served UI smoke artifact index beside the HTML snapshots", () => {
    const smokeScript = readFileSync(new URL("../../../../scripts/run-ui-smoke.mjs", import.meta.url), "utf8");

    expect(smokeScript).toContain('const UI_SMOKE_ARTIFACT_INDEX_SCHEMA = "puresoc.ui_smoke.served_artifact_index.v1"');
    expect(smokeScript).toContain('const UI_SMOKE_ARTIFACT_INDEX_FILE = "ui-smoke-artifact-index.json"');
    expect(smokeScript).toContain("EXPECTED_UI_HTML_SNAPSHOT_COUNT = 6");
    expect(smokeScript).toContain("writeServedUiSmokeArtifactIndex");
    expect(smokeScript).toContain("formatServedUiSnapshotSummary");
    expect(smokeScript).toContain("sanitizeServedUiAuthChecks");
    expect(smokeScript).toContain("apiBackedDashboard");
    expect(smokeScript).toContain("workspaceSelectionSnapshots");
    expect(smokeScript).toContain("romaniaRouteSnapshots");
    expect(smokeScript).toContain("authCookieOriginChecks");
    expect(smokeScript).toContain("local port-bearing endpoint URLs");
    expect(smokeScript).toContain("isServedUiArtifactIndexSecretFree");
    expect(smokeScript).toContain("ui_smoke_artifact_index_secret_free");
    expect(smokeScript).toContain("ui_smoke_artifact_index_written");
    expect(smokeScript).not.toContain("ui-smoke-golden");
  });

  it("renders browser-traversable route anchors for keyboard and pointer smoke", () => {
    const dashboardHtml = renderOperationalConsole(createOperationalConsoleDemoModel());
    const romaniaHtml = renderRomaniaOnboardingRoute(createSavedRomaniaRouteModel());

    expect(dashboardHtml).toContain(
      '<a class="ps-nav__link" href="/onboarding/romania?locale=ro-RO" data-ui-action="open-romania-onboarding">'
    );
    expect(dashboardHtml).toContain('<a class="ps-command" href="/workspaces" data-ui-action="open-workspace-selector">Switch workspace</a>');
    expect(dashboardHtml).toContain('<a class="ps-command" href="/invitations" data-ui-action="open-organization-invitations">Invite members</a>');
    expect(dashboardHtml).toContain('action="/auth/logout"');
    expect(dashboardHtml).toContain('data-ui-action="sign-out"');
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
    expect(html).toContain('action="/organizations"');
    expect(html).toContain('data-ui-action="create-local-workspace"');
    expect(html).toContain('pattern="[A-Za-z]{2}"');
    expect(html).toContain('name="organizationId" value="org_secondary"');
    expect(html).toContain("Open active workspace");
    expect(html).toContain('data-ui-action="back-to-dashboard"');
    expect(html).not.toContain("sessionToken");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
  });

  it("renders owner-managed invitation creation and acceptance screens without token echo", () => {
    const html = renderOrganizationInvitationsScreen({
      acceptOrganizationId: "org_invitation",
      actionMessage: "Invitation created. Delivery remains configured outside the served web runtime.",
      activeOrganization: {
        id: "org_invitation",
        name: "Invitation Workspace",
        primaryCountryCode: "RO",
        billingStatus: "none",
        membershipStatus: "active",
        roleKeys: ["owner"],
        isActive: true
      },
      canCreateInvitations: true,
      organizations: [
        {
          id: "org_invitation",
          name: "Invitation Workspace",
          primaryCountryCode: "RO",
          billingStatus: "none",
          membershipStatus: "active",
          roleKeys: ["owner"],
          isActive: true
        }
      ],
      roleKeys: ["owner"],
      roleOptions: [
        {
          key: "auditor",
          label: "Auditor",
          summary: "Can review readiness data."
        },
        {
          key: "org_admin",
          label: "Organization admin",
          summary: "Can invite additional members."
        }
      ],
      session: {
        user: {
          id: "user_invitation",
          email: "inviter@example.test",
          displayName: "Invitation Owner"
        },
        session: {
          activeOrganizationId: "org_invitation"
        }
      }
    });

    expect(html).toContain('data-ui-smoke="organization-invitations"');
    expect(html).toContain('action="/invitations"');
    expect(html).toContain('data-ui-action="create-organization-invitation"');
    expect(html).toContain('name="roleKey"');
    expect(html).toContain('value="auditor"');
    expect(html).toContain('value="org_admin"');
    expect(html).toContain("The invited user must accept with this verified account email.");
    expect(html).toContain("Real invitation email delivery is still deferred.");
    expect(html).toContain('action="/invitations/accept"');
    expect(html).toContain('data-ui-action="accept-organization-invitation"');
    expect(html).toContain('autocomplete="one-time-code"');
    expect(html).toContain("The token is submitted to the API and is not echoed back into this page.");
    expect(html).toContain('value="org_invitation"');
    expect(html).toContain("owner");
    expect(html).toContain("Invitation Workspace");
    expect(html).toContain("signed-in account");
    expect(html).not.toContain("plaintextToken");
    expect(html).not.toContain("tokenHash");
    expect(html).not.toContain("secret-invitation-token");
    expect(html).not.toContain("inviter@example.test");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
  });

  it("disables invitation creation for non-admin workspace members while keeping acceptance available", () => {
    const html = renderOrganizationInvitationsScreen({
      activeOrganization: {
        id: "org_audit",
        name: "Audit Workspace",
        primaryCountryCode: "RO",
        billingStatus: "none",
        membershipStatus: "active",
        roleKeys: ["auditor"],
        isActive: true
      },
      canCreateInvitations: false,
      organizations: [],
      roleKeys: ["auditor"],
      roleOptions: [
        {
          key: "auditor",
          label: "Auditor",
          summary: "Can review readiness data."
        }
      ],
      session: {
        user: {
          id: "user_auditor",
          email: "auditor@example.test",
          displayName: "Audit User"
        },
        session: {
          activeOrganizationId: "org_audit"
        }
      }
    });

    expect(html).toContain("owner or admin required");
    expect(html).toContain('id="inviteEmail" name="email" type="email" autocomplete="email" required disabled');
    expect(html).toContain('<select id="inviteRoleKey" name="roleKey" disabled>');
    expect(html).toContain('data-ui-action="accept-organization-invitation"');
    expect(html).not.toContain("auditor@example.test");
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
    const register = renderRegisterScreen({
      locale: "ro-RO"
    });
    const verification = renderEmailVerificationScreen({
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
    expect(login).toContain('href="/register"');
    expect(register).toContain('data-ui-smoke="register-screen"');
    expect(register).toContain('action="/auth/register"');
    expect(register).toContain("verify the email address");
    expect(register).toContain('minlength="12"');
    expect(verification).toContain('data-ui-smoke="email-verification-screen"');
    expect(verification).toContain('action="/auth/email/verify"');
    expect(verification).toContain('autocomplete="one-time-code"');
    expect(verification).toContain("not echoed back into this page");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
  });

  it("derives public request origin from proxy headers for API origin checks", () => {
    expect(resolvePublicRequestOrigin({ headers: { host: "internal:3000" } }, 3000)).toBe("http://internal:3000");
    expect(
      resolvePublicRequestOrigin(
        {
          headers: {
            host: "internal:3000",
            "x-forwarded-host": "app.example.test",
            "x-forwarded-proto": "https"
          }
        },
        3000
      )
    ).toBe("https://app.example.test");
    expect(
      resolvePublicRequestOrigin(
        {
          headers: {
            forwarded: 'proto=https;host="puresoc.example.test"',
            host: "internal:3000"
          }
        },
        3000
      )
    ).toBe("https://puresoc.example.test");
  });

  it("renders the Romania onboarding route from country-pack contracts with fallback and no-submission metadata", () => {
    const model = createSavedRomaniaRouteModel();
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
    expect(html).toContain("Guided Workflow");
    expect(html).toContain('data-ui-action="save-romania-onboarding"');
    expect(html).toContain('data-ui-action="run-romania-classification"');
    expect(html).toContain('data-ui-action="generate-romania-notification-draft"');
    expect(html).toContain('data-ui-action="evaluate-romania-readiness"');
    expect(html).toContain('data-ui-action="upload-local-evidence"');
    expect(html).toContain("Services by sector and subsector");
    expect(html).toContain('data-ui-action="search-romania-services"');
    expect(html).toContain("Cloud computing service providers");
    expect(html).toContain("None of the services listed in OUG No. 155/2024");
    expect(html).toContain("Romanian legal copy pending");
    expect(html).toContain(PURESOC_LEGAL_CAVEAT);
    expect(html).toContain("not a legal opinion");
    expect(html).toContain("Direct DNSC submission");
    expect(html).toContain("Not performed by PureSOC");
    expect(html).toContain("PureSOC does not submit this draft to DNSC.");
    expect(html).toContain('id="romania-boundaries"');
    expect(html).toContain('id="romania-outputs"');
    expect(html).toContain('<a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a>');
    expect(html).toContain("API-backed by saved organization data");
    expect(html).toContain("Billing");
    expect(html).toContain("Audit");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
    expect(html).not.toMatch(/Excel|workbook|source map|raw trace|roNis2OnboardingSchema|Notification form!|Entity assessment!/i);
    expect(html).not.toContain("Submitted to DNSC true");
  });

  it("renders an empty Romania workflow state without fabricated customer answers", () => {
    const html = renderRomaniaOnboardingRoute(
      createRomaniaOnboardingRouteModel({
        locale: "ro-RO"
      })
    );

    expect(html).toContain("empty state");
    expect(html).toContain("No saved Romania onboarding progress exists yet for this workspace.");
    expect(html).toContain('value=""');
    expect(html).not.toContain("Example Manufacturing SRL");
    expect(html).not.toContain("security@example.test");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
  });
});

const createSavedRomaniaRouteModel = () =>
  createRomaniaOnboardingRouteModel({
    auditCheckpointCount: 1,
    billingEntitlementCount: 4,
    billingProviderKey: "none",
    classificationRun: {
      id: "classification_m78_saved",
      article9Required: false,
      matchedRules: ["classification_rule_8"],
      missingRequiredFields: [],
      notificationRecommended: true,
      reasons: ["Cloud service provider matched the Romania workbook rule."],
      result: "important_entity",
      sourceMapLinks: [
        {
          sourceMapId:
            "ro-nis2-classification_rules-classification_rule_8_furnizorii_de_servicii_de_cloud_computing_furnizorii_de_servicii_de_centre_de_date_furnizorii_de_retele_de_furnizare_de_continut_furnizorii_de_servicii_gestionate"
        }
      ],
      sourceVersion: "Entity data V2.1 ENG_45915; Entity assessment V2.0_45898"
    },
    dashboard: createOperationalConsoleDemoModel().dashboard,
    evidenceArtifacts: [
      {
        sourceType: "manual_upload",
        title: "Risk policy note"
      },
      {
        sourceType: "generated_report",
        title: "Internal readiness JSON export"
      }
    ],
    latestNotificationDraft: {
      id: "notification_draft_m78_saved"
    },
    locale: "ro-RO",
    progress: {
      id: "progress_m78_saved",
      assessmentId: "assessment_m78_saved",
      answers: {
        activity: {
          mainNaceCode: "6201"
        },
        address: {
          city: "Bucuresti",
          country: "Romania",
          county: "Bucuresti",
          street: "Strada Exemplu"
        },
        contact: {
          email: "security@m78.example.test",
          mobilePhone: "+40740000001",
          phone: "+40210000001",
          websiteUrl: "https://m78.example.test"
        },
        cybersecurityResponsible: {
          email: "security-lead@m78.example.test",
          name: "Security Lead",
          phone: "+40740000002",
          role: "CISO"
        },
        entity: {
          cui: "RO12345678",
          legalName: "M78 Saved SRL",
          nationalRegistrationNumber: "J40/1234/2026"
        },
        legalRepresentative: {
          email: "legal@m78.example.test",
          name: "Legal Representative",
          phone: "+40740000004",
          role: "Administrator"
        },
        network: {
          publicIpRanges: ["203.0.113.0/28"],
          systemsDescription: "Local identity, collaboration, and production support systems."
        },
        permanentMonitoringContact: {
          email: "monitoring@m78.example.test",
          name: "Monitoring Contact",
          phone: "+40740000003",
          role: "SOC duty contact"
        },
        relationship: {
          criticalEntityInRomaniaLaw294: false,
          establishedInRomania: true,
          mainOfficeInRomania: true,
          providesServicesInAnotherEuMemberState: false,
          providesServicesInRomania: true,
          publicAdministrationEstablishedByRomania: false
        },
        selectedServiceTypeCodes: ["108004"],
        size: {
          employeeCount: 85,
          sizeCategory: "medium"
        }
      },
      completedSteps: [
        "organization_identity",
        "entity_address_contact",
        "activity_nace",
        "entity_size",
        "services",
        "relationship_with_romania",
        "network_system_data",
        "law294"
      ],
      currentStep: "cybersecurity_responsible",
      missingRequiredFields: [],
      savedAt: "2026-05-04T08:00:00.000Z",
      sourceMapLinks: [
        {
          sourceMapId: "ro-nis2-entity_fields-entity_field_12_name_of_the_entity",
          sourceReferences: [{ cell: "D12", sheet: "Entity data" }],
          targetCollection: "entity_fields",
          targetKey: "entity_field_12_name_of_the_entity",
          workbookRange: "Entity data!D12"
        },
        {
          sourceMapId: "ro-nis2-service_options-none_of_oug_155_2024_services",
          sourceReferences: [{ range: "D66:D142", sheet: "Entity assessment" }],
          targetCollection: "service_options",
          targetKey: "selected_service_type_codes",
          workbookRange: "Entity assessment!D66:D142"
        }
      ],
      sourceVersion: "Entity data V2.1 ENG_45915; Entity assessment V2.0_45898",
      status: "ready_for_classification"
    }
  });
