import { createServer } from "node:http";

import { getApiHealth } from "./health";

export const startApiServer = (port = Number(process.env.PORT ?? 3001)) => {
  const server = createServer((request, response) => {
    if (request.url === "/health") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(getApiHealth()));
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  });

  server.listen(port);
  return server;
};

if (process.argv[1]?.endsWith("server.ts")) {
  startApiServer();
}
