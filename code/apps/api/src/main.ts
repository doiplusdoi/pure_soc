import { loadConfig, validateConfigForStartup } from "@puresoc/config";
import { createApiServices } from "./auth/services";
import { startApiServer } from "./server";
import { runPrismaMigrationsOnStartup } from "./startup-migrations";

const port = Number(process.env.PORT ?? 3001);

const main = () => {
  try {
    const config = validateConfigForStartup(loadConfig(), { serviceName: "api" });
    const migration = runPrismaMigrationsOnStartup({
      persistenceMode: config.app.persistenceMode
    });
    const server = startApiServer(port, createApiServices({ config }));

    console.log(
      JSON.stringify({
        service: "puresoc-api",
        status: "listening",
        port,
        persistenceMode: config.app.persistenceMode,
        startupMigration: {
          command: migration.command,
          ran: migration.ran,
          reason: migration.reason
        }
      })
    );

    const shutdown = () => {
      server.close(() => {
        process.exit(0);
      });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    console.error(
      JSON.stringify({
        service: "puresoc-api",
        status: "startup_failed",
        error: error instanceof Error ? error.message : String(error)
      })
    );
    process.exit(1);
  }
};

main();
