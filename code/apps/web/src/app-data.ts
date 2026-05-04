import { aggregateDashboardFromStoredAnalysis, type DashboardSnapshotContract } from "@puresoc/dashboards";
import {
  buildRoNis2NotificationDraft,
  buildRoNis2OnboardingProgress,
  classifyRoNis2Entity,
  roNis2OnboardingSchema,
  romaniaCountryPackStatus,
  toRoNis2ClassificationInput,
  type Nis2Classification,
  type RoNis2NotificationDraftJson,
  type RoNis2OnboardingAnswers,
  type RoNis2OnboardingProgress,
  type RoNis2OnboardingStepSchema,
  type RoNis2SourceMapLink
} from "@puresoc/country-pack-ro";
import type { ActionRun } from "@puresoc/recommendations";
import type { InternalReadinessReport, ReportEvidenceSummary, ReportSourceReference } from "@puresoc/reports";
import {
  LEGAL_CAVEAT_MESSAGE_KEY,
  PURESOC_LEGAL_CAVEAT,
  resolvePureSocLocale,
  type ActionableSeverity,
  type PureSocLocale,
  type SourceReference
} from "@puresoc/shared";

export type OperationalStatus = "ready" | "in_progress" | "attention" | "blocked" | "review_required";

export interface OperationalConsoleModel {
  organization: {
    name: string;
    primaryCountryCode: string;
    subscriptionStatus: string;
  };
  user: {
    displayName: string;
    role: string;
  };
  dashboard: DashboardSnapshotContract;
  onboarding: {
    eu: OnboardingSurface;
    countryPacks: CountryPackSurface[];
    romania: OnboardingSurface;
  };
  microsoft365: Microsoft365HealthSurface;
  gaps: GapSurface[];
  recommendations: RecommendationSurface[];
  evidence: ReportEvidenceSummary[];
  reports: ReportSurface[];
  actionRuns: ActionRun[];
  legalCaveat: string;
  runtimeSource?: {
    label: string;
    detail: string;
  };
}

export interface RuntimeSessionSurface {
  user: {
    id: string;
    email: string;
    displayName?: string | null;
  };
  session: {
    activeOrganizationId?: string | null;
  };
}

export interface WorkspaceSelectionOrganizationSurface {
  id: string;
  name: string;
  primaryCountryCode: string | null;
  billingStatus: string;
  membershipStatus: string;
  roleKeys: string[];
  isActive: boolean;
}

export interface WorkspaceSelectionModel {
  errorMessage?: string;
  organizations: WorkspaceSelectionOrganizationSurface[];
  session: RuntimeSessionSurface;
}

export interface OnboardingSurface {
  title: string;
  status: OperationalStatus;
  completeness: number;
  summary: string;
  sourceReferences: ReportSourceReference[];
}

export interface CountryPackSurface {
  countryCode: string;
  countryName: string;
  status: OperationalStatus;
  classification: string;
  completeness: number;
  sourceReview: string;
  unsupportedAreas: string[];
  sourceReferences: ReportSourceReference[];
}

export interface Microsoft365HealthSurface {
  status: OperationalStatus;
  tenantDisplayName: string;
  tenantId: string;
  lastSyncAt: string;
  permissionBundles: string[];
  modules: Microsoft365ModuleSurface[];
}

export interface Microsoft365ModuleSurface {
  moduleKey: string;
  label: string;
  status: OperationalStatus;
  coverage: string;
  lastSyncAt?: string;
  sourceQuery: string;
}

export interface GapSurface {
  controlId: string;
  title: string;
  jurisdiction: string;
  severity: ActionableSeverity;
  status: string;
  confidence: string;
  summary: string;
  sourceReferences: ReportSourceReference[];
}

export interface RecommendationSurface {
  id: string;
  title: string;
  severity: ActionableSeverity;
  status: string;
  automationMode: string;
  expectedChange: string;
  blastRadius: string;
  evidenceRequired: boolean;
  sourceReferences: ReportSourceReference[];
}

export interface ReportSurface {
  id: string;
  title: string;
  type: string;
  status: string;
  format: string;
  generatedAt: string;
  sourceReferences: ReportSourceReference[];
}

export interface RomaniaOnboardingUnsupportedSignal {
  detail: string;
  label: string;
  tone: "warning" | "info";
}

