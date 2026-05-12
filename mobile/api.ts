import type { ApiResult, ActivePluginsResponse } from "./types";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:7071/api";

let apiBaseUrl = DEFAULT_API_BASE_URL;

export function setApiBaseUrl(url: string) {
  apiBaseUrl = url;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

async function requestJson<T>(path: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
    });

    if (!response.ok) {
      return { error: `http-${response.status}` };
    }

    const payload = (await response.json()) as T;
    return { data: payload };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "request-failed" };
  }
}

export async function fetchActivePlugins(): Promise<ApiResult<ActivePluginsResponse>> {
  return requestJson<ActivePluginsResponse>("/plugins/active");
}
