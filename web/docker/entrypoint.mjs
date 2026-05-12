import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDirectory = path.join(__dirname, "out");
const runtimeConfigPath = path.join(outputDirectory, "runtime-config.js");
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:7071/api";

fs.writeFileSync(runtimeConfigPath, `window.__ONLYFLING_CONFIG__ = { apiBaseUrl: "${apiBaseUrl}" };`, "utf8");

await import("./server.mjs");
