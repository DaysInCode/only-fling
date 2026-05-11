import type { HttpRequest } from "@azure/functions";
import { config } from "../lib/config";
import { jsonResponse, optionsResponse } from "../lib/http";

export async function health(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  return jsonResponse({
    status: "ok",
    timestamp: new Date().toISOString(),
    platformFeePercent: config.platformFeePercent,
    storageConfigured: Boolean(config.storageConnectionString),
  });
}
