import type { Prisma, PrismaClient } from "@prisma/client";

import type {
  ComplianceControlResult,
  ComplianceGap,
  ComplianceResultRepository,
  ComplianceResultSet,
  ManualChecklistItemState,
  ReadinessPlan
} from "@puresoc/compliance-core";
import type { RecommendationContract } from "@puresoc/recommendations";

type ComplianceResultTransaction = Pick<
  Prisma.TransactionClient,
  | "complianceResultSnapshot"
  | "complianceControlResult"
  | "complianceGap"
  | "providerRecommendation"
  | "readinessPlan"
  | "readinessPlanItem"
>;

export type PrismaComplianceResultClient = Pick<PrismaClient, keyof ComplianceResultTransaction> & {
  $transaction<T>(callback: (tx: ComplianceResultTransaction) => Promise<T>): Promise<T>;
};

export class PrismaComplianceResultRepository
  implements ComplianceResultRepository<RecommendationContract>
{
  constructor(private readonly client: PrismaComplianceResultClient) {}

  async saveComplianceResults(
    record: ComplianceResultSet<RecommendationContract>
  ): Promise<ComplianceResultSet<RecommendationContract>> {
    const storedRecord = cloneResultSet(record);

    await this.client.$transaction(async (tx) => {
      const existingPlans = await tx.readinessPlan.findMany({
        where: scopedAssessmentWhere(record),
        select: { id: true }
      });
      const existingPlanIds = existingPlans.map((plan) => plan.id);

      if (existingPlanIds.length > 0) {
        await tx.readinessPlanItem.deleteMany({
          where: {
            organizationId: record.organizationId,
            readinessPlanId: { in: existingPlanIds }
          }
        });
      }

      await tx.providerRecommendation.deleteMany({ where: scopedAssessmentWhere(record) });
      await tx.complianceGap.deleteMany({ where: scopedAssessmentWhere(record) });
      await tx.complianceControlResult.deleteMany({ where: scopedAssessmentWhere(record) });
      await tx.readinessPlan.deleteMany({ where: scopedAssessmentWhere(record) });

      const controlResultIds = new Map<string, string>();
      for (const result of record.results) {
        const row = await tx.complianceControlResult.create({
          data: toComplianceControlResultCreate(record, result)
        });
        controlResultIds.set(controlResultKey(result.controlId, result.jurisdiction), row.id);
      }

      for (const gap of record.gaps) {
        await tx.complianceGap.create({
          data: toComplianceGapCreate(record, gap, controlResultIds)
        });
      }

      const recommendationIds = new Map<string, string>();
      for (const recommendation of record.recommendations) {
        const row = await tx.providerRecommendation.create({
          data: toProviderRecommendationCreate(record, recommendation)
        });
        recommendationIds.set(recommendation.id, row.id);
      }

      const plan = await tx.readinessPlan.create({
        data: toReadinessPlanCreate(record.readinessPlan)
      });

      for (const [index, item] of record.readinessPlan.items.entries()) {
        await tx.readinessPlanItem.create({
          data: toReadinessPlanItemCreate(record, item, plan.id, recommendationIds, index)
        });
      }

      await tx.complianceResultSnapshot.upsert({
        where: {
          organizationId_assessmentId: {
            organizationId: record.organizationId,
            assessmentId: record.assessmentId
          }
        },
        update: {
          jurisdiction: record.jurisdiction,
          catalogVersion: record.catalogVersion,
          recordedAt: toDateTime(record.recordedAt),
          resultSetJson: toJson(storedRecord)
        },
        create: {
          organizationId: record.organizationId,
          assessmentId: record.assessmentId,
          jurisdiction: record.jurisdiction,
          catalogVersion: record.catalogVersion,
          recordedAt: toDateTime(record.recordedAt),
          resultSetJson: toJson(storedRecord)
        }
      });
    });

    return storedRecord;
  }

  async findComplianceResults(input: {
    organizationId: string;
    assessmentId: string;
  }): Promise<ComplianceResultSet<RecommendationContract> | null> {
    const row = await this.client.complianceResultSnapshot.findUnique({
      where: {
        organizationId_assessmentId: {
          organizationId: input.organizationId,
          assessmentId: input.assessmentId
        }
      }
    });

    if (!row) {
      return null;
    }

    const snapshot = cloneResultSet(row.resultSetJson as unknown as ComplianceResultSet<RecommendationContract>);

    return {
      ...snapshot,
      organizationId: row.organizationId,
      assessmentId: row.assessmentId,
      jurisdiction: row.jurisdiction,
      catalogVersion: row.catalogVersion ?? undefined,
      recordedAt: row.recordedAt.toISOString()
    };
  }
}

const scopedAssessmentWhere = (record: Pick<ComplianceResultSet, "organizationId" | "assessmentId">) => ({
  organizationId: record.organizationId,
  assessmentId: record.assessmentId
});

