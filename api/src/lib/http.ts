import type { HttpRequest, HttpResponseInit } from "@azure/functions";

export async function readJson<T>(request: HttpRequest): Promise<T> {
  return (await request.json()) as T;
}

export function jsonResponse(body: unknown, status = 200): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "authorization,content-type",
    },
  };
}

export function optionsResponse(): HttpResponseInit {
  return {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "authorization,content-type",
    },
  };
}
