import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  InMemoryRoNis2ReadinessRepository,
  PrismaRoNis2ReadinessRepository,
  type PrismaRoNis2ReadinessClient,
  type RoNis2ClassificationRunRecord,
  type RoNis2OnboardingProgressRecord
} from "../index";

describe("RoNis2ReadinessRepository", () => {
  it("persists Romania onboarding progress and classification runs through the Prisma boundary", async () => {
    const client = createFakeRoNis2ReadinessClient();
    const repository = new PrismaRoNis2ReadinessRepository(client);
    const organizationId = randomUUID();
    const progress = progressFixture({ organizationId });
    const classification = classificationFixture({
      organizationId,
      onboardingProgressId: progress.id
    });

    await expect(repository.saveOnboardingProgress(progress)).resolves.toEqual(progress);
    await expect(repository.findLatestOnboardingProgressForOrganization(organizationId)).resolves.toEqual(progress);
    await expect(
      repository.findOnboardingProgressForOrganization({
        organizationId: randomUUID(),
        onboardingProgressId: progress.id
      })
    ).resolves.toBeNull();

    await expect(repository.saveClassificationRun(classification)).resolves.toEqual(classification);
    await expect(
      repository.findLatestClassificationRunForOrganization({
        organizationId,
        onboardingProgressId: progress.id
      })
    ).resolves.toEqual(classification);
    expect(client.roNis2ClassificationRun.rows[0]?.sourceReferencesJson).toMatchObject({
      sourceMapLinks: [
        {
          sourceMapId: "ro-nis2-classification-rule"
        }
      ]
    });
  });

  it("keeps memory mode organization-scoped and deterministic", async () => {
    const repository = new InMemoryRoNis2ReadinessRepository();
    const organizationId = randomUUID();
    const otherOrganizationId = randomUUID();
    const progress = progressFixture({ organizationId });
    const otherProgress = progressFixture({
      organizationId: otherOrganizationId,
      updatedAt: "2026-05-04T08:30:00.000Z"
    });

    await repository.saveOnboardingProgress(progress);
    await repository.saveOnboardingProgress(otherProgress);

    await expect(repository.findLatestOnboardingProgressForOrganization(organizationId)).resolves.toEqual(progress);
    await expect(repository.findLatestOnboardingProgressForOrganization(otherOrganizationId)).resolves.toEqual(otherProgress);
  });
});

const progressFixture = (input: {
  organizationId: string;
  updatedAt?: string;
}): RoNis2OnboardingProgressRecord => ({
  id: randomUUID(),
  organizationId: input.organizationId,
  assessmentId: randomUUID(),
  answers: {
    entity: {
      legalName: "Repository Test SRL"
    }
  },
  completedSteps: ["organization_identity"],
  currentStep: "services",
  frameworkKey: "nis2",
  jurisdiction: "RO",
  missingRequiredFields: ["answers.selectedServiceTypeCodes"],
  savedAt: input.updatedAt ?? "2026-05-04T08:00:00.000Z",
  savedBy: randomUUID(),
  sourceMapLinks: [
    {
      sourceMapId: "ro-nis2-entity-name"
    }
  ],
  sourceVersion: "Entity data V2.1 ENG_45915; Entity assessment V2.0_45898",
  status: "in_progress",
  createdAt: "2026-05-04T08:00:00.000Z",
  updatedAt: input.updatedAt ?? "2026-05-04T08:00:00.000Z"
});

const classificationFixture = (input: {
  onboardingProgressId: string;
  organizationId: string;
}): RoNis2ClassificationRunRecord => ({
  id: randomUUID(),
  organizationId: input.organizationId,
  assessmentId: randomUUID(),
  onboardingProgressId: input.onboardingProgressId,
  input: {
    selectedServiceTypeCodes: ["108004"]
  },
  result: "important_entity",
  article9Required: false,
  notificationRecommended: true,
  reasons: ["Cloud service provider matched Romania workbook rule."],
  matchedRules: ["classification_rule_8"],
  missingRequiredFields: [],
  reasonSourceMapLinks: [],
  sourceMapLinks: [
    {
      sourceMapId: "ro-nis2-classification-rule"
    }
  ],
  sourceVersion: "Entity data V2.1 ENG_45915; Entity assessment V2.0_45898",
  classifiedAt: "2026-05-04T08:05:00.000Z"
});

const createFakeRoNis2ReadinessClient = () => {
  const onboarding = new FakeOnboardingProgressDelegate();
  const classification = new FakeClassificationRunDelegate();

  return {
    roNis2ClassificationRun: classification,
    roNis2OnboardingProgress: onboarding
  } as unknown as PrismaRoNis2ReadinessClient & {
    roNis2ClassificationRun: FakeClassificationRunDelegate;
    roNis2OnboardingProgress: FakeOnboardingProgressDelegate;
  };
};

class FakeOnboardingProgressDelegate {
  readonly rows: Record<string, unknown>[] = [];

  async upsert(args: Record<string, unknown>) {
    const data = ((args.update as Record<string, unknown>) ?? args.create) as Record<string, unknown>;
    const id = data.id as string;
    const existingIndex = this.rows.findIndex((row) => row.id === id);
    const row = {
      ...data,
      createdAt: data.createdAt as Date,
      updatedAt: data.updatedAt as Date
    };
    if (existingIndex >= 0) {
      this.rows[existingIndex] = row;
    } else {
      this.rows.push(row);
    }
    return row;
  }

  async findFirst(args: Record<string, unknown>) {
    const where = (args.where ?? {}) as Record<string, unknown>;
    return (
      this.rows
        .filter((row) => matchesWhere(row, where))
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))[0] ?? null
    );
  }
}

class FakeClassificationRunDelegate {
  readonly rows: Record<string, unknown>[] = [];

  async create(args: Record<string, unknown>) {
    const row = (args.data ?? {}) as Record<string, unknown>;
    this.rows.push(row);
    return row;
  }

  async findFirst(args: Record<string, unknown>) {
    const where = (args.where ?? {}) as Record<string, unknown>;
    return (
      this.rows
        .filter((row) => matchesWhere(row, where))
        .sort((left, right) => String(right.classifiedAt).localeCompare(String(left.classifiedAt)))[0] ?? null
    );
  }
}

const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown>): boolean =>
  Object.entries(where).every((entry) => {
    const [key, value] = entry;
    return value === undefined || row[key] === value;
  });
