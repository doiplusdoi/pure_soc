import { describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";

import { createApiServices } from "../auth/services";
import { ApiMetricsRegistry, getApiHealth, renderApiMetricsPrometheus } from "../health";
import { startApiServer } from "../server";

describe("getApiHealth", () => {
  it("returns a deterministic health shape", () => {
    const health = getApiHealth(new Date("2026-04-28T00:00:00.000Z"));

    expect(health).toEqual({
      service: "puresoc-api",
      status: "ok",
      environment: "development",
      checks: {
        config: "ok",
        providerWrites: "disabled"
      },
      timestamp: "2026-04-28T00:00:00.000Z"
    });
  });

  it("renders secret-free Prometheus metrics from bounded labels", () => {
    const metrics = new ApiMetricsRegistry(new Date("2026-06-25T10:00:00.000Z").getTime());
    metrics.record({ method: "GET", routeFamily: "tenant_read", statusCode: 200 });
    metrics.record({ method: "POST", routeFamily: "organization", statusCode: 201 });
    metrics.record({ method: "GET", routeFamily: "tenant_read", statusCode: 200 });

    const rendered = renderApiMetricsPrometheus(metrics.snapshot(new Date("2026-06-25T10:00:05.000Z")));

    expect(rendered).toContain(
      'puresoc_api_requests_total{method="get",route_family="tenant_read",status_code="200"} 2'
    );
    expect(rendered).toContain(
      'puresoc_api_requests_total{method="post",route_family="organization",status_code="201"} 1'
    );
    expect(rendered).toContain("puresoc_api_process_uptime_seconds 5");
    expect(rendered).toContain("puresoc_api_requests_observed_total 3");
    expect(rendered).not.toContain("organizationId");
    expect(rendered).not.toContain("cookie");
  });

  it("exposes API metrics without secrets or route IDs", async () => {
    const server = startApiServer(0, createApiServices());
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const healthResponse = await fetch(`${baseUrl}/health`);
      expect(healthResponse.status).toBe(200);

      const notFoundResponse = await fetch(`${baseUrl}/api/v1/missing`, {
        headers: {
          "x-request-id": "req_metrics_probe",
          "x-correlation-id": "corr_metrics_probe"
        }
      });
      expect(notFoundResponse.status).toBe(404);

      const metricsResponse = await fetch(`${baseUrl}/metrics`);
      const metricsText = await metricsResponse.text();

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.headers.get("content-type")).toContain("text/plain");
      expect(metricsText).toContain(
        'puresoc_api_requests_total{method="get",route_family="unknown",status_code="404"} 1'
      );
      expect(metricsText).not.toContain("req_metrics_probe");
      expect(metricsText).not.toContain("/api/v1/missing");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
