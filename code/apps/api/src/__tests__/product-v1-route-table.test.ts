import { describe, expect, it } from "vitest";

import { apiRouteTable } from "../server";

type RouteMethod = (typeof apiRouteTable)[number]["methods"][number];

describe("product v1 route table", () => {
  it("exposes audit export and checkpoint routes under the v1 namespace", () => {
    expect(hasRoute("GET", "/api/v1/organizations/org_1/audit/export")).toBe(true);
    expect(hasRoute("GET", "/api/v1/organizations/org_1/audit/checkpoints")).toBe(true);
    expect(hasRoute("POST", "/api/v1/organizations/org_1/audit/checkpoints")).toBe(true);
  });

  it("exposes notification channel and log routes under the v1 namespace", () => {
    expect(hasRoute("GET", "/api/v1/organizations/org_1/notification-channels")).toBe(true);
    expect(hasRoute("POST", "/api/v1/organizations/org_1/notification-channels")).toBe(true);
    expect(hasRoute("PATCH", "/api/v1/organizations/org_1/notification-channels/channel_1")).toBe(true);
    expect(hasRoute("DELETE", "/api/v1/organizations/org_1/notification-channels/channel_1")).toBe(true);
    expect(hasRoute("POST", "/api/v1/organizations/org_1/notification-channels/channel_1/test")).toBe(true);
    expect(hasRoute("GET", "/api/v1/organizations/org_1/notification-logs")).toBe(true);
    expect(hasRoute("GET", "/api/v1/organizations/org_1/notification-operator-alerts")).toBe(true);
    expect(hasRoute("POST", "/api/v1/organizations/org_1/notification-operator-alerts/alert_1/acknowledge")).toBe(true);
    expect(hasRoute("GET", "/api/v1/organizations/org_1/notifications")).toBe(true);
    expect(hasRoute("POST", "/api/v1/organizations/org_1/notifications")).toBe(true);
    expect(hasRoute("PATCH", "/api/v1/organizations/org_1/notifications/notification_1")).toBe(true);
    expect(hasRoute("GET", "/api/v1/organizations/org_1/notification-preferences")).toBe(true);
    expect(hasRoute("PUT", "/api/v1/organizations/org_1/notification-preferences")).toBe(true);
  });

  it("exposes provider action safety routes under the v1 namespace", () => {
    expect(hasRoute("POST", "/api/v1/organizations/org_1/provider-actions/template_1/preflight")).toBe(true);
    expect(hasRoute("GET", "/api/v1/organizations/org_1/provider-actions/run_1")).toBe(true);
    expect(hasRoute("POST", "/api/v1/organizations/org_1/provider-actions/run_1/approve")).toBe(true);
    expect(hasRoute("POST", "/api/v1/organizations/org_1/provider-actions/run_1/execute")).toBe(true);
  });
});

const hasRoute = (method: RouteMethod, path: string): boolean =>
  apiRouteTable.some((route) => route.methods.includes(method) && route.pattern.test(path));
