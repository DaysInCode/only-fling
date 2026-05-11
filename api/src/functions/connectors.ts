import type { HttpRequest } from "@azure/functions";
import { connectors } from "../lib/connectors";
import { jsonResponse, optionsResponse } from "../lib/http";

export async function listConnectors(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  return jsonResponse({ connectors });
}
