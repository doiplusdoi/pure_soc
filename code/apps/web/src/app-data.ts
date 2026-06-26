import { aggregateDashboardFromStoredAnalysis, type DashboardSnapshotContract } from "@puresoc/dashboards";
import {
  buildRoNis2NotificationDraft,
  buildRoNis2OnboardingProgress,
  classifyRoNis2Entity,
  roNis2OnboardingSchema,
  roNis2ServiceCatalogGroups,
  romaniaCountryPackStatus,
  toRoNis2ClassificationInput,
  type Nis2Classification,
  type RoNis2NotificationDraftJson,
  type RoNis2OnboardingAnswers,
  type RoNis2OnboardingProgress,
  type RoNis2OnboardingStepSchema,
  type RoNis2ServiceCatalogGroup,
  type RoNis2SourceMapLink
} from "@puresoc/country-pack-ro";
import type { ActionRun } from "@puresoc/recommendations";
import {
  loadNis2ReadinessCalibrationMetadata,
  type InternalReadinessReport,
  type ReportEvidenceSummary,
  type ReportSourceReference
} from "@puresoc/reports";
import {
  LEGAL_CAVEAT_MESSAGE_KEY,
  PURESOC_LEGAL_CAVEAT,
  resolvePureSocLocale,
  type ActionableSeverity,
  type PureSocLocale,
  type SourceReference
} from "@puresoc/shared";

export type OperationalStatus =
  | "ready"
  | "in_progress"
  | "attention"
  | "blocked"
  | "review_required"
  | "not_configured";

export interface OperationalConsoleModel {
  activeTenantAccess?: ActiveTenantAccessBannerSurface | null;
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
  dashboardHistory: DashboardSnapshotHistoryPoint[];
  onboarding: {
    eu: OnboardingSurface;
    countryPacks: CountryPackSurface[];
    romania: OnboardingSurface;
  };
  microsoft365: Microsoft365HealthSurface;
  gaps: GapSurface[];
  recommendations: RecommendationSurface[];
  evidenceScanner: EvidenceScannerSurface;
  evidence: ReportEvidenceSummary[];
  reports: ReportSurface[];
  actionRuns: ActionRun[];
  legalCaveat: string;
  runtimeSource?: {
    label: string;
    detail: string;
  };
}

