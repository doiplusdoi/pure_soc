import { describe, expect, it } from "vitest";

import { StartupConfigValidationError, loadConfig } from "@puresoc/config";
import { createApiServices } from "../auth/services";
import { startApiServer } from "../server";

describe("API startup config validation", () => {
  it("fails before listening when production config is unsafe", () => {
    const services = createApiServices({
      config: loadConfig({
        env: {
          PURESOC_APP_ENV: "production",
          PURESOC_AUTH_COOKIE_SECURE: "false",
          PURESOC_UPLOAD_SCANNER_MODE: "mock"
        }
      })
    });

    expect(() => startApiServer(0, services)).toThrow(StartupConfigValidationError);
  });

  it("allows a configured development server to start", () => {
    const services = createApiServices({
      config: loadConfig({ env: {} })
    });
    const server = startApiServer(0, services);

    server.close();
  });

  it("starts with deterministic fake provider-token custody in non-production tests", () => {
    const services = createApiServices({
      config: loadConfig({
        env: {
          PURESOC_PROVIDER_TOKEN_KEY_PROVIDER: "fake-secret-manager-test",
          PURESOC_PROVIDER_TOKEN_KEY_ID: "fake-current",
          PURESOC_PROVIDER_TOKEN_KEY: "fake-current-provider-token-key",
          PURESOC_PROVIDER_TOKEN_PREVIOUS_KEYS: "fake-previous=fake-previous-provider-token-key"
        }
      })
    });
    const server = startApiServer(0, services);

    server.close();
  });
});
