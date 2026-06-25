import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const runScript = (script: string, env: Record<string, string>) =>
  spawnSync("sh", [script], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env
    },
    encoding: "utf8"
  });

describe("backup and restore operator scripts", () => {
  it("prints a backup plan in dry-run mode without requiring pg_dump", () => {
    const backupDir = mkdtempSync(join(tmpdir(), "puresoc-backup-test-"));
    try {
      const result = runScript("scripts/backup.sh", {
        DATABASE_URL: "postgresql://puresoc:puresoc@127.0.0.1:5432/puresoc",
        PURESOC_BACKUP_DIR: backupDir,
        PURESOC_BACKUP_DRY_RUN: "true",
        PURESOC_BACKUP_LABEL: "unit"
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("PureSOC backup plan");
      expect(result.stdout).toContain("object_storage: not_included");
      expect(result.stdout).toContain("Dry run only");
      expect(result.stderr).toBe("");
    } finally {
      rmSync(backupDir, { force: true, recursive: true });
    }
  });

  it("prints an object-storage backup plan in dry-run mode without requiring mc", () => {
    const backupDir = mkdtempSync(join(tmpdir(), "puresoc-backup-test-"));
    try {
      const result = runScript("scripts/backup.sh", {
        DATABASE_URL: "postgresql://puresoc:puresoc@127.0.0.1:5432/puresoc",
        PURESOC_BACKUP_DIR: backupDir,
        PURESOC_BACKUP_DRY_RUN: "true",
        PURESOC_BACKUP_INCLUDE_OBJECT_STORAGE: "true",
        PURESOC_OBJECT_STORAGE_BUCKET: "puresoc-evidence"
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("object_storage:");
      expect(result.stdout).toContain("object_storage_bucket: puresoc-evidence");
      expect(result.stdout).toContain("Dry run only");
    } finally {
      rmSync(backupDir, { force: true, recursive: true });
    }
  });

  it("requires an explicit restore confirmation token", () => {
    const restoreFile = join(mkdtempSync(join(tmpdir(), "puresoc-restore-test-")), "postgres.dump");
    writeFileSync(restoreFile, "not-a-real-dump");

    try {
      const result = runScript("scripts/restore.sh", {
        DATABASE_URL: "postgresql://puresoc:puresoc@127.0.0.1:5432/puresoc",
        PURESOC_RESTORE_POSTGRES_FILE: restoreFile,
        PURESOC_RESTORE_DRY_RUN: "true"
      });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("PURESOC_RESTORE_CONFIRM=restore-to-target");
    } finally {
      rmSync(restoreFile, { force: true });
    }
  });

  it("prints a restore plan in dry-run mode after confirmation", () => {
    const restoreDir = mkdtempSync(join(tmpdir(), "puresoc-restore-test-"));
    const restoreFile = join(restoreDir, "postgres.dump");
    writeFileSync(restoreFile, "not-a-real-dump");

    try {
      const result = runScript("scripts/restore.sh", {
        DATABASE_URL: "postgresql://puresoc:puresoc@127.0.0.1:5432/puresoc",
        PURESOC_RESTORE_CONFIRM: "restore-to-target",
        PURESOC_RESTORE_DRY_RUN: "true",
        PURESOC_RESTORE_POSTGRES_FILE: restoreFile
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("PureSOC restore plan");
      expect(result.stdout).toContain("object_storage: not_restored");
      expect(result.stdout).toContain("Dry run only");
      expect(result.stderr).toBe("");
    } finally {
      rmSync(restoreDir, { force: true, recursive: true });
    }
  });

  it("prints an object-storage restore plan in dry-run mode after confirmation", () => {
    const restoreDir = mkdtempSync(join(tmpdir(), "puresoc-restore-test-"));
    const restoreFile = join(restoreDir, "postgres.dump");
    const objectStorageDir = join(restoreDir, "object-storage");
    writeFileSync(restoreFile, "not-a-real-dump");

    try {
      const result = runScript("scripts/restore.sh", {
        DATABASE_URL: "postgresql://puresoc:puresoc@127.0.0.1:5432/puresoc",
        PURESOC_OBJECT_STORAGE_BUCKET: "puresoc-evidence",
        PURESOC_RESTORE_CONFIRM: "restore-to-target",
        PURESOC_RESTORE_DRY_RUN: "true",
        PURESOC_RESTORE_INCLUDE_OBJECT_STORAGE: "true",
        PURESOC_RESTORE_OBJECT_STORAGE_DIR: objectStorageDir,
        PURESOC_RESTORE_POSTGRES_FILE: restoreFile
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`object_storage: ${objectStorageDir}`);
      expect(result.stdout).toContain("object_storage_bucket: puresoc-evidence");
      expect(result.stdout).toContain("Dry run only");
    } finally {
      rmSync(restoreDir, { force: true, recursive: true });
    }
  });
});