const toComplianceControlResultCreate = (
  record: ComplianceResultSet<RecommendationContract>,
  result: ComplianceControlResult
) => ({
  organizationId: record.organizationId,
  assessmentId: record.assessmentId,
  controlId: result.controlId,
  jurisdiction: result.jurisdiction,
  status: result.status,
  confidence: result.confidence,
  providerSignalIds: result.providerSignalIds,
  evidenceArtifactIds: result.evidenceArtifactIds,
  checklistRunItemIds: result.checklistRunItemIds,
  summary: result.summary,
  evidenceCompletenessJson: toJson(result.evidenceCompleteness),
  sourceReferencesJson: toJson(result.sourceReferences),
  evaluatedAt: toDateTime(result.evaluatedAt)
});

const toComplianceGapCreate = (
  record: ComplianceResultSet<RecommendationContract>,
  gap: ComplianceGap,
  controlResultIds: ReadonlyMap<string, string>
) => ({
  organizationId: record.organizationId,
  assessmentId: record.assessmentId,
  controlResultId: controlResultIds.get(controlResultKey(gap.controlId, gap.jurisdiction)),
  controlId: gap.controlId,
  jurisdiction: gap.jurisdiction,
  status: gap.status,
  severity: gap.severity,
  findingIds: gap.findingIds,
  confidence: gap.confidence,
  summary: gap.summary,
  findingsJson: toJson(gap.findings),
  missingEvidenceJson: toJson(gap.missingEvidence),
  recommendedActionsJson: toJson(gap.recommendedActions),
  providerSignalsJson: toJson(gap.providerSignals),
  manualTaskIds: gap.manualTaskIds,
  manualTasksJson: toJson(gap.manualTasks),
  countryPackWarningsJson: toJson(gap.countryPackWarnings),
  sourceReferencesJson: toJson(gap.sourceReferences)
});

const toProviderRecommendationCreate = (
  record: ComplianceResultSet<RecommendationContract>,
  recommendation: RecommendationContract
) => ({
  organizationId: record.organizationId,
  assessmentId: record.assessmentId,
  providerKey: "puresoc",
  moduleKey: "compliance",
  controlId: recommendation.controlId,
  jurisdiction: recommendation.jurisdiction,
  sourceFindingId: uuidOrNull(recommendation.sourceFindingId),
  sourceFindingIds: recommendation.sourceFindingIds,
  manualTaskIds: recommendation.manualTaskIds,
  title: recommendation.title,
  summary: recommendation.summary,
  severity: recommendation.severity,
  confidence: recommendation.confidence,
  recommendationType: recommendation.recommendationType,
  automationMode: recommendation.automationMode,
  requiredPermissions: recommendation.requiredPermissions,
  requiredLicense: recommendation.requiredLicense,
  expectedChange: recommendation.expectedChange,
  blastRadius: recommendation.blastRadius,
  manualFallback: recommendation.manualFallback,
  evidenceRequired: recommendation.evidenceRequired,
  status: recommendation.status,
  sourceReferencesJson: toJson(recommendation.sourceReferences ?? [])
});

const toReadinessPlanCreate = (plan: ReadinessPlan) => ({
  organizationId: plan.organizationId,
  assessmentId: plan.assessmentId,
  title: plan.title,
  targetReadinessPercent: plan.targetReadinessPercent,
  status: plan.status,
  createdAt: toDateTime(plan.generatedAt)
});

const toReadinessPlanItemCreate = (
  record: ComplianceResultSet<RecommendationContract>,
  item: ReadinessPlan["items"][number],
  readinessPlanId: string,
  recommendationIds: ReadonlyMap<string, string>,
  index: number
) => ({
  organizationId: record.organizationId,
  readinessPlanId,
  controlId: item.controlId,
  providerRecommendationId: item.providerRecommendationId
    ? recommendationIds.get(item.providerRecommendationId)
    : undefined,
  jurisdiction: item.jurisdiction,
  gapSummary: item.gapSummary,
  recommendedAction: item.recommendedAction,
  actionType: item.actionType,
  ownerUserId: uuidOrNull(item.ownerUserId),
  dueDate: toDateOnly(item.dueDate),
  automationAvailable: item.automationAvailable,
  evidenceRequired: item.evidenceRequired,
  findingIds: item.findingIds,
  manualTaskIds: item.manualTaskIds,
  dependenciesJson: toJson(item.dependencies),
  status: item.status,
  legalReviewRequired: item.legalReviewRequired,
  sourceReferencesJson: toJson(item.sourceReferences),
  createdAt: toDateTime(record.recordedAt, index)
});

const controlResultKey = (controlId: string, jurisdiction: string): string => `${controlId}:${jurisdiction}`;

const toJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const cloneResultSet = <TRecommendation>(
  record: ComplianceResultSet<TRecommendation>
): ComplianceResultSet<TRecommendation> => JSON.parse(JSON.stringify(record)) as ComplianceResultSet<TRecommendation>;

const toDateTime = (value: string, offsetMs = 0): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date-time value for Prisma compliance result persistence: ${value}`);
  }

  return new Date(parsed.getTime() + offsetMs);
};

const toDateOnly = (value: string): Date => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value for Prisma readiness plan item persistence: ${value}`);
  }

  return parsed;
};

const uuidOrNull = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
};
