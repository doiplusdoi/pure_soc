type DelegateArgs = Record<string, unknown>;

interface OnboardingProgressDelegate<TRow> {
  findFirst(args: DelegateArgs): Promise<TRow | null>;
  upsert(args: DelegateArgs): Promise<TRow>;
}

interface ClassificationRunDelegate<TRow> {
  create(args: DelegateArgs): Promise<TRow>;
  findFirst(args: DelegateArgs): Promise<TRow | null>;
}

export interface Nis2OnboardingProgressRecord {
  id: string;
  organizationId: string;
  assessmentId?: string;
  answers: Record<string, unknown>;
  completedScreens: string[];
  countryCode: string;
  currentScreen: string;
  missingRequiredFields: string[];
  savedBy?: string;
  sourceReferences: Record<string, unknown>[];
  sourceVersion: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Nis2ClassificationRunRecord {
  id: string;
  organizationId: string;
  assessmentId?: string;
  onboardingProgressId?: string;
  countryCode: string;
  input: Record<string, unknown>;
  result: string;
  confidence: "low" | "medium" | "high";
  legalReviewRequired: boolean;
  explanation: string;
  assumptions: string[];
  matchedRules: string[];
  missingInformation: string[];
  legalBasisReferences: Record<string, unknown>[];
  sourceVersion: string;
  classifiedAt: string;
}

type Nis2OnboardingProgressRow = Omit<
  Nis2OnboardingProgressRecord,
  "answers" | "assessmentId" | "createdAt" | "savedBy" | "sourceReferences" | "updatedAt"
> & {
  answersJson: unknown;
  assessmentId?: string | null;
  createdAt: Date | string;
  savedBy?: string | null;
  sourceReferencesJson?: unknown;
  updatedAt: Date | string;
};

type Nis2ClassificationRunRow = Omit<
  Nis2ClassificationRunRecord,
  | "assessmentId"
  | "assumptions"
  | "classifiedAt"
  | "input"
  | "legalBasisReferences"
  | "matchedRules"
  | "onboardingProgressId"
> & {
  assessmentId?: string | null;
  assumptionsJson?: unknown;
  classifiedAt: Date | string;
  inputJson: unknown;
  legalBasisJson?: unknown;
  matchedRulesJson?: unknown;
  onboardingProgressId?: string | null;
};

export interface Nis2OnboardingRepository {
  findLatestClassificationRunForOrganization(input: {
    countryCode?: string;
    onboardingProgressId?: string;
    organizationId: string;
  }): Promise<Nis2ClassificationRunRecord | null>;
  findLatestOnboardingProgressForOrganization(input: {
    countryCode?: string;
    organizationId: string;
  }): Promise<Nis2OnboardingProgressRecord | null>;
  findOnboardingProgressForOrganization(input: {
    onboardingProgressId: string;
    organizationId: string;
  }): Promise<Nis2OnboardingProgressRecord | null>;
  saveClassificationRun(record: Nis2ClassificationRunRecord): Promise<Nis2ClassificationRunRecord>;
  saveOnboardingProgress(record: Nis2OnboardingProgressRecord): Promise<Nis2OnboardingProgressRecord>;
}

export interface PrismaNis2OnboardingClient {
  nis2ClassificationRun: ClassificationRunDelegate<Nis2ClassificationRunRow>;
  nis2OnboardingProgress: OnboardingProgressDelegate<Nis2OnboardingProgressRow>;
}

export class InMemoryNis2OnboardingRepository implements Nis2OnboardingRepository {
  private readonly classificationRuns = new Map<string, Nis2ClassificationRunRecord>();
  private readonly onboardingProgress = new Map<string, Nis2OnboardingProgressRecord>();

  async saveOnboardingProgress(record: Nis2OnboardingProgressRecord): Promise<Nis2OnboardingProgressRecord> {
    const saved = clone(record);
    this.onboardingProgress.set(saved.id, saved);
    return clone(saved);
  }

  async findOnboardingProgressForOrganization(input: {
    onboardingProgressId: string;
    organizationId: string;
  }): Promise<Nis2OnboardingProgressRecord | null> {
    const record = this.onboardingProgress.get(input.onboardingProgressId);
    return record && record.organizationId === input.organizationId ? clone(record) : null;
  }

  async findLatestOnboardingProgressForOrganization(input: {
    countryCode?: string;
    organizationId: string;
  }): Promise<Nis2OnboardingProgressRecord | null> {
    const countryCode = input.countryCode?.trim().toUpperCase();
    const record =
      [...this.onboardingProgress.values()]
        .filter(
          (candidate) =>
            candidate.organizationId === input.organizationId &&
            (countryCode === undefined || candidate.countryCode === countryCode)
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;

    return record ? clone(record) : null;
  }

  async saveClassificationRun(record: Nis2ClassificationRunRecord): Promise<Nis2ClassificationRunRecord> {
    const saved = clone(record);
    this.classificationRuns.set(saved.id, saved);
    return clone(saved);
  }

  async findLatestClassificationRunForOrganization(input: {
    countryCode?: string;
    onboardingProgressId?: string;
    organizationId: string;
  }): Promise<Nis2ClassificationRunRecord | null> {
    const countryCode = input.countryCode?.trim().toUpperCase();
    const record =
      [...this.classificationRuns.values()]
        .filter(
          (candidate) =>
            candidate.organizationId === input.organizationId &&
            (countryCode === undefined || candidate.countryCode === countryCode) &&
            (input.onboardingProgressId === undefined || candidate.onboardingProgressId === input.onboardingProgressId)
        )
        .sort((left, right) => right.classifiedAt.localeCompare(left.classifiedAt))[0] ?? null;

    return record ? clone(record) : null;
  }
}

export class PrismaNis2OnboardingRepository implements Nis2OnboardingRepository {
  constructor(private readonly client: PrismaNis2OnboardingClient) {}

