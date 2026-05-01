import { describe, expect, it } from "vitest";

import {
  AuditWriter,
  InMemoryAuditSink,
  stringifyAuditCanonicalPayload,
  verifyAuditHashChain
} from "../index";

const fixedNow = (iso: string) => () => new Date(iso);

describe("audit integrity", () => {
  it("hashes a stable redacted canonical payload", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditWriter({
      sink,
      idFactory: () => "11111111-1111-4111-8111-111111111111",
      now: fixedNow("2026-05-01T10:00:00.000Z")
    });

    const record = await writer.write({
      organizationId: "22222222-2222-4222-8222-222222222222",
      actorUserId: "33333333-3333-4333-8333-333333333333",
      targetType: "provider_connection",
      targetId: "m365-connection",
      action: "provider_connected",
      ipAddress: "203.0.113.10",
      userAgent: "vitest",
      beforeJson: {
        password: "never-hash-me",
        nested: {
          ok: true,
          authorization: "Bearer secret-token"
        }
      },
      afterJson: {
        status: "connected",
        storageUri: "s3://internal/evidence"
      }
    });

    const canonical = stringifyAuditCanonicalPayload(record.canonicalPayload);

    expect(record.previousHash).toBeNull();
    expect(record.hashAlgorithm).toBe("sha256");
    expect(record.entryHash).toMatch(/^[a-f0-9]{64}$/);
    expect(canonical).toContain("redactedFieldCount");
    expect(canonical).toContain("connected");
    expect(canonical).not.toContain("never-hash-me");
    expect(canonical).not.toContain("secret-token");
    expect(canonical).not.toContain("s3://internal/evidence");
    expect(sink.verifyIntegrity(record.organizationId)).toEqual({
      valid: true,
      checkedRecords: 1,
      violations: []
    });
  });

  it("chains records independently for each organization and global audit scope", async () => {
    let id = 0;
    const sink = new InMemoryAuditSink();
    const writer = new AuditWriter({
      sink,
      idFactory: () => `00000000-0000-4000-8000-${(++id).toString().padStart(12, "0")}`,
      now: () => new Date(`2026-05-01T10:00:0${id}.000Z`)
    });

    const orgAFirst = await writer.write({
      organizationId: "org-a",
      targetType: "session",
      action: "login"
    });
    const orgBFirst = await writer.write({
      organizationId: "org-b",
      targetType: "session",
      action: "login"
    });
    const globalFirst = await writer.write({
      targetType: "system",
      action: "startup"
    });
    const orgASecond = await writer.write({
      organizationId: "org-a",
      targetType: "session",
      action: "logout"
    });
    const globalSecond = await writer.write({
      targetType: "system",
      action: "shutdown"
    });

    expect(orgAFirst.previousHash).toBeNull();
    expect(orgBFirst.previousHash).toBeNull();
    expect(globalFirst.previousHash).toBeNull();
    expect(orgASecond.previousHash).toBe(orgAFirst.entryHash);
    expect(globalSecond.previousHash).toBe(globalFirst.entryHash);
    expect(sink.verifyIntegrity("org-a").valid).toBe(true);
    expect(sink.verifyIntegrity("org-b").valid).toBe(true);
    expect(sink.verifyIntegrity(null).valid).toBe(true);
    expect(sink.verifyIntegrity().valid).toBe(true);
  });

  it("detects field tampering and broken chain continuity", async () => {
    let id = 0;
    const sink = new InMemoryAuditSink();
    const writer = new AuditWriter({
      sink,
      idFactory: () => `99999999-9999-4999-8999-${(++id).toString().padStart(12, "0")}`,
      now: fixedNow("2026-05-01T10:00:00.000Z")
    });

    await writer.write({
      organizationId: "org-a",
      targetType: "provider_connection",
      action: "scan_started",
      afterJson: { status: "started" }
    });
    await writer.write({
      organizationId: "org-a",
      targetType: "provider_connection",
      action: "scan_completed",
      afterJson: { status: "completed" }
    });

    sink.records[0]!.afterJson = { status: "changed-after-write" };
    sink.records[1]!.previousHash = "broken";

    const verification = verifyAuditHashChain(sink.records, "org-a");

    expect(verification.valid).toBe(false);
    expect(verification.violations.map((violation) => violation.code)).toEqual(
      expect.arrayContaining(["canonical_payload_mismatch", "entry_hash_mismatch", "previous_hash_mismatch"])
    );
  });
});
