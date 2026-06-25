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

export interface ApiMetricRecordInput {
  method: string;
  routeFamily: string;
  statusCode: number;
}

export interface ApiMetricCounter {
  method: string;
  routeFamily: string;
  statusCode: number;
  count: number;
}

export interface ApiMetricsSnapshot {
  service: "puresoc-api";
  generatedAt: string;
  processUptimeSeconds: number;
  requestsTotal: number;
  counters: ApiMetricCounter[];
}

export class ApiMetricsRegistry {
  private readonly counters = new Map<string, ApiMetricCounter>();
  private requestsTotal = 0;

  constructor(private readonly startedAt = Date.now()) {}

  record(input: ApiMetricRecordInput): void {
    const method = normalizeMetricLabel(input.method, "UNKNOWN");
    const routeFamily = normalizeMetricLabel(input.routeFamily, "unknown");
    const statusCode = Number.isInteger(input.statusCode) ? input.statusCode : 500;
    const key = `${method}:${routeFamily}:${statusCode}`;
    const existing = this.counters.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      this.counters.set(key, {
        method,
        routeFamily,
        statusCode,
        count: 1
      });
    }
    this.requestsTotal += 1;
  }

  snapshot(now = new Date()): ApiMetricsSnapshot {
    return {
      service: "puresoc-api",
      generatedAt: now.toISOString(),
      processUptimeSeconds: Math.max(0, Math.floor((now.getTime() - this.startedAt) / 1000)),
      requestsTotal: this.requestsTotal,
      counters: [...this.counters.values()].sort((left, right) =>
        `${left.method}:${left.routeFamily}:${left.statusCode}`.localeCompare(
          `${right.method}:${right.routeFamily}:${right.statusCode}`
        )
      )
    };
  }
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

export const renderApiMetricsPrometheus = (snapshot: ApiMetricsSnapshot): string => {
  const lines = [
    "# HELP puresoc_api_requests_total Total API responses by method, route family, and status code.",
    "# TYPE puresoc_api_requests_total counter",
    ...snapshot.counters.map(
      (counter) =>
        `puresoc_api_requests_total{method="${counter.method}",route_family="${counter.routeFamily}",status_code="${counter.statusCode}"} ${counter.count}`
    ),
    "# HELP puresoc_api_process_uptime_seconds API process uptime in seconds.",
    "# TYPE puresoc_api_process_uptime_seconds gauge",
    `puresoc_api_process_uptime_seconds ${snapshot.processUptimeSeconds}`,
    "# HELP puresoc_api_requests_observed_total Total API responses observed by this process.",
    "# TYPE puresoc_api_requests_observed_total counter",
    `puresoc_api_requests_observed_total ${snapshot.requestsTotal}`,
    ""
  ];
  return lines.join("\n");
};

const normalizeMetricLabel = (value: string, fallback: string): string => {
  const normalized = value.trim().toLowerCase().replaceAll(/[^a-z0-9_:-]/g, "_");
  return normalized.length > 0 ? normalized.slice(0, 64) : fallback;
};
