import type { HttpRequest } from "@azure/functions";
import { uploadSchema } from "../domain/schemas";
import { getBearerSession } from "../lib/auth";
import { jsonResponse, optionsResponse, readJson } from "../lib/http";
import { createUploadUrl } from "../lib/uploads";

export async function presignUpload(request: HttpRequest) {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  const session = await getBearerSession(request);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const parsed = uploadSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonResponse({ error: "invalid-request", details: parsed.error.flatten() }, 400);
  }

  const upload = await createUploadUrl(parsed.data.fileName, parsed.data.contentType);
  return jsonResponse({ upload });
}
