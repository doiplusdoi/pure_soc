type DelegateArgs = Record<string, unknown>;

interface OnboardingProgressDelegate<TRow> {
  findFirst(args: DelegateArgs): Promise<TRow | null>;
  upsert(args: DelegateArgs): Promise<TRow>;
}

interface ClassificationRunDelegate<TRow> {
  create(args: DelegateArgs): Promise<TRow>;
  findFirst(args: DelegateArgs): Promise<TRow | null>;
}

export interface RoNis2OnboardingProgressRecord {
  id: string;
  organizationId: string;
  assessmentId?: string;
  businessProfileId?: string;
  answers: Record<string, unknown>;
  completedSteps: string[];
  currentStep: string;
  frameworkKey: "nis2";
  jurisdiction: "RO";
  missingRequiredFields: string[];
  savedAt: string;
  savedBy?: string;
  sourceMapLinks: Record<string, unknown>[];
  sourceVersion: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoNis2ClassificationRunRecord {
  id: string;
  organizationId: string;
  assessmentId?: string;
  onboardingProgressId?: string;
  input: Record<string, unknown>;
  result: string;
  article9Required: boolean;
  notificationRecommended: boolean;
  reasons: string[];
  matchedRules: string[];
  missingRequiredFields: string[];
  reasonSourceMapLinks: Record<string, unknown>[];
  sourceMapLinks: Record<string, unknown>[];
  sourceVersion: string;
  classifiedAt: string;
}

type RoNis2OnboardingProgressRow = Omit<
  RoNis2OnboardingProgressRecord,
  "answers" | "assessmentId" | "businessProfileId" | "createdAt" | "savedAt" | "savedBy" | "sourceMapLinks" | "updatedAt"
> & {
  answersJson: unknown;
  assessmentId?: string | null;
  businessProfileId?: string | null;
  createdAt: Date | string;
  savedAt?: Date | string | null;
  savedBy?: string | null;
  sourceReferencesJson?: unknown;
  updatedAt: Date | string;
};

type RoNis2ClassificationRunRow = Omit<
  RoNis2ClassificationRunRecord,
  | "assessmentId"
  | "classifiedAt"
  | "input"
  | "matchedRules"
  | "onboardingProgressId"
  | "reasonSourceMapLinks"
  | "reasons"
  | "sourceMapLinks"
> & {
  assessmentId?: string | null;
  classifiedAt: Date | string;
  inputJson: unknown;
  matchedRulesJson?: unknown;
  onboardingProgressId?: string | null;
  reasonsJson?: unknown;
  sourceReferencesJson?: unknown;
};

export interface RoNis2ReadinessRepository {
  findLatestClassificationRunForOrganization(input: {
    onboardingProgressId?: string;
    organizationId: string;
  }): Promise<RoNis2ClassificationRunRecord | null>;
  findLatestOnboardingProgressForOrganization(organizationId: string): Promise<RoNis2OnboardingProgressRecord | null>;
  findOnboardingProgressForOrganization(input: {
    onboardingProgressId: string;
    organizationId: string;
  }): Promise<RoNis2OnboardingProgressRecord | null>;
  saveClassificationRun(record: RoNis2ClassificationRunRecord): Promise<RoNis2ClassificationRunRecord>;
  saveOnboardingProgress(record: RoNis2OnboardingProgressRecord): Promise<RoNis2OnboardingProgressRecord>;
}

export interface PrismaRoNis2ReadinessClient {
  roNis2ClassificationRun: ClassificationRunDelegate<RoNis2ClassificationRunRow>;
  roNis2OnboardingProgress: OnboardingProgressDelegate<RoNis2OnboardingProgressRow>;
}

export class InMemoryRoNis2ReadinessRepository implements RoNis2ReadinessRepository {
  private readonly classificationRuns = new Map<string, RoNis2ClassificationRunRecord>();
  private readonly onboardingProgress = new Map<string, RoNis2OnboardingProgressRecord>();

  async saveOnboardingProgress(record: RoNis2OnboardingProgressRecord): Promise<RoNis2OnboardingProgressRecord> {
    const saved = clone(record);
    this.onboardingProgress.set(saved.id, saved);
    return clone(saved);
  }

