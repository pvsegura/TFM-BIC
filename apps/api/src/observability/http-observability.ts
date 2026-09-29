import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { pathWithoutQuery } from "../logging/request-serializer.js";
import type { MetricsRegistry } from "./metrics.js";

const KNOWN_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

/** Liveness/readiness probes run every few seconds; a successful one is not worth an info line. */
const PROBE_ROUTES = new Set(["/health", "/ready"]);

/** The route template (`/lessons/:lessonId`), never the raw URL — or `unmatched` for a 404. */
export function routeLabel(request: FastifyRequest): string {
  return request.routeOptions.url ?? "unmatched";
}

/**
 * One `request.completed` line per request (replacing Fastify's two default lines — the server
 * sets `disableRequestLogging`) and the HTTP metrics (M18, ADR-029). The client address is kept
 * on the line as before M18 (M15 data map); the query string never is.
 */
export function registerHttpObservability(app: FastifyInstance, metrics: MetricsRegistry): void {
  app.addHook("onResponse", (request: FastifyRequest, reply: FastifyReply, done) => {
    const route = routeLabel(request);
    const method = KNOWN_METHODS.has(request.method) ? request.method : "OTHER";
    const statusCode = reply.statusCode;
    const durationMs = Math.round(reply.elapsedTime);

    metrics.increment("http_responses_total", { method, route, status: String(statusCode) });
    metrics.observe("http_request_duration_ms", { method, route }, reply.elapsedTime);

    const quietProbe = PROBE_ROUTES.has(route) && statusCode < 400;
    request.log[quietProbe ? "debug" : "info"](
      {
        method,
        route,
        path: pathWithoutQuery(request.url),
        statusCode,
        durationMs,
        remoteAddress: request.ip,
      },
      "request.completed",
    );
    done();
  });
}
