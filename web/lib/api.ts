"use client";

import type { UploadTarget } from "./contracts";

declare global {
  interface Window {
    __ONLYFLING_CONFIG__?: {
      apiBaseUrl?: string;
    };
  }
}

const defaultApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:7071/api";
const tokenStorageKey = "onlyfling-token";

export type ApiResult<T> = {
  data?: T;
  error?: string;
};

type RequestOptions = {
  token?: string;
  headers?: HeadersInit;
  body?: string;
  method?: "GET" | "POST";
};

function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    return window.__ONLYFLING_CONFIG__?.apiBaseUrl ?? defaultApiBaseUrl;
  }

  return defaultApiBaseUrl;
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body
        ? {
            "content-type": "application/json",
          }
        : {}),
      ...(options.token
        ? {
            authorization: `Bearer ${options.token}`,
          }
        : {}),
      ...options.headers,
    },
    body: options.body,
  });

  let payload: (T & { error?: string }) | null = null;
  try {
    payload = (await response.json()) as T & { error?: string };
  } catch {
    payload = null;
  }

  if (response.ok && payload) {
    return { data: payload };
  }

  return { error: payload?.error ?? "request-failed" };
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(tokenStorageKey) ?? "";
}

export function setStoredToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(tokenStorageKey, token);
  }
}

export function clearStoredToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(tokenStorageKey);
  }
}

export async function apiGet<T>(path: string, token?: string): Promise<ApiResult<T>> {
  return requestJson<T>(path, { token, method: "GET" });
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<ApiResult<T>> {
  return requestJson<T>(path, {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function uploadFileToUrl(file: File, target: UploadTarget, onProgress?: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", target.uploadUrl, true);

    Object.entries(target.requiredHeaders ?? {}).forEach(([key, value]) => {
      request.setRequestHeader(key, value);
    });

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(new Error(`upload-failed-${request.status}`));
    });

    request.addEventListener("error", () => reject(new Error("upload-failed")));
    request.send(file);
  });
}
