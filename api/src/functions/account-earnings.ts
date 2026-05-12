import type { HttpRequest } from "@azure/functions";
import { payoutsRequestSchema } from "../domain/schemas";
import { getBearerSession } from "../lib/auth";
import { createPayoutRequest, getAccountEarnings, listPayoutRequests } from "../lib/account-store";
import { jsonResponse, optionsResponse, readJson } from "../lib/http";
import { appendAuditEvent } from "../lib/persistence";

export async function accountEarningsSummary(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  return jsonResponse(await getAccountEarnings(session.userId));
}

export async function accountPayouts(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  return jsonResponse({
    payouts: await listPayoutRequests(session.userId),
    summary: (await getAccountEarnings(session.userId)).summary,
  });
}

export async function accountPayoutRequest(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = payoutsRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const result = await createPayoutRequest(session.userId, parsed.data.amountMinor, parsed.data.note);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, 409);
  }

  await appendAuditEvent(session.userId, "payout.request.created", "payout-request", result.payout.id, "Requested payout from available balance.");
  return jsonResponse({ payout: result.payout }, 201);
}
