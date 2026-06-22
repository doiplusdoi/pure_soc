import { describe, expect, it } from "vitest";

import {
  runPrismaMigrationsOnStartup,
  shouldRunPrismaMigrationsOnStartup,
  StartupMigrationError,
  type StartupMigrationRunner
} from "../startup-migrations";

describe("API startup migrations", () => {
  it("skips migration deploy outside Prisma persistence mode", () => {
    const calls: Array<{ command: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv }> = [];
    const result = runPrismaMigrationsOnStartup({
      env: {},
      persistenceMode: "memory",
      runner: recordRunner(calls)
    });

    expect(result).toEqual({
      command: "npm run prisma:migrate:deploy",
      ran: false,
      reason: "memory_persistence"
    });
    expect(calls).toHaveLength(0);
  });

  it("runs checked-in migrations before serving in Prisma mode", () => {
    const calls: Array<{ command: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv }> = [];
    const result = runPrismaMigrationsOnStartup({
      cwd: "/workspace/code",
      env: {
        DATABASE_URL: "postgresql://puresoc:redacted@postgres:5432/puresoc"
      },
      persistenceMode: "prisma",
      runner: recordRunner(calls)
    });

    expect(result).toEqual({
      command: "npm run prisma:migrate:deploy",
      ran: true,
      reason: null
    });
    expect(calls).toEqual([
      {
        command: "npm",
        args: ["run", "prisma:migrate:deploy"],
        cwd: "/workspace/code",
        env: {
          DATABASE_URL: "postgresql://puresoc:redacted@postgres:5432/puresoc"
        }
      }
    ]);
  });

  it("can be explicitly disabled for operator-owned migration sequencing", () => {
    expect(
      shouldRunPrismaMigrationsOnStartup("prisma", {
        PURESOC_API_RUN_MIGRATIONS_ON_STARTUP: "false"
      })
    ).toBe(false);
    expect(
      shouldRunPrismaMigrationsOnStartup("prisma", {
        PURESOC_API_SKIP_STARTUP_MIGRATIONS: "true"
      })
    ).toBe(false);
  });

  it("fails startup when migration deploy fails", () => {
    expect(() =>
      runPrismaMigrationsOnStartup({
        env: {},
        persistenceMode: "prisma",
        runner: () => ({
          signal: null,
          status: 1
        })
      })
    ).toThrow(StartupMigrationError);
  });
});

const recordRunner =
  (calls: Array<{ command: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv }>): StartupMigrationRunner =>
  (command, args, options) => {
    calls.push({
      command,
      args,
      cwd: options.cwd,
      env: options.env
    });

    return {
      signal: null,
      status: 0
    };
  };