export interface RomaniaOnboardingRouteModel {
  actionMessage?: string;
  classification: Nis2Classification;
  classificationPersisted: boolean;
  classificationRunId?: string;
  countryPack: typeof romaniaCountryPackStatus;
  assessmentId?: string;
  audit: {
    checkpointCount: number;
    exportAvailable: boolean;
    guarantees: string;
  };
  billing: {
    entitlementCount: number;
    planLabel: string;
    providerKey: string;
  };
  dashboard?: DashboardSnapshotContract;
  evidence: {
    count: number;
    generatedReportCount: number;
    latestTitles: string[];
  };
  hasSavedProgress: boolean;
  latestNotificationDraftId?: string;
  notificationDraft: RoNis2NotificationDraftJson;
  progress: RoNis2OnboardingProgress;
  progressRecordId?: string;
  requestedLocale?: string;
  resolvedLocale: PureSocLocale;
  sourceMapLinks: readonly RoNis2SourceMapLink[];
  steps: readonly RoNis2OnboardingStepSchema[];
  unsupportedSignals: readonly RomaniaOnboardingUnsupportedSignal[];
}

const euArticle21: ReportSourceReference = {
  sourceRecordId: "eu-nis2-art-21",
  title: "NIS2 Article 21",
  jurisdiction: "EU",
  article: "21",
  sourceVersion: "2022/2555"
};

const roWorkbookSource: ReportSourceReference = {
  sourceRecordId: "ro-workbook-notification-form",
  title: "Romania NIS2 workbook notification form",
  jurisdiction: "RO",
  sourceLocation: "Notification form!B4",
  sourceVersion: "nis2ro-tool-v-2-1"
};

const romaniaRouteGeneratedAt = "2026-05-03T09:00:00.000Z";

