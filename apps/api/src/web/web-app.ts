import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, constants as zlib, gzipSync } from "node:zlib";

import { WEB_SECURITY_HEADERS } from "@tfm-bic/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Serving the built SPA from the API's own origin (M17, ADR-028) — staging/production only
 * (`WEB_DIST_DIR`); in development/test Vite serves it. One origin keeps the `SameSite=Strict`
 * session cookie and the Origin check working without CORS.
 *
 * The build is small (index.html plus a few hashed files), so it is read into memory once at
 * start-up and every file gets its own explicit route: no wildcard route, no filesystem lookups
 * per request, so no path can reach anything outside the build — and a file that collides with an
 * API route stops the server at start-up instead of shadowing it.
 */

interface WebFile {
  body: Buffer;
  brotli?: Buffer;
  gzip?: Buffer;
  contentType: string;
  cacheControl: string;
}

export interface WebApp {
  /** URL path → file. */
  files: ReadonlyMap<string, WebFile>;
  shell: WebFile;
}

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
};

/** Never served even if present: source maps and dotfiles are not part of the public app. */
function isExcluded(relativePath: string): boolean {
  return (
    relativePath.endsWith(".map") || relativePath.split("/").some((part) => part.startsWith("."))
  );
}

/** Vite puts content-hashed files under assets/: a new build means a new name, so cache forever. */
function cacheControlFor(urlPath: string): string {
  if (urlPath === "/index.html") return "no-cache";
  if (urlPath.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  return "public, max-age=3600";
}

const COMPRESSIBLE = /^(text\/|application\/(json|manifest\+json)|image\/svg\+xml)/;
const MIN_COMPRESS_BYTES = 1024;

function listFiles(dir: string, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return listFiles(path.join(dir, entry.name), relative);
    return entry.isFile() ? [relative] : [];
  });
}

/**
 * Reads the build once. Throws — so the process refuses to start — when there is no index.html,
 * or a file has a type this server does not know how to label.
 */
export function loadWebApp(distDir: string): WebApp {
  if (!existsSync(path.join(distDir, "index.html"))) {
    throw new Error(`WEB_DIST_DIR has no index.html — build apps/web first (${distDir}).`);
  }
  const files = new Map<string, WebFile>();
  for (const relative of listFiles(distDir)) {
    if (isExcluded(relative)) continue;
    const contentType = CONTENT_TYPES[path.extname(relative).toLowerCase()];
    if (!contentType) {
      throw new Error(`WEB_DIST_DIR contains a file of unknown type: ${relative}`);
    }
    const urlPath = `/${relative}`;
    const body = readFileSync(path.join(distDir, relative));
    const compress = COMPRESSIBLE.test(contentType) && body.length >= MIN_COMPRESS_BYTES;
    files.set(urlPath, {
      body,
      contentType,
      cacheControl: cacheControlFor(urlPath),
      ...(compress
        ? {
            brotli: brotliCompressSync(body, { params: { [zlib.BROTLI_PARAM_QUALITY]: 9 } }),
            gzip: gzipSync(body, { level: 9 }),
          }
        : {}),
    });
  }
  const shell = files.get("/index.html");
  if (!shell) {
    throw new Error("WEB_DIST_DIR index.html could not be loaded.");
  }
  return { files, shell };
}

/** Encodings the client accepts (q > 0), from Accept-Encoding. */
function acceptedEncodings(header: string | undefined): Set<string> {
  const accepted = new Set<string>();
  for (const part of (header ?? "").split(",")) {
    const [name = "", ...params] = part.trim().toLowerCase().split(";");
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    if (name && (q === undefined || Number(q.slice(2)) > 0)) accepted.add(name);
  }
  return accepted;
}

function sendWebFile(request: FastifyRequest, reply: FastifyReply, file: WebFile): FastifyReply {
  for (const [name, value] of Object.entries(WEB_SECURITY_HEADERS)) {
    void reply.header(name, value);
  }
  void reply.header("content-type", file.contentType).header("cache-control", file.cacheControl);
  if (!file.brotli || !file.gzip) {
    return reply.send(file.body);
  }
  void reply.header("vary", "Accept-Encoding");
  const accepted = acceptedEncodings(request.headers["accept-encoding"]);
  if (accepted.has("br")) {
    return reply.header("content-encoding", "br").send(file.brotli);
  }
  if (accepted.has("gzip")) {
    return reply.header("content-encoding", "gzip").send(file.gzip);
  }
  return reply.send(file.body);
}

/** A browser loading a page (typed URL, link, reload) — not the app's own `fetch`, which always
 * asks for JSON. Same rule as the Vite dev proxy (apps/web/vite.config.ts). */
export function isPageNavigation(request: FastifyRequest): boolean {
  return (
    request.headers["sec-fetch-dest"] === "document" ||
    (request.headers.accept ?? "").includes("text/html")
  );
}

/** SPA pages whose path is also an API route: a navigation gets the page, a fetch the API. */
const PAGES_SHARING_AN_API_PATH = new Set(["/profile"]);

/** Registers one GET (and HEAD) route per build file, plus the /profile page-vs-API split. */
export function registerWebApp(app: FastifyInstance, webApp: WebApp): void {
  for (const [urlPath, file] of webApp.files) {
    app.get(urlPath, (request, reply) => sendWebFile(request, reply, file));
  }
  app.get("/", (request, reply) => sendWebFile(request, reply, webApp.shell));

  app.addHook("onRequest", (request, reply, done) => {
    const pathname = request.url.split("?", 1)[0] ?? "";
    if (
      (request.method === "GET" || request.method === "HEAD") &&
      PAGES_SHARING_AN_API_PATH.has(pathname) &&
      isPageNavigation(request)
    ) {
      void sendWebFile(request, reply, webApp.shell);
      return;
    }
    done();
  });
}

/**
 * The not-found fallback for client-side routes: a page navigation to a path no route matched
 * gets the SPA shell (the SPA shows its own not-found page); everything else stays a JSON 404.
 * Returns undefined when it does not apply.
 */
export function spaShellFallback(webApp: WebApp) {
  return (request: FastifyRequest, reply: FastifyReply): FastifyReply | undefined =>
    (request.method === "GET" || request.method === "HEAD") && isPageNavigation(request)
      ? sendWebFile(request, reply, webApp.shell)
      : undefined;
}
