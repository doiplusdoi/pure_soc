import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";

import {
  createOperationalConsoleDemoModel,
  createOperationalConsoleRuntimeModel,
  createRomaniaOnboardingRouteModel,
  renderEmailVerificationScreen,
  renderLoginScreen,
  renderMicrosoft365ConnectorPage,
  renderNis2CountryAwareOnboardingScreen,
  renderNotificationSettingsScreen,
  renderOrganizationInvitationsScreen,
  renderPartnerConsoleScreen,
  renderOperationalConsole,
  renderRegisterScreen,
  renderRomaniaOnboardingRoute,
  renderWorkspaceSelectionScreen
} from "../index";
import {
  registrationErrorMessageForApiResponse,
  resolveApiRequestOrigin,
  resolvePublicRequestOrigin,
  shouldForwardBrowserOriginToApi
} from "../server";

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
    expect(html).toContain("No Microsoft 365 provider connected");
    expect(html).toContain("Upload scan gate");
    expect(html).toContain("ClamAV");
    expect(html).toContain("FreshClam signatures");
    expect(html).toContain("Start Microsoft Entra admin consent from the workspace connector before Microsoft Graph reads can run.");
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
    expect(html).toContain('data-ui-action="connect-microsoft365-tenant"');
    expect(html).toContain('action="/providers/microsoft365/connect"');
    expect(html).toContain("Write actions disabled");
    expect(html).toContain("Consent model");
    expect(html).toContain("Microsoft 365 admin consent model");
    expect(html).toContain("customer tenants do not create one");
    expect(html).toContain("tenant ID, consent metadata, permission bundles, and encrypted token metadata per workspace");
    expect(html).not.toContain("PURESOC_CONNECTOR_MICROSOFT365_CLIENT_ID");
    expect(html).not.toContain("PURESOC_CONNECTOR_MICROSOFT365_CLIENT_SECRET");
    expect(html).not.toContain("PURESOC_CONNECTOR_MICROSOFT365_REDIRECT_URI");
    expect(html).toContain('data-ui-action="open-romania-onboarding"');
    expect(login).toContain('<label for="email">Email</label>');
    expect(login).toContain('data-ui-smoke="login-screen"');
    expect(login).toContain('<label for="password">Password</label>');
    expect(login).toContain('autocomplete="current-password"');
    expect(login).toContain('type="submit"');
    expect(login).toContain('action="/auth/oidc/microsoft_entra/begin"');
    expect(login).toContain('data-ui-action="microsoft-entra-signin"');
    expect(login).toContain("Sign in with Microsoft");
    expect(renderRegisterScreen()).toContain('minlength="12"');
    expect(renderRegisterScreen()).toContain("Continue with Microsoft");
    expect(renderLoginScreen({ microsoftEntraEnabled: false })).not.toContain("Sign in with Microsoft");
    expect(renderRegisterScreen({ microsoftEntraEnabled: false })).not.toContain("Continue with Microsoft");

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
      '<a class="ps-nav__link" href="/onboarding/romania/company?locale=ro-RO" data-ui-action="open-romania-onboarding">'
    );
    expect(dashboardHtml).toContain('<a class="ps-command" href="/workspaces" data-ui-action="open-workspace-selector">Switch workspace</a>');
    expect(dashboardHtml).toContain('<a class="ps-command" href="/invitations" data-ui-action="open-organization-invitations">Invite members</a>');
    expect(dashboardHtml).toContain('<a class="ps-command" href="/settings/notifications" data-ui-action="open-notification-settings">Notifications</a>');
    expect(dashboardHtml).toContain('action="/auth/logout"');
    expect(dashboardHtml).toContain('data-ui-action="sign-out"');
    expect(dashboardHtml).not.toContain('onclick="');
    expect(romaniaHtml).toContain('<a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a>');
    expect(romaniaHtml).not.toContain('onclick="');
  });

  it("renders notification settings with channel management and secret-safe webhook previews", () => {
    const html = renderNotificationSettingsScreen({
      activeOrganization: {
        id: "org_notifications",
        name: "Notifications Org",
        primaryCountryCode: "RO",
        billingStatus: "none",
        membershipStatus: "active",
        roleKeys: ["owner"],
        isActive: true
      },
      canManageChannels: true,
      channels: [
        {
          id: "channel_email",
          type: "email",
          destination: "alerts@example.test",
          destinationPreview: "alerts@example.test",
          enabled: true,
          createdAt: "2026-06-14T09:00:00.000Z"
        },
        {
          id: "channel_slack",
          type: "slack_webhook",
          destinationPreview: "https://hooks.slack.test/services...",
          enabled: true,
          createdAt: "2026-06-14T09:00:00.000Z"
        }
      ],
      logs: [
        {
          id: "log_1",
          channelId: "channel_email",
          eventType: "TEST_NOTIFICATION",
          payloadHash: "abc123",
          sentAt: "2026-06-14T09:00:00.000Z",
          status: "sent"
        }
      ],
      roleKeys: ["owner"],
      session: {
        user: {
          id: "user_notifications",
          email: "owner@example.test"
        },
        session: {
          activeOrganizationId: "org_notifications"
        }
      }
    });

    expect(html).toContain('data-ui-smoke="notification-settings"');
    expect(html).toContain('action="/settings/notifications/channels"');
    expect(html).toContain('data-ui-action="create-notification-channel"');
    expect(html).toContain('data-ui-action="test-notification-channel"');
    expect(html).toContain('data-ui-action="delete-notification-channel"');
    expect(html).toContain("critical gaps");
    expect(html).toContain("TEST_NOTIFICATION");
    expect(html).toContain("alerts@example.test");
    expect(html).toContain("https://hooks.slack.test/services...");
    expect(html).not.toContain("sensitive-secret");
  });

  it("renders Microsoft 365 tenant connector as a standalone workspace page", () => {
    const html = renderMicrosoft365ConnectorPage({
      activeOrganizationName: "Contoso Workspace",
      actionMessage: "Workspace selected.",
      microsoft365: createOperationalConsoleDemoModel().microsoft365
    });

    expect(html).toContain('data-ui-smoke="microsoft365-connector-page"');
    expect(html).toContain("Microsoft 365 Tenant Connector");
    expect(html).toContain("Start global admin approval");
    expect(html).toContain("No customer-created Azure app registration is required.");
    expect(html).toContain("m365_read_baseline");
    expect(html).toContain("m365_security_read");
    expect(html).toContain("m365_intune_read");
    expect(html).toContain("no write scopes");
    expect(html).toContain('action="/providers/microsoft365/connect"');
    expect(html).toContain('href="/onboarding/romania/company?locale=ro-RO"');
    expect(html).not.toMatch(/PURESOC_CONNECTOR_MICROSOFT365_CLIENT_(ID|SECRET)|migrate reset|db push --force-reset/i);
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

  it("renders partner portfolio with add-customer, reason-gated customer entry, and active customer banner", () => {
    const html = renderPartnerConsoleScreen({
      activePartnerId: "partner_asterion",
      actionMessage: "Customer session started. Actions are logged with your real user.",
      activeTenantAccess: {
        partnerId: "partner_asterion",
        partnerName: "Asterion Cloud Partners",
        customerName: "NordFrucht GmbH",
        grantLevel: "admin",
        session: {
          id: "tenant_session_1",
          realActorUserId: "user_partner_owner",
          partnerId: "partner_asterion",
          effectiveOrganizationId: "org_nordfrucht",
          reason: "Prepare customer NIS2 readiness review",
          status: "active",
          startedAt: "2026-06-19T09:00:00.000Z",
          expiresAt: "2026-06-19T10:00:00.000Z",
          endedAt: null,
          endReason: null
        }
      },
      currentTenantSession: {
        id: "tenant_session_1",
        realActorUserId: "user_partner_owner",
        partnerId: "partner_asterion",
        effectiveOrganizationId: "org_nordfrucht",
        reason: "Prepare customer NIS2 readiness review",
        status: "active",
        startedAt: "2026-06-19T09:00:00.000Z",
        expiresAt: "2026-06-19T10:00:00.000Z",
        endedAt: null,
        endReason: null
      },
      partners: [
        {
          partner: {
            id: "partner_asterion",
            name: "Asterion Cloud Partners",
            slug: "asterion-cloud",
            status: "active",
            parentPartnerId: null
          },
          membership: {
            id: "partner_member_owner",
            partnerId: "partner_asterion",
            role: "owner",
            status: "active"
          }
        }
      ],
      metrics: {
        totalCustomerTenants: 1,
        completedAssessments: 1,
        customersLikelyOrPossiblyInScope: 1,
        connectedMicrosoftTenants: 1,
        highPriorityGaps: 2,
        opportunities: 1
      },
      opportunities: [
        {
          customerId: "org_nordfrucht",
          customerName: "NordFrucht GmbH",
          opportunityType: "microsoft_security_capability_evaluation",
          priority: "high",
          relevantMicrosoftCapabilityOrPlan: "Microsoft 365 Business Premium",
          affectedUsers: 72,
          nis2Areas: ["nis2.identity-access"],
          evidenceSource: "Microsoft 365 subscription context and NIS2 readiness gaps",
          nextAction: "Add supplier continuity and endpoint coverage review to the readiness plan"
        }
      ],
      portfolio: [
        {
          grant: {
            id: "grant_nordfrucht",
            organizationId: "org_nordfrucht",
            grantLevel: "admin",
            status: "active",
            createdAt: "2026-06-19T09:00:00.000Z",
            updatedAt: "2026-06-19T09:00:00.000Z"
          },
          organization: {
            id: "org_nordfrucht",
            name: "NordFrucht GmbH",
            legalName: "NordFrucht GmbH",
            primaryCountryCode: "DE",
            billingStatus: "none"
          },
          snapshot: {
            assessmentId: "assessment_nordfrucht",
            assessmentCompleted: true,
            sector: "food distributor",
            likelyClassification: "likely in scope",
            readinessPercent: 50,
            evidenceConfidencePercent: 60,
            microsoftConnectionState: "connected",
            highPriorityGapCount: 2,
            topRecommendationOrOpportunity: "Add supplier continuity and endpoint coverage review to the readiness plan",
            lastAssessmentOrSyncAt: "2026-06-19T09:30:00.000Z",
            opportunities: []
          }
        }
      ],
      session: {
        user: {
          id: "user_partner_owner",
          email: "partner-owner@example.test",
          displayName: "Partner Owner"
        },
        session: {
          activeOrganizationId: null
        }
      }
    });

    expect(html).toContain('data-ui-smoke="partner-console"');
    expect(html).toContain("Partner portfolio");
    expect(html).toContain("Asterion Cloud Partners");
    expect(html).toContain("NordFrucht GmbH");
    expect(html).toContain("Assessments done");
    expect(html).toContain("Likely in scope");
    expect(html).toContain("Microsoft 365 Business Premium");
    expect(html).toContain("72");
    expect(html).toContain("nis2.identity-access");
    expect(html).toContain("Microsoft 365 subscription context and NIS2 readiness gaps");
    expect(html).toContain("Add supplier continuity and endpoint coverage review to the readiness plan");
    expect(html).toContain("food distributor");
    expect(html).toContain("Evidence 60%");
    expect(html).toContain("connected");
    expect(html).toContain("You are accessing NordFrucht GmbH through Asterion Cloud Partners.");
    expect(html).toContain("Actions are logged with your real user");
    expect(html).toContain('data-ui-action="exit-customer-tenant"');
    expect(html).toContain('action="/partners/partner_asterion/tenant-sessions/tenant_session_1/exit"');
    expect(html).toContain('data-ui-action="create-partner-customer"');
    expect(html).toContain('action="/partners/partner_asterion/customers"');
    expect(html).toContain('name="grantLevel"');
    expect(html).toContain("It does not add workspace membership.");
    expect(html).toContain('data-ui-action="enter-customer-tenant"');
    expect(html).toContain('name="reason" type="text" minlength="8"');
    expect(html).toContain('name="organizationId" value="org_nordfrucht"');
    expect(html).toContain("customer session active");
    expect(html).not.toContain("partner-owner@example.test");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
  });

  it("persists the active customer banner across operational routes", () => {
    const activeTenantAccess = {
      partnerId: "partner_asterion",
      partnerName: "Asterion Cloud Partners",
      customerName: "NordFrucht GmbH",
      grantLevel: "admin",
      session: {
        id: "tenant_session_1",
        realActorUserId: "user_partner_owner",
        partnerId: "partner_asterion",
        effectiveOrganizationId: "org_nordfrucht",
        reason: "Prepare customer NIS2 readiness review",
        status: "active",
        startedAt: "2026-06-19T09:00:00.000Z",
        expiresAt: "2026-06-19T10:00:00.000Z",
        endedAt: null,
        endReason: null
      }
    };
    const session = {
      user: {
        id: "user_partner_owner",
        email: "partner-owner@example.test",
        displayName: "Partner Owner"
      },
      session: {
        activeOrganizationId: "org_nordfrucht"
      }
    };
    const demo = createOperationalConsoleDemoModel();
    const organization = {
      id: "org_nordfrucht",
      name: "NordFrucht GmbH",
      primaryCountryCode: "DE",
      billingStatus: "none",
      membershipStatus: "active",
      roleKeys: ["auditor"],
      isActive: true
    };
    const renderedScreens = [
      renderOperationalConsole(
        createOperationalConsoleRuntimeModel({
          activeTenantAccess,
          dashboard: demo.dashboard,
          session
        })
      ),
      renderMicrosoft365ConnectorPage({
        activeTenantAccess,
        activeOrganizationName: "NordFrucht GmbH",
        microsoft365: demo.microsoft365
      }),
      renderWorkspaceSelectionScreen({
        activeTenantAccess,
        organizations: [organization],
        session
      }),
      renderNotificationSettingsScreen({
        activeTenantAccess,
        activeOrganization: organization,
        canManageChannels: false,
        channels: [],
        logs: [],
        roleKeys: ["auditor"],
        session
      }),
      renderOrganizationInvitationsScreen({
        activeTenantAccess,
        activeOrganization: organization,
        canCreateInvitations: false,
        organizations: [organization],
        roleKeys: ["auditor"],
        roleOptions: [],
        session
      }),
      renderRomaniaOnboardingRoute(
        createRomaniaOnboardingRouteModel({
          activeTenantAccess
        })
      )
    ];

    for (const html of renderedScreens) {
      expect(html).toContain("You are accessing NordFrucht GmbH through Asterion Cloud Partners.");
      expect(html).toContain('data-ui-action="exit-customer-tenant"');
      expect(html).toContain('action="/partners/partner_asterion/tenant-sessions/tenant_session_1/exit"');
      expect(html).toContain("Actions are logged with your real user");
    }
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

  it("keeps partner viewers from using the add-customer form while allowing portfolio review", () => {
    const html = renderPartnerConsoleScreen({
      activePartnerId: "partner_viewer",
      partners: [
        {
          partner: {
            id: "partner_viewer",
            name: "Viewer Partner",
            slug: "viewer-partner",
            status: "active",
            parentPartnerId: null
          },
          membership: {
            id: "partner_member_viewer",
            partnerId: "partner_viewer",
            role: "viewer",
            status: "active"
          }
        }
      ],
      portfolio: [],
      session: {
        user: {
          id: "user_viewer",
          email: "viewer@example.test",
          displayName: "Partner Viewer"
        },
        session: {
          activeOrganizationId: null
        }
      }
    });

    expect(html).toContain("viewer is read only");
    expect(html).toContain('id="customerName" name="name" type="text" autocomplete="organization" required disabled');
    expect(html).toContain('<select id="customerGrantLevel" name="grantLevel" disabled>');
    expect(html).toContain("No customer grants exist for this partner.");
    expect(html).not.toContain("viewer@example.test");
  });

  it("renders country-aware NIS2 onboarding with demo country packs and legal-review caveats", () => {
    const html = renderNis2CountryAwareOnboardingScreen({
      activeOrganizationId: "org_country_pack",
      classificationInput: {
        employeeCount: 42,
        sector: "food"
      },
      firstReportId: "11111111-1111-4111-8111-111111111111",
      improvedReportId: "22222222-2222-4222-8222-222222222222",
      classification: {
        result: "possibly_in_scope",
        matchedRules: ["pl-demo-food-or-manufacturing"],
        legalBasisReferences: [
          {
            id: "pl-ksc-amendment-overview-2026",
            title: "KSC amendment overview",
            url: "https://www.gov.pl/web/baza-wiedzy/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa",
            retrievedAt: "2026-06-19",
            trustLevel: "primary"
          }
        ],
        assumptions: ["Pack status is demo.", "Classification language is preliminary and non-binding."],
        missingInformation: [],
        explanation: "Food or manufacturing activity should be reviewed against national rules.",
        confidence: "low",
        legalReviewRequired: true
      },
      countryPacks: [
        buildCountryPackFixture("EU", "EU NIS2 baseline"),
        buildCountryPackFixture("RO", "Romania DNSC NIS2 demo pack"),
        buildCountryPackFixture("PL", "Poland KSC NIS2 demo pack"),
        buildCountryPackFixture("DE", "Germany BSI NIS2 demo pack")
      ],
      onboardingScreens: [
        {
          key: "company_contacts",
          label: "Company and contacts",
          summary: "Legal identity and security contacts.",
          requiredFieldPaths: ["company.legalName"]
        },
        {
          key: "business_profile",
          label: "Business profile",
          summary: "Sector, services, countries served, and approximate size.",
          requiredFieldPaths: ["business.sector"]
        },
        {
          key: "nis2_scope",
          label: "NIS2 scope",
          summary: "Country-pack scope signals.",
          requiredFieldPaths: ["scope.activities"]
        },
        {
          key: "operational_dependencies",
          label: "Operational dependencies",
          summary: "Microsoft 365, cloud, suppliers, continuity, and incident handling.",
          requiredFieldPaths: ["dependencies.microsoft365Usage"]
        },
        {
          key: "governance_controls",
          label: "Governance and controls",
          summary: "Article 21 control coverage.",
          requiredFieldPaths: ["governance.identityControls"]
        },
        {
          key: "review_generate",
          label: "Review and assessment",
          summary: "Source caveat and report trigger.",
          requiredFieldPaths: ["review.legalCaveatAcknowledged"]
        }
      ],
      selectedCountryCode: "PL",
      selectedCountryPack: buildCountryPackFixture("PL", "Poland KSC NIS2 demo pack"),
      selectedScreen: "nis2_scope",
      session: {
        user: {
          id: "user_country_pack",
          email: "country-pack@example.test",
          displayName: "Country Pack User"
        },
        session: {
          activeOrganizationId: "org_country_pack"
        }
      }
    });

    expect(html).toContain('data-ui-smoke="nis2-country-aware-onboarding"');
    expect(html).toContain("NIS2 country onboarding");
    expect(html).toContain("EU active");
    expect(html).toContain("RO demo");
    expect(html).toContain("PL demo");
    expect(html).toContain("DE demo");
    expect(html).toContain("Company and contacts");
    expect(html).toContain("Business profile");
    expect(html).toContain("NIS2 scope");
    expect(html).toContain("Operational dependencies");
    expect(html).toContain("Governance and controls");
    expect(html).toContain("Review and assessment");
    expect(html).toContain('action="/onboarding/nis2"');
    expect(html).toContain("Country-pack dynamic questions");
    expect(html).toContain("Which sector best matches the customer?");
    expect(html).toContain("possibly in scope");
    expect(html).toContain("legal review required");
    expect(html).toContain("pl-demo-food-or-manufacturing");
    expect(html).toContain("Official source references");
    expect(html).toContain("KSC amendment overview");
    expect(html).toContain("Download first PDF");
    expect(html).toContain("/reports/generated/11111111-1111-4111-8111-111111111111/pdf?format=pdf");
    expect(html).toContain("Download improved PDF");
    expect(html).toContain("/reports/generated/22222222-2222-4222-8222-222222222222/pdf?format=pdf");
    expect(html).toContain('href="/onboarding/romania/company?locale=ro-RO"');
    expect(html).not.toContain("country-pack@example.test");
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
    expect(html).toContain("Readiness Score Trend");
    expect(html).toContain("Not enough data");
    expect(html).toContain('data-ui-action="open-workspace-selector"');
    expect(html).toContain('data-ui-action="connect-microsoft365-tenant"');
    expect(html).toContain('action="/providers/microsoft365/connect"');
    expect(html).toContain("stored_analysis");
    expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
  });

  it("renders the compliance score trend chart with range toggles and movement copy", () => {
    const demo = createOperationalConsoleDemoModel();
    const html = renderOperationalConsole(
      createOperationalConsoleRuntimeModel({
        session: {
          user: {
            id: "user_trend",
            email: "trend@example.test",
            displayName: "Trend User"
          },
          session: {
            activeOrganizationId: "org_trend"
          }
        },
        dashboard: demo.dashboard,
        dashboardHistory: [
          {
            date: "2026-04-01",
            overall_score: 50,
            critical_gaps: 3,
            high_gaps: 5
          },
          {
            date: "2026-04-15",
            overall_score: 57,
            critical_gaps: 2,
            high_gaps: 4
          },
          {
            date: "2026-04-30",
            overall_score: 62,
            critical_gaps: 1,
            high_gaps: 2
          }
        ]
      })
    );

    expect(html).toContain('data-score-trend-card');
    expect(html).toContain('data-trend-days="30" aria-pressed="true"');
    expect(html).toContain('data-trend-days="90"');
    expect(html).toContain('data-trend-days="180"');
    expect(html).toContain('<polyline class="ps-trend-line ps-trend-line--score"');
    expect(html).toContain('<polyline class="ps-trend-line ps-trend-line--critical"');
    expect(html).toContain("Score improved +12 points in the last 30 days");
    expect(html).toContain("2026-04-30: score 62, critical gaps 1, high gaps 2");
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
    expect(html).toContain('href="/onboarding/romania/company?locale=ro-RO"');
    expect(html).toContain(PURESOC_LEGAL_CAVEAT);
    expect(login).toContain('<html lang="ro">');
    expect(login).toContain("Autentificare");
    expect(login).toContain("Sesiune API");
    expect(login).toContain('<label for="password">Parola</label>');
    expect(login).toContain('href="/register"');
    expect(login).toContain('action="/auth/oidc/microsoft_entra/begin"');
    expect(register).toContain('data-ui-smoke="register-screen"');
    expect(register).toContain('action="/auth/register"');
    expect(register).toContain('action="/auth/oidc/microsoft_entra/begin"');
    expect(register).toContain("continue to workspace setup");
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

    const previousEnv = process.env.PURESOC_APP_ENV;
    try {
      process.env.PURESOC_APP_ENV = "production";
      expect(resolvePublicRequestOrigin({ headers: { host: "autogenerated.example.test" } }, 3000)).toBe(
        "https://autogenerated.example.test"
      );
      expect(resolvePublicRequestOrigin({ headers: { host: "localhost:3000" } }, 3000)).toBe(
        "http://localhost:3000"
      );
    } finally {
      if (previousEnv === undefined) {
        delete process.env.PURESOC_APP_ENV;
      } else {
        process.env.PURESOC_APP_ENV = previousEnv;
      }
    }
  });

  it("maps registration API failures to safe deployment-aware messages", () => {
    expect(
      registrationErrorMessageForApiResponse(403, {
        error: { code: "origin_not_allowed" }
      })
    ).toContain("internal Compose URL");
    expect(
      registrationErrorMessageForApiResponse(409, {
        error: { code: "email_already_registered" }
      })
    ).toContain("already exists");
    expect(
      registrationErrorMessageForApiResponse(500, {
        error: { code: "internal_error" }
      })
    ).toContain("database migrations");
    expect(
      registrationErrorMessageForApiResponse(400, {
        error: { code: "invalid_request" }
      })
    ).toContain("at least 12 characters");
  });

  it("forwards browser origins to API calls so production origin checks can stay strict", () => {
    expect(shouldForwardBrowserOriginToApi("http://puresoc-api:3001")).toBe(true);
    expect(shouldForwardBrowserOriginToApi("http://localhost:3001")).toBe(true);
    expect(shouldForwardBrowserOriginToApi("https://api.example.test")).toBe(true);
    expect(resolveApiRequestOrigin("http://puresoc-api:3001", "https://autogenerated.example.test")).toBe(
      "http://puresoc-web:3000"
    );
    expect(resolveApiRequestOrigin("http://api:3001", "https://autogenerated.example.test")).toBe(
      "http://puresoc-web:3000"
    );
    expect(resolveApiRequestOrigin("http://localhost:3001", "http://localhost:3000")).toBe("http://localhost:3000");
    expect(resolveApiRequestOrigin("https://api.example.test", "https://autogenerated.example.test")).toBe(
      "https://autogenerated.example.test"
    );
    expect(
      resolveApiRequestOrigin(
        "https://api.example.test",
        "https://autogenerated.example.test",
        "http://puresoc-web:3000/path"
      )
    ).toBe("http://puresoc-web:3000");
  });

  it("renders the NIS2 wizard as short logical screens with connector and gap exports", () => {
    const model = createSavedRomaniaRouteModel();
    const companyHtml = renderRomaniaOnboardingRoute(model);
    const addressHtml = renderRomaniaOnboardingRoute(model, { screen: "address" });
    const legalHtml = renderRomaniaOnboardingRoute(model, { screen: "legal" });
    const sizeHtml = renderRomaniaOnboardingRoute(model, { screen: "size" });
    const servicesHtml = renderRomaniaOnboardingRoute(model, { screen: "services" });
    const contactsHtml = renderRomaniaOnboardingRoute(model, { screen: "contacts" });
    const systemsHtml = renderRomaniaOnboardingRoute(model, { screen: "systems" });
    const article9Html = renderRomaniaOnboardingRoute(model, { screen: "article9" });
    const outputsHtml = renderRomaniaOnboardingRoute(model, { screen: "outputs" });
    const connectorHtml = renderRomaniaOnboardingRoute(model, { screen: "connector" });
    const gapsHtml = renderRomaniaOnboardingRoute(model, { screen: "gaps" });
    const allScreens = [
      companyHtml,
      addressHtml,
      legalHtml,
      sizeHtml,
      servicesHtml,
      contactsHtml,
      systemsHtml,
      article9Html,
      outputsHtml,
      connectorHtml,
      gapsHtml
    ];

    for (const html of allScreens) {
      expect(html).toContain('data-ui-smoke="romania-onboarding-route"');
      expect(html).toContain('<html lang="ro">');
      expect(html).toContain("@media (max-width: 980px)");
      expect(html).toContain("@media (max-width: 640px)");
      expect(html).toContain(":focus-visible");
      expect(html).toContain('href="#content"');
      expect(html).toContain('data-ui-action="skip-to-content"');
      expect(html).toContain('id="content" tabindex="-1"');
      expect(html).toContain('class="ps-content ps-content--wizard"');
      expect(html).toContain("NIS2 Readiness Wizard");
      expect(html).toContain("Customer onboarding workspace");
      expect(html).toContain("Workspace details");
      expect(html).toContain("ps-route-hero__status-strip");
      expect(html).not.toContain('class="ps-route-hero__summary-grid"');
      expect(html).toContain("What this workspace does");
      expect(html).toContain("Required answers");
      expect(html).toContain("Every wizard screen asks 5 or fewer customer questions.");
      expect(html).toContain("DNSC filing stays outside PureSOC");
      expect(html).toContain('data-ui-action="open-romania-company-screen"');
      expect(html).toContain('data-ui-action="open-romania-address-screen"');
      expect(html).toContain('data-ui-action="open-romania-legal-screen"');
      expect(html).toContain('data-ui-action="open-romania-size-screen"');
      expect(html).toContain('data-ui-action="open-romania-services-screen"');
      expect(html).toContain('data-ui-action="open-romania-contacts-screen"');
      expect(html).toContain('data-ui-action="open-romania-systems-screen"');
      expect(html).toContain('data-ui-action="open-romania-article9-screen"');
      expect(html).toContain('data-ui-action="open-romania-outputs-screen"');
      expect(html).toContain('data-ui-action="open-romania-connector-screen"');
      expect(html).toContain('data-ui-action="open-romania-gaps-screen"');
      expect(html).toContain('<a class="ps-command" href="/" data-ui-action="back-to-dashboard">Back to dashboard</a>');
      expect(html).not.toMatch(/certified compliant|guaranteed nis2 compliance|legal compliance approved/i);
      expect(html).not.toMatch(/Excel|workbook|source map|raw trace|roNis2OnboardingSchema|Notification form!|Entity assessment!/i);
      expect(html).not.toMatch(/missing_translation|planned full pack|classification insufficient data|caveat en/i);
      expect(html).not.toContain("Submitted to DNSC true");
    }

    for (const html of [companyHtml, addressHtml, legalHtml, sizeHtml, servicesHtml, contactsHtml, systemsHtml, article9Html]) {
      const questions = html.match(/data-wizard-question=/g) ?? [];
      expect(questions.length).toBeLessThanOrEqual(5);
      expect(html).toContain("ps-section--workflow-stage");
      expect(html).toContain("ps-workflow-stage");
      expect(html).toContain("ps-workflow-form-card");
    }

    expect(companyHtml).toContain("Company Identity");
    expect(companyHtml).toContain('name="nextScreen" value="address"');
    expect(companyHtml).toContain("Save company");
    expect(companyHtml).not.toContain("Services by sector and subsector");
    expect(companyHtml).not.toContain('data-ui-action="run-romania-classification"');

    expect(addressHtml).toContain("Registered Address");
    expect(addressHtml).toContain('name="nextScreen" value="legal"');
    expect(addressHtml).toContain("Save address");
    expect(addressHtml).toContain("Registered office");

    expect(legalHtml).toContain("Legal Representative");
    expect(legalHtml).toContain('name="nextScreen" value="size"');
    expect(legalHtml).toContain("Save legal rep");

    expect(sizeHtml).toContain("Activity And Size");
    expect(sizeHtml).toContain('name="nextScreen" value="services"');
    expect(sizeHtml).toContain("Save business size");
    expect(sizeHtml).toContain("Main NACE code");

    expect(servicesHtml).toContain("Services And Jurisdiction");
    expect(servicesHtml).toContain('name="nextScreen" value="contacts"');
    expect(servicesHtml).toContain("Save services");
    expect(servicesHtml).toContain("Services by sector and subsector");
    expect(servicesHtml).toContain('data-ui-action="search-romania-services"');
    expect(servicesHtml).toContain("Cloud computing service providers");
    expect(servicesHtml).toContain("None of the services listed in OUG No. 155/2024");

    expect(contactsHtml).toContain("Security Responsibility");
    expect(contactsHtml).toContain('name="nextScreen" value="systems"');
    expect(contactsHtml).toContain("Cybersecurity responsible person");
    expect(contactsHtml).toContain("Organization telephone");

    expect(systemsHtml).toContain("Systems And Monitoring");
    expect(systemsHtml).toContain('name="nextScreen" value="article9"');
    expect(systemsHtml).toContain("Public IP ranges");
    expect(systemsHtml).toContain("Network and information systems");

    expect(article9Html).toContain("Article 9 Context");
    expect(article9Html).toContain('name="nextScreen" value="outputs"');
    expect(article9Html).toContain("Public safety/security/health impact");

    expect(outputsHtml).toContain("Readiness Outputs");
    expect(outputsHtml).toContain('data-ui-action="run-romania-classification"');
    expect(outputsHtml).toContain('data-ui-action="generate-romania-notification-draft"');
    expect(outputsHtml).toContain('data-ui-action="evaluate-romania-readiness"');
    expect(outputsHtml).toContain('data-ui-action="upload-local-evidence"');
    expect(outputsHtml).toContain('data-ui-action="generate-internal-readiness-csv-export"');
    expect(outputsHtml).toContain('data-ui-action="generate-internal-readiness-evidence-package"');
    expect(outputsHtml).toContain("Romanian legal copy pending");
    expect(outputsHtml).toContain(PURESOC_LEGAL_CAVEAT);
    expect(outputsHtml).toContain("not a legal opinion");
    expect(outputsHtml).toContain("Direct DNSC submission");
    expect(outputsHtml).toContain("Not performed by PureSOC");
    expect(outputsHtml).toContain("PureSOC does not submit this draft to DNSC.");
    expect(outputsHtml).toContain('id="romania-boundaries"');
    expect(outputsHtml).toContain('id="romania-outputs"');
    expect(outputsHtml).toContain("API-backed by saved organization data");
    expect(outputsHtml).toContain("Billing");
    expect(outputsHtml).toContain("Audit");

    expect(connectorHtml).toContain("Microsoft 365 Tenant Connector");
    expect(connectorHtml).toContain("tenant OAuth");
    expect(connectorHtml).toContain('data-ui-action="connect-microsoft365-tenant"');
    expect(connectorHtml).toContain("Write actions disabled");
    expect(connectorHtml).toContain("Read-only module status");

    expect(gapsHtml).toContain("Gap List And Exports");
    expect(gapsHtml).toContain("Readiness gap list");
    expect(gapsHtml).toContain("Microsoft 365 tenant is not connected");
    expect(gapsHtml).toContain('data-ui-action="export-gap-list-json"');
    expect(gapsHtml).toContain('data-ui-action="export-gap-list-csv"');
    expect(gapsHtml).toContain('data-ui-action="export-gap-list-evidence-package"');
  });

  it("renders an empty Romania workflow state without fabricated customer answers", () => {
    const html = renderRomaniaOnboardingRoute(
      createRomaniaOnboardingRouteModel({
        locale: "ro-RO"
      })
    );

    expect(html).toContain("No saved answers yet");
    expect(html).toContain("Start with legal identity and address.");
    expect(html).toContain("Company Identity");
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

const buildCountryPackFixture = (countryCode: "DE" | "EU" | "PL" | "RO", displayName: string) => ({
  countryCode,
  displayName,
  packVersion: "2026.06.demo",
  effectiveDate: countryCode === "EU" ? "2022-12-27" : "2026-06-19",
  status: countryCode === "EU" ? "active" : "demo",
  extendsBasePackVersion: countryCode === "EU" ? undefined : "2026.06.demo",
  supportedUiLanguages: countryCode === "RO" ? ["en", "ro"] : ["en"],
  authorityGuidance: [`${displayName} authority guidance remains source-backed for demo use.`],
  officialSources: [
    {
      id: countryCode === "PL" ? "pl-ksc-amendment-overview-2026" : `${countryCode.toLowerCase()}-source`,
      title: countryCode === "PL" ? "KSC amendment overview" : `${displayName} official source`,
      url:
        countryCode === "PL"
          ? "https://www.gov.pl/web/baza-wiedzy/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa"
          : "https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng",
      retrievedAt: "2026-06-19",
      trustLevel: "primary"
    }
  ],
  nationalTerminology: {
    essentialEntity: "Essential entity",
    importantEntity: "Important entity"
  },
  registrationGuidance: ["Use the national route only after source review."],
  sectorRules: ["food", "manufacturing", "ict_service_management"],
  sizeThresholds: ["Use national size thresholds after legal review."],
  specialInclusionRules: ["Critical dependency can change applicability."],
  dynamicQuestions: [
    {
      key: `${countryCode.toLowerCase()}.nis2.sector`,
      label: "Which sector best matches the customer?",
      answerType: "choice",
      choices: ["food", "manufacturing", "ict_service_management"],
      sourceIds: [countryCode === "PL" ? "pl-ksc-amendment-overview-2026" : `${countryCode.toLowerCase()}-source`]
    }
  ],
  classificationRules: [
    {
      id: countryCode === "PL" ? "pl-demo-food-or-manufacturing" : `${countryCode.toLowerCase()}-demo-sector`,
      version: "2026.06",
      outcome: "possibly_in_scope",
      plainLanguage: "Activity should be reviewed against national rules.",
      confidence: "low",
      legalReviewRequired: true,
      sourceIds: [countryCode === "PL" ? "pl-ksc-amendment-overview-2026" : `${countryCode.toLowerCase()}-source`]
    }
  ],
  reportLanguage: {
    classificationDisclaimer: "This is not a binding legal determination.",
    readinessDisclaimer: "Readiness output is not legal advice or certification."
  },
  disclaimers: [`${displayName} remains demo unless reviewed.`]
} as const);