export const createOperationalConsoleDemoModel = (): OperationalConsoleModel => {
  const organizationId = "org_operational_ui";
  const assessmentId = "assessment_operational_ui";
  const generatedAt = "2026-04-30T10:00:00.000Z";
  const dashboard = aggregateDashboardFromStoredAnalysis({
    organizationId,
    assessmentId,
    generatedAt,
    countryPackCompleteness: 72,
    controlResults: [
      {
        organizationId,
        assessmentId,
        status: "passing",
        evidenceCompleteness: {
          required: 2,
          present: 2,
          missing: 0,
          ratio: 1
        }
      },
      {
        organizationId,
        assessmentId,
        status: "needs_evidence",
        evidenceCompleteness: {
          required: 2,
          present: 1,
          missing: 1,
          ratio: 0.5
        }
      },
      {
        organizationId,
        assessmentId,
        status: "requires_legal_review",
        evidenceCompleteness: {
          required: 1,
          present: 0,
          missing: 1,
          ratio: 0
        }
      }
    ],
    gaps: [
      {
        organizationId,
        assessmentId,
        severity: "high"
      },
      {
        organizationId,
        assessmentId,
        severity: "medium"
      }
    ],
    recommendations: [
      {
        organizationId,
        status: "proposed",
        severity: "high",
        evidenceRequired: true
      },
      {
        organizationId,
        status: "planned",
        severity: "medium",
        evidenceRequired: false
      }
    ],
    evidenceArtifacts: [
      {
        organizationId,
        scanStatus: "clean"
      },
      {
        organizationId,
        scanStatus: "pending"
      }
    ]
  });

  const evidence: ReportEvidenceSummary[] = [
    {
      id: "ev_mfa_policy_export",
      title: "MFA policy export",
      sourceType: "manual_upload",
      controlId: "nis2.access-control.mfa",
      jurisdiction: "EU",
      contentHashSha256: "sha256:8b7a2d4c0d8f",
      mimeType: "application/json",
      scanStatus: "clean",
      createdAt: generatedAt,
      linkedSourceRecordId: euArticle21.sourceRecordId
    },
    {
      id: "ev_ro_notification_draft",
      title: "Romania notification draft JSON",
      sourceType: "generated_report",
      jurisdiction: "RO",
      contentHashSha256: "sha256:7b9e3c1f8a10",
      mimeType: "application/json",
      scanStatus: "pending",
      createdAt: generatedAt,
      linkedSourceRecordId: roWorkbookSource.sourceRecordId
    }
  ];

  const readinessReport: InternalReadinessReport = {
    schemaVersion: "puresoc.report.internal_readiness.v1",
    organizationId,
    assessmentId,
    jurisdiction: "EU",
    reportType: "internal_readiness",
    generatedAt,
    legalCaveat: PURESOC_LEGAL_CAVEAT,
    legalCaveatFallbackUsed: false,
    legalCaveatLocale: "en",
    legalCaveatMessageKey: LEGAL_CAVEAT_MESSAGE_KEY,
    locale: "en",
    sourceReferences: [euArticle21, roWorkbookSource],
    controlResults: [],
    gaps: [],
    recommendations: [],
    evidence,
    provenance: {
      source: "stored_analysis",
      catalogVersion: "phase-h-seed",
      analysisRecordedAt: generatedAt
    }
  };

  return {
    organization: {
      name: "Example Manufacturing SRL",
      primaryCountryCode: "RO",
      subscriptionStatus: "pro"
    },
    user: {
      displayName: "Dana Ionescu",
      role: "Compliance owner"
    },
    dashboard,
    onboarding: {
      eu: {
        title: "EU baseline onboarding",
        status: "in_progress",
        completeness: 84,
        summary: "Business profile, services, NACE codes, and cross-border scope are mostly complete.",
        sourceReferences: [euArticle21]
      },
      countryPacks: [
        {
          countryCode: "RO",
          countryName: "Romania",
          status: "review_required",
          classification: "Important entity, review required",
          completeness: 72,
          sourceReview: "Workbook-derived logic awaits legal review before activation.",
          unsupportedAreas: ["Direct DNSC submission", "Production reviewer assignment"],
          sourceReferences: [roWorkbookSource]
        },
        {
          countryCode: "DE",
          countryName: "Germany",
          status: "attention",
          classification: "Baseline EU scoping only",
          completeness: 38,
          sourceReview: "National operational rules not yet modeled.",
          unsupportedAreas: ["Registration portal details", "Local evidence overlay"],
          sourceReferences: [euArticle21]
        }
      ],
      romania: {
        title: "Romania notification draft",
        status: "review_required",
        completeness: 68,
        summary: "Draft fields are source-mapped to the workbook and remain internal readiness output.",
        sourceReferences: [roWorkbookSource]
      }
    },
    microsoft365: {
      status: "attention",
      tenantDisplayName: "Example Manufacturing SRL",
      tenantId: "00000000-0000-4000-8000-000000000365",
      lastSyncAt: generatedAt,
      permissionBundles: ["m365_read_baseline", "m365_security_read"],
      modules: [
        {
          moduleKey: "entra.users",
          label: "Entra users and roles",
          status: "ready",
          coverage: "154 users, 8 privileged roles",
          lastSyncAt: generatedAt,
          sourceQuery: "provider_sync_modules:entra.users,last_successful"
        },
        {
          moduleKey: "secure-score",
          label: "Microsoft Secure Score",
          status: "ready",
          coverage: "Score and control profile captured",
          lastSyncAt: generatedAt,
          sourceQuery: "provider_normalized_resources:secure_score,current"
        },
        {
          moduleKey: "defender-xdr",
          label: "Defender XDR incidents",
          status: "attention",
          coverage: "License or permission not confirmed",
          sourceQuery: "provider_sync_modules:defender_xdr,status"
        }
      ]
    },
    gaps: [
      {
        controlId: "nis2.access-control.mfa",
        title: "MFA evidence is incomplete",
        jurisdiction: "EU",
        severity: "high",
        status: "needs_evidence",
        confidence: "medium",
        summary: "One required MFA coverage artifact is missing from the evidence vault.",
        sourceReferences: [euArticle21]
      },
      {
        controlId: "nis2.ro.notification",
        title: "Romania notification logic awaits review",
        jurisdiction: "RO",
        severity: "medium",
        status: "requires_legal_review",
        confidence: "low",
        summary: "Workbook-derived classification and draft fields must be reviewed before activation.",
        sourceReferences: [roWorkbookSource]
      }
    ],
    recommendations: [
      {
        id: "rec_mfa_evidence",
        title: "Upload MFA coverage evidence",
        severity: "high",
        status: "proposed",
        automationMode: "manual",
        expectedChange: "Evidence completeness improves for the MFA control.",
        blastRadius: "No provider configuration changes. Evidence metadata only.",
        evidenceRequired: true,
        sourceReferences: [euArticle21]
      },
      {
        id: "rec_mfa_admin_policy",
        title: "Review admin MFA enforcement",
        severity: "medium",
        status: "planned",
        automationMode: "preflightable",
        expectedChange: "Admins without MFA are identified before any enforcement proposal.",
        blastRadius: "Impacts privileged users only after separate approval.",
        evidenceRequired: true,
        sourceReferences: [euArticle21]
      }
    ],
    evidence,
    reports: [
      {
        id: "report_internal_readiness",
        title: "Internal readiness report",
        type: readinessReport.reportType,
        status: "generated",
        format: "JSON and PDF",
        generatedAt: readinessReport.generatedAt,
        sourceReferences: readinessReport.sourceReferences
      },
      {
        id: "report_ro_notification",
        title: "Romania notification draft",
        type: "romania_notification_draft",
        status: "draft",
        format: "JSON",
        generatedAt,
        sourceReferences: [roWorkbookSource]
      }
    ],
    actionRuns: [createMfaActionRun(organizationId, generatedAt, [euArticle21])],
    legalCaveat: readinessReport.legalCaveat
  };
};