  async findOnboardingProgressForOrganization(input: {
    onboardingProgressId: string;
    organizationId: string;
  }): Promise<RoNis2OnboardingProgressRecord | null> {
    const record = this.onboardingProgress.get(input.onboardingProgressId);
    return record && record.organizationId === input.organizationId ? clone(record) : null;
  }

  async findLatestOnboardingProgressForOrganization(organizationId: string): Promise<RoNis2OnboardingProgressRecord | null> {
    const record =
      [...this.onboardingProgress.values()]
        .filter((candidate) => candidate.organizationId === organizationId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;

    return record ? clone(record) : null;
  }

  async saveClassificationRun(record: RoNis2ClassificationRunRecord): Promise<RoNis2ClassificationRunRecord> {
    const saved = clone(record);
    this.classificationRuns.set(saved.id, saved);
    return clone(saved);
  }

  async findLatestClassificationRunForOrganization(input: {
    onboardingProgressId?: string;
    organizationId: string;
  }): Promise<RoNis2ClassificationRunRecord | null> {
    const record =
      [...this.classificationRuns.values()]
        .filter(
          (candidate) =>
            candidate.organizationId === input.organizationId &&
            (input.onboardingProgressId === undefined || candidate.onboardingProgressId === input.onboardingProgressId)
        )
        .sort((left, right) => right.classifiedAt.localeCompare(left.classifiedAt))[0] ?? null;

    return record ? clone(record) : null;
  }
}

export class PrismaRoNis2ReadinessRepository implements RoNis2ReadinessRepository {
  constructor(private readonly client: PrismaRoNis2ReadinessClient) {}

  async saveOnboardingProgress(record: RoNis2OnboardingProgressRecord): Promise<RoNis2OnboardingProgressRecord> {
    const row = await this.client.roNis2OnboardingProgress.upsert({
      where: {
        id: record.id
      },
      update: toOnboardingProgressData(record),
      create: toOnboardingProgressData(record)
    });

    return fromOnboardingProgressRow(row);
  }

  async findOnboardingProgressForOrganization(input: {
    onboardingProgressId: string;
    organizationId: string;
  }): Promise<RoNis2OnboardingProgressRecord | null> {
    const row = await this.client.roNis2OnboardingProgress.findFirst({
      where: {
        id: input.onboardingProgressId,
        organizationId: input.organizationId
      }
    });

    return row ? fromOnboardingProgressRow(row) : null;
  }

