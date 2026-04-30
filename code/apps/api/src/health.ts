import { loadConfig } from "@puresoc/config";

export interface ApiHealth {
  service: "puresoc-api";
  status: "ok";
  environment: string;
  checks: {
    config: "ok";
    providerWrites: "disabled";
  };
  timestamp: string;
}

export const getApiHealth = (now = new Date()): ApiHealth => {
  const config = loadConfig();

  return {
    service: "puresoc-api",
    status: "ok",
    environment: config.app.env,
    checks: {
      config: "ok",
      providerWrites: "disabled"
    },
    timestamp: now.toISOString()
  };
};
