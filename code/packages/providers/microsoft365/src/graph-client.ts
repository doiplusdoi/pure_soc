import { ProviderConnectorError, redactProviderSecrets } from "../../core/src/index";

export interface MicrosoftGraphRequest {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body?: URLSearchParams | string;
}

export interface MicrosoftGraphResponse {
  status: number;
  headers?: Record<string, string | undefined>;
  body: unknown;
}

export type MicrosoftGraphHttpClient = (request: MicrosoftGraphRequest) => Promise<MicrosoftGraphResponse>;

export interface MicrosoftGraphListResult<TItem extends Record<string, unknown> = Record<string, unknown>> {
  items: TItem[];
  pagesRead: number;
  retryCount: number;
}

export interface MicrosoftGraphClientOptions {
  baseUrl?: string;
  httpClient?: MicrosoftGraphHttpClient;
  sleep?: (milliseconds: number) => Promise<void>;
}

export const createFetchMicrosoftGraphHttpClient = (): MicrosoftGraphHttpClient => async (request) => {
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });
  const text = await response.text();
  const body = text.length > 0 ? (JSON.parse(text) as unknown) : {};

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body
  };
};

const defaultSleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const headerValue = (headers: Record<string, string | undefined> | undefined, name: string): string | undefined => {
  if (!headers) {
    return undefined;
  }

  const lowerName = name.toLowerCase();
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);
  return match?.[1];
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const retryDelayMs = (headers: Record<string, string | undefined> | undefined): number => {
  const retryAfter = headerValue(headers, "retry-after");
  const retryAfterSeconds = retryAfter ? Number.parseInt(retryAfter, 10) : Number.NaN;
  return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 1000;
};

export class MicrosoftGraphClient {
  private readonly baseUrl: string;
  private readonly httpClient: MicrosoftGraphHttpClient;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: MicrosoftGraphClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://graph.microsoft.com/v1.0";
    this.httpClient = options.httpClient ?? createFetchMicrosoftGraphHttpClient();
    this.sleep = options.sleep ?? defaultSleep;
  }

  async list<TItem extends Record<string, unknown> = Record<string, unknown>>(input: {
    path: string;
    accessToken: string;
    maxRetries?: number;
  }): Promise<MicrosoftGraphListResult<TItem>> {
    let nextUrl = this.toUrl(input.path);
    let pagesRead = 0;
    let retryCount = 0;
    const items: TItem[] = [];

    while (nextUrl) {
      const response = await this.getWithRetry({
        url: nextUrl,
        accessToken: input.accessToken,
        maxRetries: input.maxRetries ?? 3,
        retryCount: () => {
          retryCount += 1;
        }
      });
      const body = asRecord(response.body);
      const value = Array.isArray(body.value) ? body.value : [body];
      items.push(...(value.filter((entry) => entry !== null && typeof entry === "object") as TItem[]));
      pagesRead += 1;
      nextUrl = typeof body["@odata.nextLink"] === "string" ? body["@odata.nextLink"] : "";
    }

    return { items, pagesRead, retryCount };
  }

  private async getWithRetry(input: {
    url: string;
    accessToken: string;
    maxRetries: number;
    retryCount: () => void;
  }): Promise<MicrosoftGraphResponse> {
    let attempt = 0;

    while (true) {
      const response = await this.httpClient({
        method: "GET",
        url: input.url,
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          accept: "application/json"
        }
      });

      if (response.status === 429 || response.status === 503) {
        if (attempt >= input.maxRetries) {
          throw new ProviderConnectorError(
            "microsoft365_graph_rate_limited",
            "Microsoft Graph throttling exceeded the configured retry budget.",
            { status: response.status, body: redactProviderSecrets(response.body) }
          );
        }

        attempt += 1;
        input.retryCount();
        await this.sleep(retryDelayMs(response.headers));
        continue;
      }

      if (response.status === 401) {
        throw new ProviderConnectorError("microsoft365_graph_revoked_consent", "Microsoft Graph consent is revoked.", {
          status: response.status
        });
      }

      if (response.status === 403) {
        throw new ProviderConnectorError(
          "microsoft365_graph_forbidden",
          "Microsoft Graph rejected the request because a permission or license is missing.",
          { status: response.status, body: redactProviderSecrets(response.body) }
        );
      }

      if (response.status >= 400) {
        throw new ProviderConnectorError("microsoft365_graph_request_failed", "Microsoft Graph request failed.", {
          status: response.status,
          body: redactProviderSecrets(response.body)
        });
      }

      return response;
    }
  }

  private toUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith("https://")) {
      return pathOrUrl;
    }

    return `${this.baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
  }
}