  async findLatestOnboardingProgressForOrganization(organizationId: string): Promise<RoNis2OnboardingProgressRecord | null> {
    const row = await this.client.roNis2OnboardingProgress.findFirst({
      where: {
        organizationId
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return row ? fromOnboardingProgressRow(row) : null;
  }

  async saveClassificationRun(record: RoNis2ClassificationRunRecord): Promise<RoNis2ClassificationRunRecord> {
    const row = await this.client.roNis2ClassificationRun.create({
      data: toClassificationRunData(record)
    });

    return fromClassificationRunRow(row);
  }

  async findLatestClassificationRunForOrganization(input: {
    onboardingProgressId?: string;
    organizationId: string;
  }): Promise<RoNis2ClassificationRunRecord | null> {
    const row = await this.client.roNis2ClassificationRun.findFirst({
      where: stripUndefined({
        onboardingProgressId: input.onboardingProgressId,
        organizationId: input.organizationId
      }),
      orderBy: {
        classifiedAt: "desc"
      }
    });

    return row ? fromClassificationRunRow(row) : null;
  }
}

const toOnboardingProgressData = (record: RoNis2OnboardingProgressRecord): Record<string, unknown> =>
  stripUndefined({
    id: record.id,
    organizationId: record.organizationId,
    assessmentId: uuidOrNull(record.assessmentId),
    businessProfileId: uuidOrNull(record.businessProfileId),
    status: record.status,
    currentStep: record.currentStep,
    completedSteps: record.completedSteps,
    answersJson: clone(record.answers),
    sourceVersion: record.sourceVersion,
    sourceReferencesJson: clone(record.sourceMapLinks),
    missingRequiredFields: record.missingRequiredFields,
    savedBy: uuidOrNull(record.savedBy),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  });

const toClassificationRunData = (record: RoNis2ClassificationRunRecord): Record<string, unknown> =>
  stripUndefined({
    id: record.id,
    organizationId: record.organizationId,
    assessmentId: uuidOrNull(record.assessmentId),
    onboardingProgressId: uuidOrNull(record.onboardingProgressId),
    result: record.result,
    article9Required: record.article9Required,
    notificationRecommended: record.notificationRecommended,
    inputJson: clone(record.input),
    reasonsJson: record.reasons,
    matchedRulesJson: record.matchedRules,
    missingRequiredFields: record.missingRequiredFields,
    sourceVersion: record.sourceVersion,
    sourceReferencesJson: {
      reasonSourceMapLinks: record.reasonSourceMapLinks,
      sourceMapLinks: record.sourceMapLinks
    },
    classifiedAt: new Date(record.classifiedAt)
  });

const fromOnboardingProgressRow = (row: RoNis2OnboardingProgressRow): RoNis2OnboardingProgressRecord => ({
  id: row.id,
  organizationId: row.organizationId,
  assessmentId: row.assessmentId ?? undefined,
  businessProfileId: row.businessProfileId ?? undefined,
  answers: isRecord(row.answersJson) ? clone(row.answersJson) : {},
  completedSteps: row.completedSteps.filter(isString),
  currentStep: row.currentStep,
  frameworkKey: "nis2",
  jurisdiction: "RO",
  missingRequiredFields: row.missingRequiredFields.filter(isString),
  savedAt: row.savedAt ? toIso(row.savedAt) : toIso(row.updatedAt),
  savedBy: row.savedBy ?? undefined,
  sourceMapLinks: arrayOfRecords(row.sourceReferencesJson),
  sourceVersion: row.sourceVersion,
  status: row.status,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt)
});

const fromClassificationRunRow = (row: RoNis2ClassificationRunRow): RoNis2ClassificationRunRecord => {
  const sourceReferences = parseClassificationSourceReferences(row.sourceReferencesJson);

  return {
    id: row.id,
    organizationId: row.organizationId,
    assessmentId: row.assessmentId ?? undefined,
    onboardingProgressId: row.onboardingProgressId ?? undefined,
    input: isRecord(row.inputJson) ? clone(row.inputJson) : {},
    result: row.result,
    article9Required: row.article9Required,
    notificationRecommended: row.notificationRecommended,
    reasons: arrayOfStrings(row.reasonsJson),
    matchedRules: arrayOfStrings(row.matchedRulesJson),
    missingRequiredFields: row.missingRequiredFields.filter(isString),
    reasonSourceMapLinks: sourceReferences.reasonSourceMapLinks,
    sourceMapLinks: sourceReferences.sourceMapLinks,
    sourceVersion: row.sourceVersion,
    classifiedAt: toIso(row.classifiedAt)
  };
};

const parseClassificationSourceReferences = (
  value: unknown
): { reasonSourceMapLinks: Record<string, unknown>[]; sourceMapLinks: Record<string, unknown>[] } => {
  if (Array.isArray(value)) {
    return {
      reasonSourceMapLinks: [],
      sourceMapLinks: value.filter(isRecord).map(clone)
    };
  }

  if (!isRecord(value)) {
    return {
      reasonSourceMapLinks: [],
      sourceMapLinks: []
    };
  }

  return {
    reasonSourceMapLinks: arrayOfRecords(value.reasonSourceMapLinks),
    sourceMapLinks: arrayOfRecords(value.sourceMapLinks)
  };
};

const arrayOfRecords = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord).map(clone) : [];

const arrayOfStrings = (value: unknown): string[] => (Array.isArray(value) ? value.filter(isString) : []);

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const isString = (value: unknown): value is string => typeof value === "string";

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;

const toIso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());

const uuidOrNull = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
};
