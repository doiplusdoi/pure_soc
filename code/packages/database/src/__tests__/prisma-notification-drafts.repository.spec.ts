import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { LEGAL_CAVEAT_MESSAGE_KEY, PURESOC_LEGAL_CAVEAT } from "@puresoc/shared";
import {
  InMemoryNotificationDraftRepository,
  PrismaNotificationDraftRepository,
  validateNotificationDraftPayloadEnvelopeContract,
  type NotificationDraftContract,
  type NotificationDraftPayloadEnvelopeContract,
  type PrismaNotificationDraftClient,
  type RoNis2NotificationDraftContract
} from "../index";

describe("PrismaNotificationDraftRepository", () => {
  it("persists generic notification envelopes and scopes reads by organization", async () => {
    const client = createFakeNotificationDraftClient();
    const repository = new PrismaNotificationDraftRepository(client);
    const organizationId = randomUUID();
    const otherOrganizationId = randomUUID();
    const draft = notificationDraftFixture({ organizationId });

    await expect(repository.saveNotificationDraft(draft)).resolves.toEqual(draft);

    expect(client.notificationDraft.rows[0]).toMatchObject({
      organizationId,
      jurisdiction: "RO",
      notificationType: "country_registration",
      status: "draft"
    });
    expect(client.notificationDraft.rows[0]?.payloadJson).toMatchObject({
      payloadSchemaKey: "ro.nis2.registration_notification.v1",
      sourceMappedFields: [
        {
          fieldKey: "notification_c9"
        }
      ]
    });

    await expect(
      repository.findNotificationDraftForOrganization({
        notificationDraftId: draft.id,
        organizationId
      })
    ).resolves.toEqual(draft);
    await expect(
      repository.findNotificationDraftForOrganization({
        notificationDraftId: draft.id,
        organizationId: otherOrganizationId
      })
    ).resolves.toBeNull();
    await expect(repository.listNotificationDraftsForOrganization({ organizationId, status: "draft" })).resolves.toEqual([
      draft
    ]);
  });

  it("persists Romania companion drafts that link to generic notification drafts", async () => {
    const client = createFakeNotificationDraftClient();
    const repository = new PrismaNotificationDraftRepository(client);
    const organizationId = randomUUID();
    const genericDraft = notificationDraftFixture({ organizationId });
    const companionDraft = roCompanionDraftFixture({
      organizationId,
      notificationDraftId: genericDraft.id,
      payload: genericDraft.payload
    });

    await repository.saveNotificationDraft(genericDraft);
    await expect(repository.saveRoNis2CompanionDraft(companionDraft)).resolves.toEqual(companionDraft);

    expect(client.roNis2NotificationDraft.rows[0]).toMatchObject({
      organizationId,
      notificationDraftId: genericDraft.id,
      legalCaveat: PURESOC_LEGAL_CAVEAT
    });
    await expect(
      repository.findRoNis2CompanionDraftForOrganization({
        organizationId,
        roDraftId: companionDraft.id
      })
    ).resolves.toEqual(companionDraft);
    await expect(
      repository.findRoNis2CompanionDraftForOrganization({
        organizationId: randomUUID(),
        roDraftId: companionDraft.id
      })
    ).resolves.toBeNull();
    await expect(
      repository.findRoNis2CompanionDraftByNotificationDraftForOrganization({
        organizationId,
        notificationDraftId: genericDraft.id
      })
    ).resolves.toEqual(companionDraft);
  });

  it("rejects malformed generic payload envelopes before writing", async () => {
    const client = createFakeNotificationDraftClient();
    const repository = new PrismaNotificationDraftRepository(client);
    const invalidPayload = {
      ...payloadEnvelopeFixture(),
      legalCaveat: "Certified compliant.",
      sourceMappedFields: []
    };
    const validation = validateNotificationDraftPayloadEnvelopeContract(invalidPayload);

    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        "legalCaveat must match the keyed PureSOC legal caveat text.",
        "sourceMappedFields must include at least one source-mapped field."
      ])
    );
    await expect(
      repository.saveNotificationDraft(
        notificationDraftFixture({
          organizationId: randomUUID(),
          payload: invalidPayload as NotificationDraftPayloadEnvelopeContract
        })
      )
    ).rejects.toThrow("Invalid notification draft payload envelope");
    expect(client.notificationDraft.rows).toHaveLength(0);
  });
});

describe("InMemoryNotificationDraftRepository", () => {
  it("matches the organization-scoped generic and Romania companion repository contract", async () => {
    const repository = new InMemoryNotificationDraftRepository();
    const organizationId = randomUUID();
    const genericDraft = notificationDraftFixture({ organizationId });
    const companionDraft = roCompanionDraftFixture({
      organizationId,
      notificationDraftId: genericDraft.id,
      payload: genericDraft.payload
    });

    await expect(repository.saveNotificationDraft(genericDraft)).resolves.toEqual(genericDraft);
    await expect(repository.saveRoNis2CompanionDraft(companionDraft)).resolves.toEqual(companionDraft);

    await expect(
      repository.findNotificationDraftForOrganization({
        organizationId,
        notificationDraftId: genericDraft.id
      })
    ).resolves.toEqual(genericDraft);
    await expect(repository.listNotificationDraftsForOrganization({ organizationId, jurisdiction: "RO" })).resolves.toEqual([
      genericDraft
    ]);
    await expect(
      repository.findRoNis2CompanionDraftByNotificationDraftForOrganization({
        organizationId,
        notificationDraftId: genericDraft.id
      })
    ).resolves.toEqual(companionDraft);
    await expect(
      repository.findNotificationDraftForOrganization({
        organizationId: randomUUID(),
        notificationDraftId: genericDraft.id
      })
    ).resolves.toBeNull();
  });

  it("rejects malformed envelopes before mutating the in-memory store", async () => {
    const repository = new InMemoryNotificationDraftRepository();
    const organizationId = randomUUID();
    const invalid = notificationDraftFixture({
      organizationId,
      payload: {
        ...payloadEnvelopeFixture(),
        sourceMappedFields: []
      } as NotificationDraftPayloadEnvelopeContract
    });

    await expect(repository.saveNotificationDraft(invalid)).rejects.toThrow("Invalid notification draft payload envelope");
    await expect(repository.listNotificationDraftsForOrganization({ organizationId })).resolves.toEqual([]);
  });
});

