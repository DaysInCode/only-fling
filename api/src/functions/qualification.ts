import type { HttpRequest } from "@azure/functions";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse } from "../lib/http";
import { qualificationRules } from "../lib/persistence";

export async function qualification(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  return jsonResponse({
    rules: await qualificationRules(),
    outcomeStates: ["accepted", "needs-review", "rejected"],
  });
}
