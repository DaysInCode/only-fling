"use client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:7071/api";

export type ApiResult<T> = {
  data?: T;
  error?: string;
};

export function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem("onlyfling-token") ?? "";
}

export function setStoredToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("onlyfling-token", token);
  }
}

export async function apiGet<T>(path: string, token?: string): Promise<ApiResult<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: token
      ? {
          authorization: `Bearer ${token}`,
        }
      : undefined,
  });

  const data = (await response.json()) as T & { error?: string };
  return response.ok ? { data } : { error: data.error ?? "request-failed" };
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<ApiResult<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token
        ? {
            authorization: `Bearer ${token}`,
          }
        : {}),
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as T & { error?: string };
  return response.ok ? { data } : { error: data.error ?? "request-failed" };
}