const notificationDraftFixture = (input: {
  organizationId: string;
  payload?: NotificationDraftPayloadEnvelopeContract;
}): NotificationDraftContract => ({
  id: randomUUID(),
  organizationId: input.organizationId,
  assessmentId: randomUUID(),
  jurisdiction: "RO",
  notificationType: "country_registration",
  status: "draft",
  payload: input.payload ?? payloadEnvelopeFixture(),
  sourceReferences: ["ro-workbook-notification-form"],
  createdAt: "2026-05-01T09:00:00.000Z",
  updatedAt: "2026-05-01T09:00:00.000Z"
});

const roCompanionDraftFixture = (input: {
  notificationDraftId: string;
  organizationId: string;
  payload: NotificationDraftPayloadEnvelopeContract;
}): RoNis2NotificationDraftContract => ({
  id: randomUUID(),
  organizationId: input.organizationId,
  assessmentId: randomUUID(),
  onboardingProgressId: randomUUID(),
  classificationRunId: randomUUID(),
  notificationDraftId: input.notificationDraftId,
  status: "draft",
  payload: input.payload,
  sourceReferences: ["ro-workbook-notification-form"],
  legalCaveat: PURESOC_LEGAL_CAVEAT,
  createdBy: randomUUID(),
  createdAt: "2026-05-01T09:00:00.000Z",
  updatedAt: "2026-05-01T09:00:00.000Z"
});

const payloadEnvelopeFixture = (): NotificationDraftPayloadEnvelopeContract => ({
  frameworkKey: "nis2",
  jurisdiction: "RO",
  legalCaveat: PURESOC_LEGAL_CAVEAT,
  legalCaveatFallbackUsed: false,
  legalCaveatLocale: "en",
  legalCaveatMessageKey: LEGAL_CAVEAT_MESSAGE_KEY,
  locale: "en",
  notificationType: "country_registration",
  payload: {
    entityName: "Example SA"
  },
  payloadSchemaKey: "ro.nis2.registration_notification.v1",
  payloadSchemaVersion: "1.0.0",
  sourceMappedFields: [
    {
      fieldKey: "notification_c9",
      label: {
        locale: "en",
        messageKey: "country_pack.ro.nis2.notification.notification_c9.label",
        sourceMapId: "ro-nis2-notification_draft_mapping-notification_c9",
        text: "Name of the entity"
      },
      sourceMapId: "ro-nis2-notification_draft_mapping-notification_c9",
      sourceReferences: [{ cell: "D12", sheet: "Entity data" }],
      value: "Example SA"
    }
  ],
  sourceReferences: [{ cell: "D12", sheet: "Entity data" }]
});

const createFakeNotificationDraftClient = (): PrismaNotificationDraftClient & {
  notificationDraft: ReturnType<typeof createDelegate>;
  roNis2NotificationDraft: ReturnType<typeof createDelegate>;
} => {
  const client = {
    notificationDraft: createDelegate(),
    roNis2NotificationDraft: createDelegate()
  };

  return client as unknown as PrismaNotificationDraftClient & typeof client;
};

const createDelegate = <TRow extends Record<string, unknown>>() => {
  const rows: TRow[] = [];

  return {
    rows,
    async upsert(args: Record<string, unknown>) {
      const where = args.where as { id: string };
      const existingIndex = rows.findIndex((row) => row.id === where.id);
      const data = (existingIndex >= 0 ? args.update : args.create) as TRow;
      if (existingIndex >= 0) {
        rows[existingIndex] = {
          ...rows[existingIndex],
          ...data
        };
        return rows[existingIndex];
      }
      rows.push(data);
      return data;
    },
    async findFirst(args: Record<string, unknown>) {
      return rows.find((row) => matchesWhere(row, args.where as Record<string, unknown> | undefined)) ?? null;
    },
    async findMany(args?: Record<string, unknown>) {
      const where = args?.where as Record<string, unknown> | undefined;
      const orderBy = args?.orderBy as Record<string, "asc" | "desc"> | undefined;
      return rows.filter((row) => matchesWhere(row, where)).sort((left, right) => sortRows(left, right, orderBy));
    }
  };
};

const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean =>
  Object.entries(where ?? {}).every(([key, value]) => row[key] === value);

const sortRows = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  orderBy: Record<string, "asc" | "desc"> | undefined
): number => {
  const [key, direction] = Object.entries(orderBy ?? {})[0] ?? [];
  if (!key || !direction) {
    return 0;
  }

  const leftValue = String(left[key] ?? "");
  const rightValue = String(right[key] ?? "");
  return direction === "asc" ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue);
};