export interface DashboardSnapshotHistoryPoint {
  date: string;
  overall_score: number;
  critical_gaps: number;
  high_gaps: number;
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

export type ProductV1ConsoleSection =
  | "overview"
  | "setup"
  | "business"
  | "security"
  | "incidents"
  | "risk"
  | "governance"
  | "evidence"
  | "reports"
  | "connectors"
  | "notifications"
  | "events";

export interface ProductV1ConsoleModel {
  actionMessage?: string | null;
  errorMessage?: string | null;
  organization: {
    id: string;
    name: string;
    legalName?: string | null;
    primaryCountryCode?: string | null;
    roles: string[];
  };
  session: RuntimeSessionSurface;
  section: ProductV1ConsoleSection;
  setup: Record<string, unknown> | null;
  countryPacks: Array<Record<string, unknown>>;
  providerCapabilities: Array<Record<string, unknown>>;
  notificationPreferences: Record<string, unknown> | null;
  reportTemplates: Array<Record<string, unknown>>;
  resources: {
    assets: Array<Record<string, unknown>>;
    attestations: Array<Record<string, unknown>>;
    businessServices: Array<Record<string, unknown>>;
    fileObjects: Array<Record<string, unknown>>;
    findings: Array<Record<string, unknown>>;
    governanceActivities: Array<Record<string, unknown>>;
    governanceCalendarEvents: Array<Record<string, unknown>>;
    incidents: Array<Record<string, unknown>>;
    internalEvents: Array<Record<string, unknown>>;
    notifications: Array<Record<string, unknown>>;
    people: Array<Record<string, unknown>>;
    policies: Array<Record<string, unknown>>;
    policyAcknowledgements: Array<Record<string, unknown>>;
    policyReviews: Array<Record<string, unknown>>;
    remediationPlans: Array<Record<string, unknown>>;
    reportSnapshots: Array<Record<string, unknown>>;
    retentionPolicies: Array<Record<string, unknown>>;
    risks: Array<Record<string, unknown>>;
    supportSessions: Array<Record<string, unknown>>;
    supplierReviews: Array<Record<string, unknown>>;
    suppliers: Array<Record<string, unknown>>;
    tasks: Array<Record<string, unknown>>;
    trainingRecords: Array<Record<string, unknown>>;
  };
}

export interface EvidenceScannerSurface {
  detail: string;
  engine: string;
  label: string;
  signatureSource?: string;
  status: OperationalStatus;
}

export interface WorkspaceSelectionOrganizationSurface {
  id: string;
  name: string;
  logoDataUrl?: string | null;
  primaryCountryCode: string | null;
  billingStatus: string;
  membershipStatus: string;
  roleKeys: string[];
  isActive: boolean;
}

export interface WorkspaceSelectionModel {
  activeTenantAccess?: ActiveTenantAccessBannerSurface | null;
  errorMessage?: string;
  organizations: WorkspaceSelectionOrganizationSurface[];
  session: RuntimeSessionSurface;
}

export interface OrganizationInvitationRoleOption {
  key: string;
  label: string;
  summary: string;
}

export interface OrganizationInvitationScreenModel {
  acceptOrganizationId?: string | null;
  actionMessage?: string;
  activeTenantAccess?: ActiveTenantAccessBannerSurface | null;
  activeOrganization: WorkspaceSelectionOrganizationSurface | null;
  canCreateInvitations: boolean;
  errorMessage?: string;
  organizations: WorkspaceSelectionOrganizationSurface[];
  roleKeys: string[];
  roleOptions: OrganizationInvitationRoleOption[];
  session: RuntimeSessionSurface;
}

export interface NotificationChannelSettingsSurface {
  id: string;
  type: "email" | "slack_webhook" | "teams_webhook";
  destination?: string;
  destinationPreview: string;
  enabled: boolean;
  createdAt: string;
}

export interface NotificationLogSettingsSurface {
  id: string;
  channelId?: string;
  eventType: string;
  payloadHash: string;
  sentAt: string;
  status: "sent" | "failed";
  errorMessage?: string;
}

export interface NotificationOperatorAlertSettingsSurface {
  id: string;
  alertType: "delivery_exhausted";
  severity: "warning" | "critical";
  status: "open" | "acknowledged";
  title: string;
  body: string;
  sourceRetryItemId?: string;
  channelId?: string;
  eventType?: string;
  createdAt: string;
  acknowledgedAt?: string;
}

export interface NotificationSettingsScreenModel {
  actionMessage?: string;
  activeTenantAccess?: ActiveTenantAccessBannerSurface | null;
  activeOrganization: WorkspaceSelectionOrganizationSurface | null;
  canManageChannels: boolean;
  channels: NotificationChannelSettingsSurface[];
  errorMessage?: string;
  logs: NotificationLogSettingsSurface[];
  operatorAlerts: NotificationOperatorAlertSettingsSurface[];
  roleKeys: string[];
  session: RuntimeSessionSurface;
}

export interface PartnerMembershipSurface {
  id: string;
  partnerId: string;
  role: "owner" | "admin" | "analyst" | "viewer" | string;
  status: string;
}

export interface PartnerSurface {
  id: string;
  name: string;
  slug: string;
  status: string;
  parentPartnerId?: string | null;
}

export interface PartnerPortfolioOpportunitySurface {
  customerId?: string;
  customerName?: string;
  opportunityType: string;
  priority: "low" | "medium" | "high" | "critical" | string;
  relevantMicrosoftCapabilityOrPlan?: string;
  affectedUsers?: number;
  nis2Areas: string[];
  evidenceSource: string;
  nextAction: string;
}

export interface PartnerPortfolioTenantSnapshotSurface {
  assessmentId?: string;
  assessmentCompleted: boolean;
  sector?: string;
  likelyClassification?: string;
  readinessPercent?: number;
  evidenceConfidencePercent?: number;
  microsoftConnectionState: "connected" | "disconnected" | "partial" | "error" | string;
  highPriorityGapCount: number;
  topRecommendationOrOpportunity?: string;
  lastAssessmentOrSyncAt?: string;
  opportunities: PartnerPortfolioOpportunitySurface[];
}

export interface PartnerPortfolioMetricsSurface {
  totalCustomerTenants: number;
  completedAssessments: number;
  customersLikelyOrPossiblyInScope: number;
  connectedMicrosoftTenants: number;
  highPriorityGaps: number;
  opportunities: number;
}

export interface PartnerPortfolioCustomerSurface {
  grant: {
    id: string;
    organizationId: string;
    grantLevel: "admin" | "analyst" | "viewer" | string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  organization: {
    id: string;
    name: string;
    legalName?: string | null;
    primaryCountryCode?: string | null;
    billingStatus?: string | null;
  } | null;
  snapshot?: PartnerPortfolioTenantSnapshotSurface;
}

export interface PartnerTenantSessionSurface {
  id: string;
  realActorUserId: string;
  partnerId: string;
  effectiveOrganizationId: string;
  reason: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  endedAt?: string | null;
  endReason?: string | null;
}

export interface ActiveTenantAccessBannerSurface {
  partnerId: string;
  partnerName: string;
  customerName: string;
  grantLevel?: string | null;
  session: PartnerTenantSessionSurface;
}

export interface PartnerConsoleModel {
  actionMessage?: string;
  activeTenantAccess?: ActiveTenantAccessBannerSurface | null;
  activePartnerId?: string | null;
  currentTenantSession?: PartnerTenantSessionSurface | null;
  errorMessage?: string;
  partners: Array<{
    membership: PartnerMembershipSurface;
    partner: PartnerSurface;
  }>;
  metrics?: PartnerPortfolioMetricsSurface;
  opportunities?: PartnerPortfolioOpportunitySurface[];
  portfolio: PartnerPortfolioCustomerSurface[];
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

export interface Nis2CountryPackSourceSurface {
  id: string;
  title: string;
  url: string;
  retrievedAt: string;
  trustLevel: "primary" | "secondary";
  notes?: string;
}

export interface Nis2CountryPackQuestionSurface {
  key: string;
  label: string;
  answerType: "boolean" | "choice" | "multi_choice" | "number" | "text";
  choices?: readonly string[];
  sourceIds: readonly string[];
}

export interface Nis2CountryPackDefinitionSurface {
  countryCode: string;
  displayName: string;
  packVersion: string;
  effectiveDate: string;
  status: "demo" | "reviewed" | "active" | "retired";
  extendsBasePackVersion?: string;
  supportedUiLanguages: readonly string[];
  authorityGuidance: readonly string[];
  officialSources: readonly Nis2CountryPackSourceSurface[];
  nationalTerminology: Record<string, string>;
  registrationGuidance: readonly string[];
  sectorRules: readonly string[];
  sizeThresholds: readonly string[];
  specialInclusionRules: readonly string[];
  dynamicQuestions: readonly Nis2CountryPackQuestionSurface[];
  classificationRules: ReadonlyArray<{
    id: string;
    outcome: string;
    plainLanguage: string;
    confidence: "low" | "medium" | "high";
    legalReviewRequired: boolean;
    sourceIds: readonly string[];
    version: string;
  }>;
  reportLanguage: {
    classificationDisclaimer: string;
    readinessDisclaimer: string;
  };
  disclaimers: readonly string[];
}

export interface Nis2CountryPackStructuredClassificationSurface {
  result: string;
  matchedRules: readonly string[];
  legalBasisReferences: readonly Nis2CountryPackSourceSurface[];
  assumptions: readonly string[];
  missingInformation: readonly string[];
  explanation: string;
  confidence: "low" | "medium" | "high";
  legalReviewRequired: boolean;
}

export interface Nis2CountryOnboardingScreenSurface {
  key: string;
  label: string;
  summary: string;
  requiredFieldPaths: readonly string[];
}

export interface Nis2CountryOnboardingProgressSurface {
  id: string;
  organizationId: string;
  assessmentId?: string;
  answers: Record<string, unknown>;
  completedScreens: readonly string[];
  countryCode: string;
  currentScreen: string;
  missingRequiredFields: readonly string[];
  sourceReferences: readonly Record<string, unknown>[];
  sourceVersion: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Nis2CountryOnboardingClassificationRunSurface {
  id: string;
  organizationId: string;
  assessmentId?: string;
  onboardingProgressId?: string;
  countryCode: string;
  result: string;
  confidence: "low" | "medium" | "high";
  legalReviewRequired: boolean;
  explanation: string;
  assumptions: readonly string[];
  matchedRules: readonly string[];
  missingInformation: readonly string[];
  legalBasisReferences: readonly Record<string, unknown>[];
  sourceVersion: string;
  classifiedAt: string;
}

export interface Nis2CountryAwareOnboardingModel {
  actionMessage?: string;
  activeTenantAccess?: ActiveTenantAccessBannerSurface | null;
  activeOrganizationId?: string | null;
  classification?: Nis2CountryPackStructuredClassificationSurface | Nis2CountryOnboardingClassificationRunSurface | null;
  classificationInput: {
    employeeCount?: number;
    publicAdministration?: boolean;
    sector?: string;
    telecomProvider?: boolean;
  };
  countryPacks: readonly Nis2CountryPackDefinitionSurface[];
  errorMessage?: string;
  firstReportId?: string;
  generatedReport?: {
    id: string;
    assessmentId?: string;
    status: string;
  };
  improvedReportId?: string;
  onboardingScreens: readonly Nis2CountryOnboardingScreenSurface[];
  progress?: Nis2CountryOnboardingProgressSurface | null;
  selectedCountryCode: string;
  selectedCountryPack: Nis2CountryPackDefinitionSurface;
  selectedScreen: string;
  session: RuntimeSessionSurface;
}

export interface Microsoft365HealthSurface {
  providerConnectionId?: string | null;
  status: OperationalStatus;
  tenantDisplayName: string;
  tenantId: string;
  lastSyncAt: string;
  permissionBundles: string[];
  modules: Microsoft365ModuleSurface[];
  writeEnabled: boolean;
  connectorMode: string;
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
  activeTenantAccess?: ActiveTenantAccessBannerSurface | null;
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
  readinessGaps: readonly RomaniaReadinessGapSurface[];
  resolvedLocale: PureSocLocale;
  serviceCatalogGroups: readonly RoNis2ServiceCatalogGroup[];
  sourceMapLinks: readonly RoNis2SourceMapLink[];
  steps: readonly RoNis2OnboardingStepSchema[];
  unsupportedSignals: readonly RomaniaOnboardingUnsupportedSignal[];
  microsoft365: Microsoft365HealthSurface;
  wizardCompletion: Record<string, RomaniaWizardScreenCompletion>;
}

export interface RomaniaWizardScreenCompletion {
  answeredQuestions: number;
  complete: boolean;
  missingLabels: string[];
  totalQuestions: number;
}

export interface RomaniaReadinessGapSurface {
  actionHref: string;
  actionKey: string;
  actionLabel: string;
  id: string;
  severity: ActionableSeverity;
  source: "evidence" | "microsoft365" | "onboarding" | "outputs";
  summary: string;
  title: string;
}

const euArticle21: ReportSourceReference = {
  sourceRecordId: "eu-nis2-art-21",
  title: "NIS2 Article 21",
  jurisdiction: "EU",
  article: "21",
  sourceVersion: "2022/2555"
};

const roRegistrationSource: ReportSourceReference = {
  sourceRecordId: "ro-nis2-registration-workflow",
  title: "Romania NIS2 registration workflow",
  jurisdiction: "RO",
  sourceVersion: "nis2ro-tool-v-2-1"
};

const romaniaRouteGeneratedAt = "2026-05-03T09:00:00.000Z";

export const organizationInvitationRoleOptions: readonly OrganizationInvitationRoleOption[] = [
  {
    key: "auditor",
    label: "Auditor",
    summary: "Can review readiness data and evidence without changing operations."
  },
  {
    key: "compliance_manager",
    label: "Compliance manager",
    summary: "Can manage readiness work and country-pack progress."
  },
  {
    key: "security_operator",
    label: "Security operator",
    summary: "Can operate security posture workflows without owning billing."
  },
  {
    key: "remediation_approver",
    label: "Remediation approver",
    summary: "Can approve controlled remediation workflows when enabled."
  },
  {
    key: "billing_admin",
    label: "Billing admin",
    summary: "Can manage billing-facing tasks without full workspace ownership."
  },
  {
    key: "org_admin",
    label: "Organization admin",
    summary: "Can administer the workspace and invite additional members."
  }
];

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
      linkedSourceRecordId: roRegistrationSource.sourceRecordId
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
    version: {
      countryPackVersion: "2026.06.demo",
      immutable: true,
      inputSnapshot: {
        assessmentId,
        classificationResult: {
          countryCode: "RO",
          legalReviewRequired: true,
          result: "possibly_in_scope"
        },
        controlResultCount: 0,
        evidenceArtifactCount: evidence.length,
        gapCount: 0,
        recommendationCount: 0
      },
      methodologyVersion: "puresoc.readiness.declared.v1",
      onboardingSchemaVersion: "Entity data V2.1 ENG_45915; Entity assessment V2.0_45898",
      rendererVersion: "puresoc-report-renderer-json.v1",
      reportVersion: 1,
      triggerType: "onboarding_completed"
    },
    concepts: {
      applicability: {
        confidence: "low",
        legalReviewRequired: true,
        result: "possibly_in_scope",
        summary: "Demo company is treated as possibly in scope until legal review."
      },
      readiness: {
        applicableControlCount: 0,
        methodologyVersion: "puresoc.readiness.declared.v1",
        missingInformationCount: 0,
        result: "low",
        summary: "Demo dashboard snapshot provides readiness detail outside this report fixture.",
        value: dashboard.readinessScores.overallInternalReadiness
      },
      evidenceConfidence: {
        methodologyVersion: "puresoc.readiness.declared.v1",
        missingEvidenceCount: 0,
        result: "medium",
        summary: "Demo evidence confidence is represented by local evidence artifacts.",
        value: dashboard.readinessScores.evidenceCompleteness
      },
      priority: {
        criticalGapCount: dashboard.sourceRecordCounts.gaps,
        highGapCount: 0,
        result: "critical",
        summary: "Demo dashboard contains critical readiness gaps."
      }
    },
    calibration: loadNis2ReadinessCalibrationMetadata(),
    sourceReferences: [euArticle21, roRegistrationSource],
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
    dashboardHistory: [
      {
        date: "2026-04-28",
        overall_score: 38,
        critical_gaps: 4,
        high_gaps: 6
      },
      {
        date: "2026-04-29",
        overall_score: 46,
        critical_gaps: 3,
        high_gaps: 5
      },
      {
        date: "2026-04-30",
        overall_score: dashboard.trendMetrics.overallScore,
        critical_gaps: dashboard.trendMetrics.gapCountBySeverity.critical,
        high_gaps: dashboard.trendMetrics.gapCountBySeverity.high
      }
    ],
    onboarding: {
      eu: {
        title: "Business profile",
        status: "in_progress",
        completeness: 84,
        summary: "Company details, legal profile, NACE activity, services, and cross-border scope are mostly complete.",
        sourceReferences: [euArticle21]
      },
      countryPacks: [
        {
          countryCode: "RO",
          countryName: "Romania",
          status: "review_required",
          classification: "Important entity, review required",
          completeness: 72,
          sourceReview: "Generated Romania country-pack logic awaits legal review before activation.",
          unsupportedAreas: ["Direct DNSC submission", "Production reviewer assignment"],
          sourceReferences: [roRegistrationSource]
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
        title: "NIS2 readiness wizard",
        status: "review_required",
        completeness: 68,
        summary: "Short-page onboarding feeds local classification, internal readiness outputs, connector handoff, and gap exports.",
        sourceReferences: [roRegistrationSource]
      }
    },
    microsoft365: disconnectedMicrosoft365Surface(generatedAt),
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
        summary: "Generated Romania classification and draft fields must be reviewed before activation.",
        sourceReferences: [roRegistrationSource]
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
    evidenceScanner: {
      label: "Upload scan gate",
      engine: "ClamAV",
      status: "ready",
      signatureSource: "FreshClam signatures",
      detail: "Evidence uploads are streamed to the internal ClamAV service before MinIO storage."
    },
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
        sourceReferences: [roRegistrationSource]
      }
    ],
    actionRuns: [createMfaActionRun(organizationId, generatedAt, [euArticle21])],
    legalCaveat: readinessReport.legalCaveat
  };
};

export const createOperationalConsoleRuntimeModel = (input: {
  activeTenantAccess?: ActiveTenantAccessBannerSurface | null;
  session: RuntimeSessionSurface;
  dashboard: DashboardSnapshotContract;
  dashboardHistory?: DashboardSnapshotHistoryPoint[];
  organization?: {
    id: string;
    name?: string | null;
    primaryCountryCode?: string | null;
    subscriptionStatus?: string | null;
  };
  microsoft365?: Microsoft365HealthSurface;
}): OperationalConsoleModel => {
  const base = createOperationalConsoleDemoModel();
  const organizationId = input.session.session.activeOrganizationId ?? input.organization?.id ?? "unknown";
  const organizationName =
    input.organization?.name ?? (organizationId === "unknown" ? "PureSOC workspace" : `Workspace ${organizationId.slice(0, 8)}`);

  return {
    ...base,
    activeTenantAccess: input.activeTenantAccess ?? null,
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
    dashboardHistory: input.dashboardHistory ?? [],
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
          sourceReview: "Generated Romania country-pack logic awaits product/legal review before production activation.",
          unsupportedAreas: ["Direct DNSC submission", "Production legal activation"],
          sourceReferences: [roRegistrationSource]
        }
      ],
      romania: {
        title: "NIS2 readiness wizard",
        status: "in_progress",
        completeness: input.dashboard.readinessScores.countryPackCompleteness,
        summary: "Open the wizard to complete business data, classify, create drafts, connect Microsoft 365, review gaps, and generate exports.",
        sourceReferences: [roRegistrationSource]
      }
    },
    microsoft365: input.microsoft365 ?? disconnectedMicrosoft365Surface(input.dashboard.generatedAt),
    gaps: [],
    recommendations: [],
    evidence: [],
    reports: [],
    actionRuns: [],
    legalCaveat: PURESOC_LEGAL_CAVEAT
  };
};