export const createOperationalConsoleRuntimeModel = (input: {
  session: RuntimeSessionSurface;
  dashboard: DashboardSnapshotContract;
  organization?: {
    id: string;
    name?: string | null;
    primaryCountryCode?: string | null;
    subscriptionStatus?: string | null;
  };
}): OperationalConsoleModel => {
  const base = createOperationalConsoleDemoModel();
  const organizationId = input.session.session.activeOrganizationId ?? input.organization?.id ?? "unknown";
  const organizationName =
    input.organization?.name ?? (organizationId === "unknown" ? "PureSOC workspace" : `Workspace ${organizationId.slice(0, 8)}`);

  return {
    ...base,
    organization: {
      name: organizationName,
      primaryCountryCode: input.organization?.primaryCountryCode ?? base.organization.primaryCountryCode,
      subscriptionStatus: input.organization?.subscriptionStatus ?? "api"
    },
    user: {
      displayName: input.session.user.displayName ?? input.session.user.email,
      role: "Authenticated user"
    },
    dashboard: input.dashboard,
    runtimeSource: {
      label: "API snapshot",
      detail: `GET /organizations/:orgId/dashboards/snapshots/latest | snapshot ${input.dashboard.organizationId}`
    },
    onboarding: {
      eu: {
        ...base.onboarding.eu,
        completeness: input.dashboard.readinessScores.euApplicability,
        summary: "EU Article 21 readiness is calculated from stored local assessment outputs for this workspace."
      },
      countryPacks: [
        {
          countryCode: "RO",
          countryName: "Romania",
          status: "review_required",
          classification: "Use the Romania workflow for saved-answer classification.",
          completeness: input.dashboard.readinessScores.countryPackCompleteness,
          sourceReview: "Workbook-derived Romania logic awaits product/legal review before production activation.",
          unsupportedAreas: ["Direct DNSC submission", "Production legal activation"],
          sourceReferences: [roWorkbookSource]
        }
      ],
      romania: {
        title: "Romania readiness workflow",
        status: "in_progress",
        completeness: input.dashboard.readinessScores.countryPackCompleteness,
        summary: "Open the Romania workflow to save answers, classify, create drafts, attach evidence, and generate exports.",
        sourceReferences: [roWorkbookSource]
      }
    },
    microsoft365: {
      status: "attention",
      tenantDisplayName: "No Microsoft 365 provider connected",
      tenantId: "local-only",
      lastSyncAt: input.dashboard.generatedAt,
      permissionBundles: ["read-only connector not configured"],
      modules: [
        {
          moduleKey: "provider.local",
          label: "Provider telemetry",
          status: "attention",
          coverage: "No real provider connection is attached to this local product path.",
          sourceQuery: "provider_connections:none"
        }
      ]
    },
    gaps: [],
    recommendations: [],
    evidence: [],
    reports: [],
    actionRuns: [],
    legalCaveat: PURESOC_LEGAL_CAVEAT
  };
};

