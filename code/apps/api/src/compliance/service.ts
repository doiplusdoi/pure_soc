import {
  calculateComplianceGaps,
  countryPackWarningsFromStatus,
  evaluateComplianceControls,
  generateManualChecklistItems,
  generateReadinessPlan,
  loadDefaultControlCatalog,
  type CountryPackWarning,
  type EvidenceArtifactState,
  type ManualChecklistItemState
} from "../../../../packages/compliance/core/src/index";
import {
  evidenceArtifactToComplianceState,
  type EvidenceArtifactMetadata
} from "../../../../packages/evidence/src/index";
import type { ProviderResourceStore } from "../../../../packages/providers/core/src/index";
import { generateStructuredRecommendations } from "../../../../packages/recommendations/src/index";
import type { StoredAnalysisRecord } from "../output-records";

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
  analysisRepository?: {
    listArtifacts(organizationId: string): Promise<EvidenceArtifactMetadata[]>;
    saveStoredAnalysis(record: StoredAnalysisRecord): Promise<StoredAnalysisRecord>;
  };
  now?: () => Date;
}

export class ComplianceEvaluationService {
  private readonly store: ProviderResourceStore;
  private readonly analysisRepository?: ComplianceEvaluationServiceOptions["analysisRepository"];
  private readonly now: () => Date;

  constructor(options: ComplianceEvaluationServiceOptions) {
    this.store = options.store;
    this.analysisRepository = options.analysisRepository;
    this.now = options.now ?? (() => new Date());
  }

  async evaluateAssessment(input: ComplianceAssessmentEvaluationInput) {
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
      countryPackWarnings
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
      defaultOwnerUserId: input.ownerUserId
    });
    await this.analysisRepository?.saveStoredAnalysis({
      organizationId: input.organizationId,
      assessmentId: input.assessmentId,
      jurisdiction: input.jurisdiction ?? catalog.jurisdiction,
      catalogVersion: catalog.catalogVersion,
      recordedAt: this.now().toISOString(),
      results,
      gaps,
      recommendations,
      readinessPlan,
      evidenceArtifacts: storedEvidenceArtifacts
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
}

const buildCountryPackWarnings = (input: ComplianceAssessmentEvaluationInput): CountryPackWarning[] => {
  if (!input.countryPack) {
    return [];
  }

  return countryPackWarningsFromStatus(input.countryPack);
};
