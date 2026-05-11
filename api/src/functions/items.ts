import type { HttpRequest } from "@azure/functions";
import { itemSchema } from "../domain/schemas";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse, readJson } from "../lib/http";
import { appendAuditEvent, createItem, listItems } from "../lib/persistence";

export async function items(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  if (request.method === "GET") {
    const entries = await listItems();
    return jsonResponse({
      items: entries,
      commission: {
        platformFeePercent: Number(process.env.DEFAULT_PLATFORM_FEE_PERCENT ?? "12"),
      },
    });
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = itemSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const item = await createItem(session.userId, parsed.data);
  await appendAuditEvent(session.userId, "item.created", "item", item.id, `Created catalog item ${item.title}.`);

  return jsonResponse({ item }, 201);
}
