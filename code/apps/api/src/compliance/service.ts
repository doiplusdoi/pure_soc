import {
  calculateComplianceGaps,
  countryPackWarningsFromStatus,
  evaluateComplianceControls,
  generateManualChecklistItems,
  generateReadinessPlan,
  loadDefaultControlCatalog,
  type ComplianceResultRepository,
  type ComplianceGap,
  type CountryPackWarning,
  type EvidenceArtifactState,
  type ManualChecklistItemState
} from "@puresoc/compliance-core";
import {
  evidenceArtifactToComplianceState,
  type EvidenceArtifactMetadata
} from "@puresoc/evidence";
import type { OutputRecordRepository } from "@puresoc/database";
import type { ProviderResourceStore } from "@puresoc/providers-core";
import {
  generateStructuredRecommendations,
  type RecommendationContract
} from "@puresoc/recommendations";
import type { NotificationService } from "@puresoc/notifications";

export interface ComplianceAssessmentEvaluationInput {
  organizationId: string;
  assessmentId: string;
  providerConnectionId?: string;
  jurisdiction?: string;
  ownerUserId?: string;
  evidenceArtifacts?: EvidenceArtifactState[];
  manualTasks?: ManualChecklistItemState[];
  countryPack?: {
    countryCode: string;
    completeness?: string;
    countryPackStatus?: string;
    unsupportedFeatures?: Array<{ featureKey: string; reason: string }>;
    sourceReferences?: CountryPackWarning["sourceReferences"];
  };
}

export interface ComplianceEvaluationServiceOptions {
  store: ProviderResourceStore;
  analysisRepository?: Pick<OutputRecordRepository, "saveStoredAnalysis"> & {
    listArtifacts(organizationId: string): Promise<EvidenceArtifactMetadata[]>;
  };
  resultRepository?: ComplianceResultRepository<RecommendationContract>;
  notifications?: Pick<NotificationService, "send">;
  now?: () => Date;
}

export class ComplianceEvaluationService {
  private readonly store: ProviderResourceStore;
  private readonly analysisRepository?: ComplianceEvaluationServiceOptions["analysisRepository"];
  private readonly resultRepository?: ComplianceResultRepository<RecommendationContract>;
  private readonly notifications?: Pick<NotificationService, "send">;
  private readonly now: () => Date;

  constructor(options: ComplianceEvaluationServiceOptions) {
    this.store = options.store;
    this.analysisRepository = options.analysisRepository;
    this.resultRepository = options.resultRepository;
    this.notifications = options.notifications;
    this.now = options.now ?? (() => new Date());
  }

  async evaluateAssessment(input: ComplianceAssessmentEvaluationInput) {
    const recordedAt = this.now().toISOString();
    const catalog = loadDefaultControlCatalog();
    const providerFindings = input.providerConnectionId
      ? await this.store.listFindings(input.organizationId, input.providerConnectionId)
      : [];
    const providerRecommendations = input.providerConnectionId
      ? await this.store.listRecommendations(input.organizationId, input.providerConnectionId)
      : [];
    const storedEvidenceArtifacts = (await this.analysisRepository?.listArtifacts(input.organizationId)) ?? [];
    const evidenceArtifacts = [
      ...storedEvidenceArtifacts.map(evidenceArtifactToComplianceState),
      ...(input.evidenceArtifacts ?? [])
    ];
    const checklistItems =
      input.manualTasks ??
      generateManualChecklistItems({
        organizationId: input.organizationId,
        assessmentId: input.assessmentId,
        controls: catalog.controls,
        templates: catalog.manualChecklistTemplates,
        ownerUserId: input.ownerUserId
      });
    const countryPackWarnings = buildCountryPackWarnings(input);
    const results = evaluateComplianceControls({
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      jurisdiction: input.jurisdiction ?? catalog.jurisdiction,
      controls: catalog.controls,
      providerFindings,
      evidenceArtifacts,
      manualTasks: checklistItems,
      countryPackWarnings,
      evaluatedAt: recordedAt
    });
    const gaps = calculateComplianceGaps({ results });
    const recommendations = generateStructuredRecommendations({
      organizationId: input.organizationId,
      gaps,
      providerRecommendations
    });
    const readinessPlan = generateReadinessPlan({
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      gaps,
      recommendations,
      defaultOwnerUserId: input.ownerUserId,
      generatedAt: recordedAt
    });
    await this.resultRepository?.saveComplianceResults({
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      jurisdiction: input.jurisdiction ?? catalog.jurisdiction,
      catalogVersion: catalog.catalogVersion,
      recordedAt,
      results,
      gaps,
      recommendations,
      readinessPlan,
      checklistItems
    });
    await this.analysisRepository?.saveStoredAnalysis({
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      jurisdiction: input.jurisdiction ?? catalog.jurisdiction,
      catalogVersion: catalog.catalogVersion,
      recordedAt,
      results,
      gaps,
      recommendations,
      readinessPlan,
      evidenceArtifacts: storedEvidenceArtifacts
    });
    await this.notifyCriticalGaps({
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      gaps,
      controlTitlesById: new Map(catalog.controls.map((control) => [control.id, control.title]))
    });

    return {
      catalogVersion: catalog.catalogVersion,
      results,
      gaps,
      recommendations,
      readinessPlan,
      checklistItems,
      countryPackWarnings
    };
  }

  private async notifyCriticalGaps(input: {
    organizationId: string;
    assessmentId: string;
    gaps: ComplianceGap[];
    controlTitlesById: Map<string, string>;
  }): Promise<void> {
    if (!this.notifications) {
      return;
    }

    for (const gap of input.gaps.filter((candidate) => candidate.severity === "critical")) {
      await this.notifications.send(input.organizationId, "CRITICAL_GAP_DETECTED", {
        assessmentId: input.assessmentId,
        gapId: gap.id,
        controlId: gap.controlId,
        controlName: input.controlTitlesById.get(gap.controlId) ?? gap.controlId,
        summary: gap.summary,
        severity: gap.severity
      });
    }
  }
}

const buildCountryPackWarnings = (input: ComplianceAssessmentEvaluationInput): CountryPackWarning[] => {
  if (!input.countryPack) {
    return [];
  }

  return countryPackWarningsFromStatus(input.countryPack);
};
