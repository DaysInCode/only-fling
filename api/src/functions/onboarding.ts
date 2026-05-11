import type { HttpRequest } from "@azure/functions";
import { onboardingSchema } from "../domain/schemas";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse, readJson } from "../lib/http";
import { appendAuditEvent, saveOnboarding } from "../lib/persistence";

export async function completeOnboarding(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = onboardingSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const onboarding = await saveOnboarding(session.userId, parsed.data);
  await appendAuditEvent(session.userId, "onboarding.completed", "workspace", onboarding.id, `Completed onboarding for ${onboarding.workspaceName}.`);

  return jsonResponse({ onboarding }, 201);
}
