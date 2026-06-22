import { spawnSync } from "node:child_process";

export type StartupMigrationPersistenceMode = "memory" | "prisma";

export interface StartupMigrationRunnerResult {
  error?: Error;
  signal?: NodeJS.Signals | null;
  status: number | null;
}

export type StartupMigrationRunner = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    stdio: "inherit";
  }
) => StartupMigrationRunnerResult;

export interface StartupMigrationOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  persistenceMode: StartupMigrationPersistenceMode;
  runner?: StartupMigrationRunner;
}

export interface StartupMigrationResult {
  command: string;
  reason: string | null;
  ran: boolean;
}

export class StartupMigrationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "StartupMigrationError";
    this.code = code;
  }
}

const defaultRunner: StartupMigrationRunner = (command, args, options) =>
  spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio
  });

export const shouldRunPrismaMigrationsOnStartup = (
  persistenceMode: StartupMigrationPersistenceMode,
  env: NodeJS.ProcessEnv = process.env
): boolean =>
  persistenceMode === "prisma" &&
  env.PURESOC_API_RUN_MIGRATIONS_ON_STARTUP !== "false" &&
  env.PURESOC_API_SKIP_STARTUP_MIGRATIONS !== "true";

export const runPrismaMigrationsOnStartup = (options: StartupMigrationOptions): StartupMigrationResult => {
  const env = options.env ?? process.env;
  const command = "npm";
  const args = ["run", "prisma:migrate:deploy"];

  if (!shouldRunPrismaMigrationsOnStartup(options.persistenceMode, env)) {
    return {
      command: `${command} ${args.join(" ")}`,
      reason: options.persistenceMode === "prisma" ? "disabled_by_environment" : "memory_persistence",
      ran: false
    };
  }

  const result = (options.runner ?? defaultRunner)(command, args, {
    cwd: options.cwd ?? process.cwd(),
    env,
    stdio: "inherit"
  });

  if (result.error) {
    throw new StartupMigrationError("startup_migration_spawn_failed", "Prisma migration deploy could not be started.");
  }

  if (result.status !== 0) {
    throw new StartupMigrationError(
      "startup_migration_failed",
      `Prisma migration deploy failed before API startup with status ${result.status ?? "unknown"}${
        result.signal ? ` and signal ${result.signal}` : ""
      }.`
    );
  }

  return {
    command: `${command} ${args.join(" ")}`,
    reason: null,
    ran: true
  };
};