export const disconnectedMicrosoft365Surface = (generatedAt: string): Microsoft365HealthSurface => ({
  providerConnectionId: null,
  status: "attention",
  tenantDisplayName: "No Microsoft 365 provider connected",
  tenantId: "tenant OAuth not connected",
  lastSyncAt: generatedAt,
  permissionBundles: ["tenant OAuth consent required"],
  writeEnabled: false,
  connectorMode: "provider_connection_oauth",
  modules: [
    {
      moduleKey: "provider.connection",
      label: "Provider connection",
      status: "attention",
      coverage: "Start Microsoft Entra admin consent from the workspace connector before Microsoft Graph reads can run.",
      sourceQuery: "provider not connected"
    }
  ]
});

export interface RomaniaOnboardingRouteInput {
  actionMessage?: string | null;
  activeTenantAccess?: ActiveTenantAccessBannerSurface | null;
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
  microsoft365?: Microsoft365HealthSurface | null;
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
  const microsoft365 = input.microsoft365 ?? disconnectedMicrosoft365Surface(input.dashboard?.generatedAt ?? romaniaRouteGeneratedAt);
  const dataEntryCompletion = buildRomaniaWizardDataCompletion(answers);
  const outputComplete = Boolean(input.classificationRun && input.latestNotificationDraft?.id && input.progress?.assessmentId);
  const connectorComplete = Boolean(microsoft365.providerConnectionId);
  const readinessGaps = buildRomaniaReadinessGaps({
    assessmentId: input.progress?.assessmentId,
    classificationPersisted: Boolean(input.classificationRun),
    dataEntryCompletion,
    evidenceCount: input.evidenceArtifacts?.length ?? 0,
    latestNotificationDraftId: input.latestNotificationDraft?.id,
    microsoft365
  });
  const wizardCompletion: Record<string, RomaniaWizardScreenCompletion> = {
    ...dataEntryCompletion,
    outputs: {
      answeredQuestions: 0,
      complete: outputComplete,
      missingLabels: outputComplete ? [] : ["classification, draft, and readiness evaluation"],
      totalQuestions: 0
    },
    connector: {
      answeredQuestions: 0,
      complete: connectorComplete,
      missingLabels: connectorComplete ? [] : ["Microsoft 365 tenant OAuth"],
      totalQuestions: 0
    },
    gaps: {
      answeredQuestions: 0,
      complete: readinessGaps.length === 0,
      missingLabels: readinessGaps.map((gap) => gap.title),
      totalQuestions: 0
    }
  };

