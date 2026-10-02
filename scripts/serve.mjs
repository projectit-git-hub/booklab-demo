// Local preview server for site/. Applies the globalHeaders from
// site/staticwebapp.config.json, so the page is exercised under the same CSP
// and security headers it gets in production (minus upgrade-insecure-requests
// and HSTS, which do not apply on http://localhost).
//
//   node scripts/serve.mjs [port]

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../site");
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

createServer((req, res) => {
  const headers = { ...JSON.parse(readFileSync(join(root, "staticwebapp.config.json"), "utf8")).globalHeaders };
  delete headers["Strict-Transport-Security"];
  headers["Content-Security-Policy"] = headers["Content-Security-Policy"].replace("; upgrade-insecure-requests", "");
  headers["Cache-Control"] = "no-store";

  const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403, headers).end(); return; }
  if (!existsSync(file) || statSync(file).isDirectory() || path === "/staticwebapp.config.json") file = join(root, "index.html");
  res.writeHead(200, { ...headers, "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
}).listen(port, () => console.log(`Book Lab demo preview: http://localhost:${port}`));