export interface RomaniaOnboardingRouteInput {
  actionMessage?: string | null;
  auditCheckpointCount?: number;
  billingEntitlementCount?: number;
  billingProviderKey?: string;
  classificationRun?: {
    article9Required: boolean;
    id: string;
    matchedRules: string[];
    missingRequiredFields: string[];
    notificationRecommended: boolean;
    reasonSourceMapLinks?: Record<string, unknown>[];
    reasons: string[];
    result: string;
    sourceMapLinks?: Record<string, unknown>[];
    sourceVersion: string;
  } | null;
  dashboard?: DashboardSnapshotContract | null;
  evidenceArtifacts?: Array<{
    sourceType?: string;
    title?: string;
  }>;
  latestNotificationDraft?: {
    id: string;
    payload?: unknown;
  } | null;
  locale?: string | null;
  progress?: {
    answers: Record<string, unknown>;
    assessmentId?: string;
    completedSteps: string[];
    currentStep: string;
    id: string;
    missingRequiredFields: string[];
    savedAt: string;
    sourceMapLinks?: Record<string, unknown>[];
    sourceVersion: string;
    status: RoNis2OnboardingProgress["status"];
  } | null;
}

export const createRomaniaOnboardingRouteModel = (input: RomaniaOnboardingRouteInput = {}): RomaniaOnboardingRouteModel => {
  const requestedLocale = input.locale ?? "ro-RO";
  const resolvedLocale = resolvePureSocLocale(requestedLocale);
  const hasSavedProgress = Boolean(input.progress);
  const answers = (input.progress?.answers ?? {}) as RoNis2OnboardingAnswers;
  const progress =
    input.progress
      ? ({
          answers,
          completedSteps: input.progress.completedSteps as RoNis2OnboardingProgress["completedSteps"],
          currentStep: input.progress.currentStep as RoNis2OnboardingProgress["currentStep"],
          frameworkKey: "nis2",
          jurisdiction: "RO",
          missingRequiredFields: input.progress.missingRequiredFields,
          savedAt: input.progress.savedAt,
          sourceMapLinks: (input.progress.sourceMapLinks ?? []) as unknown as RoNis2SourceMapLink[],
          sourceVersion: input.progress.sourceVersion,
          status: input.progress.status
        } satisfies RoNis2OnboardingProgress)
      : buildRoNis2OnboardingProgress({
          answers,
          completedSteps: [],
          currentStep: "organization_identity",
          savedAt: romaniaRouteGeneratedAt,
          status: "draft"
        });
  const derivedClassification = classifyRoNis2Entity(toRoNis2ClassificationInput(answers));
  const classification = input.classificationRun
    ? ({
        article9Required: input.classificationRun.article9Required,
        jurisdiction: "RO",
        matchedRules: input.classificationRun.matchedRules,
        missingRequiredFields: input.classificationRun.missingRequiredFields,
        notificationRecommended: input.classificationRun.notificationRecommended,
        reasonSourceMapLinks: (input.classificationRun.reasonSourceMapLinks ?? []) as never,
        reasons: input.classificationRun.reasons,
        result: input.classificationRun.result as Nis2Classification["result"],
        sourceMapLinks: (input.classificationRun.sourceMapLinks ?? []) as never,
        sourceVersion: input.classificationRun.sourceVersion
      } satisfies Nis2Classification)
    : derivedClassification;
  const notificationDraft = buildRoNis2NotificationDraft({
    answers,
    classification,
    generatedAt: romaniaRouteGeneratedAt,
    locale: requestedLocale,
    status: "draft"
  });

  return {
    actionMessage: input.actionMessage ?? undefined,
    assessmentId: input.progress?.assessmentId,
    audit: {
      checkpointCount: input.auditCheckpointCount ?? 0,
      exportAvailable: true,
      guarantees: "Database hash-chain export metadata only. Not WORM storage, external notarization, certification, or legal opinion."
    },
    billing: {
      entitlementCount: input.billingEntitlementCount ?? 0,
      planLabel: input.billingProviderKey === "none" ? "Provider none local entitlement" : "Configured entitlement",
      providerKey: input.billingProviderKey ?? "none"
    },
    classification,
    classificationPersisted: Boolean(input.classificationRun),
    classificationRunId: input.classificationRun?.id,
    countryPack: romaniaCountryPackStatus,
    dashboard: input.dashboard ?? undefined,
    evidence: {
      count: input.evidenceArtifacts?.length ?? 0,
      generatedReportCount:
        input.evidenceArtifacts?.filter((artifact) => artifact.sourceType === "generated_report").length ?? 0,
      latestTitles: (input.evidenceArtifacts ?? [])
        .map((artifact) => artifact.title)
        .filter((title): title is string => typeof title === "string" && title.length > 0)
        .slice(0, 3)
    },
    hasSavedProgress,
    latestNotificationDraftId: input.latestNotificationDraft?.id,
    notificationDraft,
    progress,
    progressRecordId: input.progress?.id,
    requestedLocale: resolvedLocale.requestedLocale,
    resolvedLocale: resolvedLocale.locale,
    sourceMapLinks: dedupeSourceMapLinks([...progress.sourceMapLinks, ...classification.sourceMapLinks, ...notificationDraft.sourceMapLinks]),
    steps: roNis2OnboardingSchema,
    unsupportedSignals: [
      {
        label: "Direct DNSC submission",
        detail: notificationDraft.submission.submittedToDnsc
          ? "Unexpected submitted state."
          : "Not performed by PureSOC. The route prepares an internal draft only.",
        tone: "warning"
      },
      {
        label: "Legal activation",
        detail: "Workbook-derived Romania logic stays review-required until source validation and legal/product review are complete.",
        tone: "warning"
      },
      {
        label: "Romanian regulatory copy",
        detail:
          notificationDraft.legalCaveatFallbackUsed || notificationDraft.fields.some((field) => field.labelFallbackUsed)
            ? "Requested Romanian legal/regulatory text falls back to English/source-mapped labels with missing-translation metadata."
            : "Requested copy resolved without fallback.",
        tone: "info"
      },
      {
        label: "Frontend runtime",
        detail: hasSavedProgress
          ? "This served local workflow is API-backed by saved organization data in the current workspace."
          : "No saved Romania onboarding progress exists yet for this workspace.",
        tone: "info"
      }
    ]
  };
};

