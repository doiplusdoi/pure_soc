import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  checkPrismaContractDrift,
  defaultPrismaDriftExpectations,
  formatPrismaContractDriftResult,
  parsePrismaModels
} from "../scripts/check-schema-contract-drift";
import {
  checkRoNis2GeneratedDataDrift,
  compareGeneratedArtifactText,
  formatGeneratedDataDriftResult
} from "../scripts/check-generated-regulatory-drift";

describe("schema and generated-data drift checks", () => {
  it("parses Prisma model fields with type, list, optional, and mapped column metadata", () => {
    const models = parsePrismaModels(`
model Example {
  id        String   @id @default(uuid()) @db.Uuid
  tags      String[] @map("tag_values")
  payload   Json?    @map("payload_json")

  @@map("examples")
}
`);

    const example = models.get("Example");
    expect(example?.tableName).toBe("examples");
    expect(example?.fields.get("tags")).toMatchObject({
      isList: true,
      isOptional: false,
      mappedName: "tag_values",
      type: "String"
    });
    expect(example?.fields.get("payload")).toMatchObject({
      isList: false,
      isOptional: true,
      mappedName: "payload_json",
      type: "Json"
    });
  });

  it("passes the checked-in Prisma schema against high-risk contract expectations", () => {
    const schemaText = readFileSync(join(process.cwd(), "packages/database/prisma/schema.prisma"), "utf8");
    const result = checkPrismaContractDrift({
      expectations: defaultPrismaDriftExpectations,
      schemaText
    });

    expect(formatPrismaContractDriftResult(result)).toContain("Prisma schema/contract drift check passed");
    expect(result.valid).toBe(true);
    expect(result.checkedModels).toBeGreaterThanOrEqual(35);
    expect(result.checkedFields).toBeGreaterThan(500);
  });

  it("includes selected output metadata surfaces in schema drift coverage", () => {
    const coveredModels = defaultPrismaDriftExpectations.map((expectation) => expectation.modelName);

    expect(coveredModels).toEqual(
      expect.arrayContaining(["EvidenceLink", "ReportExport", "DashboardWidget"])
    );
  });

  it("includes customer-facing Romania readiness persistence in schema drift coverage", () => {
    const coveredModels = defaultPrismaDriftExpectations.map((expectation) => expectation.modelName);

    expect(coveredModels).toEqual(
      expect.arrayContaining(["RoNis2OnboardingProgress", "RoNis2ClassificationRun"])
    );

    expect(defaultPrismaDriftExpectations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ name: "answersJson", type: "Json" }),
            expect.objectContaining({ isList: true, name: "completedSteps", type: "String" }),
            expect.objectContaining({ isList: true, name: "missingRequiredFields", type: "String" })
          ]),
          modelAttributes: expect.arrayContaining([
            '@@index([organizationId, status], map: "ro_nis2_onboarding_progress_org_status_idx")'
          ]),
          modelName: "RoNis2OnboardingProgress",
          tableName: "ro_nis2_onboarding_progress"
        }),
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ name: "inputJson", type: "Json" }),
            expect.objectContaining({ name: "result", type: "RoNis2ClassificationResult" }),
            expect.objectContaining({ name: "sourceReferencesJson", type: "Json" })
          ]),
          modelAttributes: expect.arrayContaining([
            '@@index([organizationId, result, classifiedAt], map: "ro_nis2_classification_runs_org_result_idx")'
          ]),
          modelName: "RoNis2ClassificationRun",
          tableName: "ro_nis2_classification_runs"
        })
      ])
    );
  });

  it("includes owner-managed invitation persistence in schema drift coverage", () => {
    expect(defaultPrismaDriftExpectations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ name: "organizationId", type: "String" }),
            expect.objectContaining({ name: "invitedEmail", type: "String" }),
            expect.objectContaining({ name: "invitedRoleKey", type: "String" }),
            expect.objectContaining({ name: "tokenHash", type: "String" }),
            expect.objectContaining({ name: "status", type: "OrganizationInvitationStatus" }),
            expect.objectContaining({ name: "expiresAt", type: "DateTime" })
          ]),
          modelAttributes: expect.arrayContaining([
            '@@unique([tokenHash], map: "organization_invitations_token_hash_key")',
            '@@index([organizationId, invitedEmail, status], map: "organization_invitations_org_email_status_idx")'
          ]),
          modelName: "OrganizationInvitation",
          tableName: "organization_invitations"
        })
      ])
    );
  });

  it("fails schema drift checks on intentional missing and mismatched fixture fields", () => {
    const result = checkPrismaContractDrift({
      expectations: [
        {
          contractName: "FixtureContract",
          fields: [
            { name: "id", type: "String" },
            { name: "count", type: "String" },
            { name: "missingJson", type: "Json" },
            { name: "tags", type: "String", isList: true, mappedName: "tag_values" }
          ],
          modelName: "Fixture",
          tableName: "fixture_rows"
        }
      ],
      schemaText: `
model Fixture {
  id    String @id
  count Int
  tags  String[] @map("tag_labels")

  @@map("fixtures")
}
`
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.kind)).toEqual(
      expect.arrayContaining(["table_name_mismatch", "type_mismatch", "missing_field", "map_mismatch"])
    );
    expect(formatPrismaContractDriftResult(result)).toContain("Fixture.count has type Int");
  });

  it("passes Romania generated seed, source-map, and import-report drift checks against importer output", () => {
    const result = checkRoNis2GeneratedDataDrift();

    expect(formatGeneratedDataDriftResult(result)).toContain("Romania generated regulatory drift check passed");
    expect(result).toMatchObject({
      checkedArtifacts: 3,
      issues: [],
      valid: true
    });
  });

  it("fails generated-data drift checks on intentional content mismatch fixtures", () => {
    const issue = compareGeneratedArtifactText({
      actualText: "{\n  \"value\": 2\n}\n",
      artifactPath: "data/regulatory/countries/ro/ro-nis2.seed.generated.json",
      expectedText: "{\n  \"value\": 1\n}\n"
    });

    expect(issue).toMatchObject({
      artifactPath: "data/regulatory/countries/ro/ro-nis2.seed.generated.json",
      kind: "content_mismatch"
    });
    expect(issue?.actualHash).not.toBe(issue?.expectedHash);
  });

  it("treats the Romania import report as a lint-gated generated-data artifact", () => {
    const issue = compareGeneratedArtifactText({
      actualText: "{\n  \"status\": \"changed\"\n}\n",
      artifactPath: "data/regulatory/countries/ro/ro-nis2-import-report.generated.json",
      expectedText: "{\n  \"status\": \"validated\"\n}\n"
    });

    expect(issue).toMatchObject({
      artifactPath: "data/regulatory/countries/ro/ro-nis2-import-report.generated.json",
      kind: "content_mismatch"
    });
    expect(issue?.message).toContain("does not match deterministic importer output");
  });
});
