import { createServer } from "node:http";

import { createOperationalConsoleDemoModel } from "./app-data";
import { renderLoginScreen, renderOperationalConsole } from "./operational-console";

export const startWebServer = (port = Number(process.env.PORT ?? 3000)) => {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/health") {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          service: "puresoc-web",
          status: "ok",
          runtime: "contract-renderer"
        })
      );
      return;
    }

    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(url.pathname === "/login" ? renderLoginScreen() : renderOperationalConsole(createOperationalConsoleDemoModel()));
  });

  server.listen(port, () => {
    const address = server.address();
    console.log(
      JSON.stringify({
        service: "puresoc-web",
        status: "listening",
        port: typeof address === "object" && address ? address.port : port,
        runtime: "contract-renderer"
      })
    );
  });

  return server;
};

if (process.argv.some((argument) => argument.endsWith("apps/web/src/server.ts"))) {
  const server = startWebServer();
  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