  return {
    activeTenantAccess: input.activeTenantAccess ?? null,
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
    readinessGaps,
    resolvedLocale: resolvedLocale.locale,
    serviceCatalogGroups: roNis2ServiceCatalogGroups,
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
        detail: "Generated Romania country-pack logic stays review-required until source validation and legal/product review are complete.",
        tone: "warning"
      },
      {
        label: "Romanian regulatory copy",
        detail:
          notificationDraft.legalCaveatFallbackUsed || notificationDraft.fields.some((field) => field.labelFallbackUsed)
            ? "Romanian legal/regulatory text remains conservative until product/legal-approved copy is available."
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
    ],
    microsoft365,
    wizardCompletion
  };
};

interface RomaniaWizardQuestionDefinition {
  label: string;
  path: string;
  required: boolean;
}

const romaniaWizardQuestionDefinitions: Record<string, readonly RomaniaWizardQuestionDefinition[]> = {
  company: [
    { label: "Legal name", path: "entity.legalName", required: true },
    { label: "CUI", path: "entity.cui", required: true },
    { label: "National registration number", path: "entity.nationalRegistrationNumber", required: true },
    { label: "Website URL", path: "contact.websiteUrl", required: false },
    { label: "Organization email", path: "contact.email", required: true }
  ],
  address: [
    { label: "Country", path: "address.country", required: true },
    { label: "County", path: "address.county", required: true },
    { label: "City", path: "address.city", required: true },
    { label: "Street", path: "address.street", required: true },
    { label: "Postal code", path: "address.postalCode", required: false }
  ],
  legal: [
    { label: "Legal representative", path: "legalRepresentative.name", required: true },
    { label: "Legal representative role", path: "legalRepresentative.role", required: true },
    { label: "Legal representative email", path: "legalRepresentative.email", required: true },
    { label: "Legal representative phone", path: "legalRepresentative.phone", required: true }
  ],
  size: [
    { label: "Main NACE code", path: "activity.mainNaceCode", required: true },
    { label: "Employee count", path: "size.employeeCount", required: false },
    { label: "Annual turnover", path: "size.annualTurnoverEur", required: false },
    { label: "Balance sheet total", path: "size.balanceSheetTotalEur", required: false },
    { label: "Size category", path: "size.sizeCategory", required: false }
  ],
  services: [
    { label: "Services by sector and subsector", path: "selectedServiceTypeCodes", required: true },
    { label: "Established in Romania", path: "relationship.establishedInRomania", required: false },
    { label: "Main office in Romania", path: "relationship.mainOfficeInRomania", required: false },
    { label: "Provides services in Romania", path: "relationship.providesServicesInRomania", required: false },
    { label: "Provides services in another EU member state", path: "relationship.providesServicesInAnotherEuMemberState", required: false }
  ],
  contacts: [
    { label: "Cybersecurity responsible person", path: "cybersecurityResponsible.name", required: true },
    { label: "Cybersecurity role", path: "cybersecurityResponsible.role", required: true },
    { label: "Cybersecurity email", path: "cybersecurityResponsible.email", required: true },
    { label: "Cybersecurity phone", path: "cybersecurityResponsible.phone", required: true },
    { label: "Organization telephone", path: "contact.phone", required: false }
  ],
  systems: [
    { label: "Monitoring contact", path: "permanentMonitoringContact.name", required: true },
    { label: "Monitoring email", path: "permanentMonitoringContact.email", required: true },
    { label: "Monitoring phone", path: "permanentMonitoringContact.phone", required: true },
    { label: "Public IP ranges", path: "network.publicIpRanges", required: false },
    { label: "Network and information systems", path: "network.systemsDescription", required: true }
  ],
  article9: [
    {
      label: "Public administration entity established by Romania",
      path: "relationship.publicAdministrationEstablishedByRomania",
      required: false
    },
    { label: "Sole provider of an essential supporting service", path: "article9.soleProviderEssentialService", required: false },
    { label: "Public safety/security/health impact", path: "article9.publicSafetySecurityOrHealthImpact", required: false },
    { label: "Systemic or cross-border risk", path: "article9.systemicRisk", required: false },
    { label: "Critical at national or regional level", path: "article9.nationalOrRegionalCriticality", required: false }
  ]
};

