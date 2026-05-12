import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 3000);
const root = path.join(__dirname, "out");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function resolvePath(urlPath) {
  const cleanPath = (urlPath || "/").split("?")[0];
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\//, "");
  const directPath = path.join(root, relativePath);

  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }

  const nestedIndex = path.join(root, relativePath, "index.html");
  if (fs.existsSync(nestedIndex)) {
    return nestedIndex;
  }

  return path.join(root, "404.html");
}

http
  .createServer((request, response) => {
    const filePath = resolvePath(request.url);
    const extension = path.extname(filePath);
    response.setHeader("content-type", contentTypes[extension] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(response);
  })
  .listen(port, "0.0.0.0");