const createMfaActionRun = (organizationId: string, now: string, sourceReferences: SourceReference[]): ActionRun => ({
  id: "action_mfa_admin_policy",
  organizationId,
  providerConnectionId: "provider_connection_m365",
  recommendationId: "rec_mfa_admin_policy",
  actionTemplateId: "template_mfa_admin_policy",
  controlId: "nis2.access-control.mfa",
  jurisdiction: "EU",
  providerKey: "microsoft365",
  moduleKey: "entra.conditional-access",
  actionKey: "review_admin_mfa_policy",
  actionType: "technical",
  automationMode: "preflightable",
  title: "Review admin MFA policy",
  riskLevel: "medium",
  licenseRequired: ["Microsoft Entra ID P1"],
  permissionsRequired: ["Policy.Read.All"],
  preconditions: {
    providerWriteEnabled: false,
    approvalRequired: true
  },
  expectedChange: "Prepare a reviewed change plan for admin MFA enforcement.",
  blastRadius: "Privileged Microsoft 365 users only. No automatic provider write is available from this UI.",
  rollbackStrategy: "Keep current policy unchanged or return the proposed policy to report-only during review.",
  manualFallback: "Document the MFA policy manually and upload the reviewed evidence export.",
  evidenceRequired: true,
  highRiskForbiddenInV1: false,
  status: "approval_requested",
  approval: {
    status: "requested",
    requestedBy: "user_compliance_owner",
    requestedAt: now
  },
  preflightStatus: "passed",
  preflightResult: {
    status: "passed",
    checkedAt: now,
    checkedBy: "user_compliance_owner",
    checks: [
      {
        code: "provider_write_disabled",
        status: "warning",
        message: "Provider write execution remains disabled for this connection."
      },
      {
        code: "blast_radius_recorded",
        status: "passed",
        message: "Blast radius and manual fallback are recorded."
      }
    ],
    requiredPermissions: ["Policy.Read.All"],
    requiredLicense: ["Microsoft Entra ID P1"],
    canRequestApproval: true
  },
  preStateSnapshot: {
    evidenceArtifactId: "ev_action_pre_state",
    sourceType: "action_pre_state",
    contentHashSha256: "sha256:4f91d08ad31b",
    capturedAt: now,
    capturedBy: "user_compliance_owner",
    providerConnectionId: "provider_connection_m365",
    resourceRefs: ["conditionalAccessPolicies/admin-mfa"],
    description: "Preflight snapshot before approval review."
  },
  verificationStatus: "not_run",
  evidenceArtifactIds: ["ev_action_pre_state"],
  checklistTaskIds: ["task_review_admin_mfa"],
  sourceReferences,
  createdAt: now,
  updatedAt: now
});

const dedupeSourceMapLinks = (links: readonly RoNis2SourceMapLink[]): RoNis2SourceMapLink[] => {
  const byId = new Map<string, RoNis2SourceMapLink>();
  for (const link of links) {
    byId.set(link.sourceMapId, link);
  }

  return [...byId.values()];
};