const buildRomaniaWizardDataCompletion = (
  answers: RoNis2OnboardingAnswers
): Record<string, RomaniaWizardScreenCompletion> =>
  Object.fromEntries(
    Object.entries(romaniaWizardQuestionDefinitions).map(([screen, questions]) => {
      const answeredQuestions = questions.filter((question) => hasAnswerAtPath(answers, question.path)).length;
      const missingLabels = questions
        .filter((question) => question.required && !hasAnswerAtPath(answers, question.path))
        .map((question) => question.label);

      return [
        screen,
        {
          answeredQuestions,
          complete: missingLabels.length === 0,
          missingLabels,
          totalQuestions: questions.length
        }
      ];
    })
  );

const buildRomaniaReadinessGaps = (input: {
  assessmentId?: string;
  classificationPersisted: boolean;
  dataEntryCompletion: Record<string, RomaniaWizardScreenCompletion>;
  evidenceCount: number;
  latestNotificationDraftId?: string;
  microsoft365: Microsoft365HealthSurface;
}): RomaniaReadinessGapSurface[] => {
  const gaps: RomaniaReadinessGapSurface[] = [];

  for (const [screen, completion] of Object.entries(input.dataEntryCompletion)) {
    if (!completion.complete) {
      gaps.push({
        actionHref: `/onboarding/romania/${screen}?locale=ro-RO`,
        actionKey: `open-${screen}-wizard-gap`,
        actionLabel: "Complete screen",
        id: `onboarding_${screen}`,
        severity: "medium",
        source: "onboarding",
        summary: `Missing: ${completion.missingLabels.join(", ")}.`,
        title: `${formatWizardScreenLabel(screen)} data incomplete`
      });
    }
  }

  if (!input.classificationPersisted) {
    gaps.push({
      actionHref: "/onboarding/romania/outputs?locale=ro-RO",
      actionKey: "open-classification-gap",
      actionLabel: "Run output",
      id: "outputs_classification_missing",
      severity: "high",
      source: "outputs",
      summary: "Run the preliminary Romania classification from saved answers.",
      title: "Classification has not been generated"
    });
  }

  if (!input.latestNotificationDraftId) {
    gaps.push({
      actionHref: "/onboarding/romania/outputs?locale=ro-RO",
      actionKey: "open-draft-gap",
      actionLabel: "Generate draft",
      id: "outputs_notification_draft_missing",
      severity: "medium",
      source: "outputs",
      summary: "Generate the internal Romania notification draft for reviewer export.",
      title: "Notification draft is missing"
    });
  }

  if (!input.assessmentId) {
    gaps.push({
      actionHref: "/onboarding/romania/outputs?locale=ro-RO",
      actionKey: "open-evaluation-gap",
      actionLabel: "Evaluate readiness",
      id: "outputs_assessment_missing",
      severity: "high",
      source: "outputs",
      summary: "Evaluate internal readiness so gaps, recommendations, reports, and dashboard snapshots have stored inputs.",
      title: "Internal readiness evaluation is missing"
    });
  }

  if (input.evidenceCount === 0) {
    gaps.push({
      actionHref: "/onboarding/romania/outputs?locale=ro-RO",
      actionKey: "open-evidence-gap",
      actionLabel: "Attach evidence",
      id: "evidence_missing",
      severity: "medium",
      source: "evidence",
      summary: "Attach at least one local artifact or note before sharing the internal readiness package.",
      title: "Evidence trail is empty"
    });
  }

  if (!input.microsoft365.providerConnectionId) {
    gaps.push({
      actionHref: "/providers/microsoft365",
      actionKey: "open-microsoft365-connector-gap",
      actionLabel: "Connect tenant",
      id: "microsoft365_connection_missing",
      severity: "high",
      source: "microsoft365",
      summary: "Connect the customer Microsoft 365 tenant with read-only admin consent to enrich the gap list.",
      title: "Microsoft 365 tenant is not connected"
    });
  } else {
    for (const module of input.microsoft365.modules.filter((module) => !["ready", "in_progress"].includes(module.status))) {
      gaps.push({
        actionHref: "/providers/microsoft365",
        actionKey: `open-microsoft365-${module.moduleKey.replace(/[^a-zA-Z0-9_-]/g, "-")}-gap`,
        actionLabel: "Review module",
        id: `microsoft365_${module.moduleKey}`,
        severity: module.status === "blocked" ? "high" : "medium",
        source: "microsoft365",
        summary: module.coverage,
        title: `${module.label} is ${module.status.replaceAll("_", " ")}`
      });
    }
  }

  return gaps;
};

const hasAnswerAtPath = (answers: RoNis2OnboardingAnswers, path: string): boolean => {
  const value = path.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, answers);

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== undefined && value !== null && value !== "";
};

const formatWizardScreenLabel = (screen: string): string =>
  screen
    .split(/[-_]/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

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
