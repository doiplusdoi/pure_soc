import { aggregateDashboardFromStoredAnalysis, type DashboardSnapshotContract } from "@puresoc/dashboards";
import type { ActionRun } from "@puresoc/recommendations";
import type { InternalReadinessReport, ReportEvidenceSummary, ReportSourceReference } from "@puresoc/reports";
import { PURESOC_LEGAL_CAVEAT, type ActionableSeverity, type SourceReference } from "@puresoc/shared";

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