  async saveOnboardingProgress(record: Nis2OnboardingProgressRecord): Promise<Nis2OnboardingProgressRecord> {
    const row = await this.client.nis2OnboardingProgress.upsert({
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
  }): Promise<Nis2OnboardingProgressRecord | null> {
    const row = await this.client.nis2OnboardingProgress.findFirst({
      where: {
        id: input.onboardingProgressId,
        organizationId: input.organizationId
      }
    });

    return row ? fromOnboardingProgressRow(row) : null;
  }

  async findLatestOnboardingProgressForOrganization(input: {
    countryCode?: string;
    organizationId: string;
  }): Promise<Nis2OnboardingProgressRecord | null> {
    const row = await this.client.nis2OnboardingProgress.findFirst({
      where: stripUndefined({
        countryCode: input.countryCode?.trim().toUpperCase(),
        organizationId: input.organizationId
      }),
      orderBy: {
        updatedAt: "desc"
      }
    });

    return row ? fromOnboardingProgressRow(row) : null;
  }

  async saveClassificationRun(record: Nis2ClassificationRunRecord): Promise<Nis2ClassificationRunRecord> {
    const row = await this.client.nis2ClassificationRun.create({
      data: toClassificationRunData(record)
    });

    return fromClassificationRunRow(row);
  }

  async findLatestClassificationRunForOrganization(input: {
    countryCode?: string;
    onboardingProgressId?: string;
    organizationId: string;
  }): Promise<Nis2ClassificationRunRecord | null> {
    const row = await this.client.nis2ClassificationRun.findFirst({
      where: stripUndefined({
        countryCode: input.countryCode?.trim().toUpperCase(),
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

const toOnboardingProgressData = (record: Nis2OnboardingProgressRecord): Record<string, unknown> =>
  stripUndefined({
    id: record.id,
    organizationId: record.organizationId,
    assessmentId: uuidOrNull(record.assessmentId),
    countryCode: record.countryCode,
    status: record.status,
    currentScreen: record.currentScreen,
    completedScreens: record.completedScreens,
    answersJson: clone(record.answers),
    sourceVersion: record.sourceVersion,
    sourceReferencesJson: clone(record.sourceReferences),
    missingRequiredFields: record.missingRequiredFields,
    savedBy: uuidOrNull(record.savedBy),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  });

const toClassificationRunData = (record: Nis2ClassificationRunRecord): Record<string, unknown> =>
  stripUndefined({
    id: record.id,
    organizationId: record.organizationId,
    assessmentId: uuidOrNull(record.assessmentId),
    onboardingProgressId: uuidOrNull(record.onboardingProgressId),
    countryCode: record.countryCode,
    result: record.result,
    confidence: record.confidence,
    legalReviewRequired: record.legalReviewRequired,
    inputJson: clone(record.input),
    explanation: record.explanation,
    assumptionsJson: record.assumptions,
    matchedRulesJson: record.matchedRules,
    missingInformation: record.missingInformation,
    legalBasisJson: clone(record.legalBasisReferences),
    sourceVersion: record.sourceVersion,
    classifiedAt: new Date(record.classifiedAt)
  });

const fromOnboardingProgressRow = (row: Nis2OnboardingProgressRow): Nis2OnboardingProgressRecord => ({
  id: row.id,
  organizationId: row.organizationId,
  assessmentId: row.assessmentId ?? undefined,
  answers: isRecord(row.answersJson) ? clone(row.answersJson) : {},
  completedScreens: row.completedScreens.filter(isString),
  countryCode: row.countryCode,
  currentScreen: row.currentScreen,
  missingRequiredFields: row.missingRequiredFields.filter(isString),
  savedBy: row.savedBy ?? undefined,
  sourceReferences: arrayOfRecords(row.sourceReferencesJson),
  sourceVersion: row.sourceVersion,
  status: row.status,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt)
});

const fromClassificationRunRow = (row: Nis2ClassificationRunRow): Nis2ClassificationRunRecord => ({
  id: row.id,
  organizationId: row.organizationId,
  assessmentId: row.assessmentId ?? undefined,
  onboardingProgressId: row.onboardingProgressId ?? undefined,
  countryCode: row.countryCode,
  input: isRecord(row.inputJson) ? clone(row.inputJson) : {},
  result: row.result,
  confidence: normalizeConfidence(row.confidence),
  legalReviewRequired: row.legalReviewRequired,
  explanation: row.explanation,
  assumptions: arrayOfStrings(row.assumptionsJson),
  matchedRules: arrayOfStrings(row.matchedRulesJson),
  missingInformation: row.missingInformation.filter(isString),
  legalBasisReferences: arrayOfRecords(row.legalBasisJson),
  sourceVersion: row.sourceVersion,
  classifiedAt: toIso(row.classifiedAt)
});

const arrayOfRecords = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord).map(clone) : [];

const arrayOfStrings = (value: unknown): string[] => (Array.isArray(value) ? value.filter(isString) : []);

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const isString = (value: unknown): value is string => typeof value === "string";

const normalizeConfidence = (value: string): "low" | "medium" | "high" =>
  value === "high" || value === "medium" || value === "low" ? value : "low";

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
