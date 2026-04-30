import type {
  ComplianceControlResult,
  ComplianceGap,
  ManualChecklistItemState,
  ReadinessPlan
} from "./types";

export interface ComplianceResultSet<TRecommendation = unknown> {
  organizationId: string;
  assessmentId: string;
  jurisdiction: string;
  catalogVersion?: string;
  recordedAt: string;
  results: ComplianceControlResult[];
  gaps: ComplianceGap[];
  recommendations: TRecommendation[];
  readinessPlan: ReadinessPlan;
  checklistItems: ManualChecklistItemState[];
}

export interface ComplianceResultRepository<TRecommendation = unknown> {
  saveComplianceResults(record: ComplianceResultSet<TRecommendation>): Promise<ComplianceResultSet<TRecommendation>>;
  findComplianceResults(input: {
    organizationId: string;
    assessmentId: string;
  }): Promise<ComplianceResultSet<TRecommendation> | null>;
}

export class InMemoryComplianceResultRepository<TRecommendation = unknown>
  implements ComplianceResultRepository<TRecommendation>
{
  private readonly records = new Map<string, ComplianceResultSet<TRecommendation>>();

  constructor(initialRecords: readonly ComplianceResultSet<TRecommendation>[] = []) {
    for (const record of initialRecords) {
      this.records.set(resultKey(record.organizationId, record.assessmentId), cloneResultSet(record));
    }
  }

  async saveComplianceResults(
    record: ComplianceResultSet<TRecommendation>
  ): Promise<ComplianceResultSet<TRecommendation>> {
    const stored = cloneResultSet(record);
    this.records.set(resultKey(record.organizationId, record.assessmentId), stored);
    return cloneResultSet(stored);
  }

  async findComplianceResults(input: {
    organizationId: string;
    assessmentId: string;
  }): Promise<ComplianceResultSet<TRecommendation> | null> {
    const record = this.records.get(resultKey(input.organizationId, input.assessmentId));
    return record ? cloneResultSet(record) : null;
  }
}

const resultKey = (organizationId: string, assessmentId: string): string => `${organizationId}:${assessmentId}`;

const cloneResultSet = <TRecommendation>(
  record: ComplianceResultSet<TRecommendation>
): ComplianceResultSet<TRecommendation> => JSON.parse(JSON.stringify(record)) as ComplianceResultSet<TRecommendation>;
