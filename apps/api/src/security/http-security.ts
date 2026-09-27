import { randomUUID } from "node:crypto";

import type { AppEnv } from "@tfm-bic/config";
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Cross-cutting HTTP security settings of the API (M16, ADR-027). One place for the values, so no
 * route repeats them. Route-specific limits (body sizes, rate limits) stay with their routes.
 */

/** Server-wide body cap for routes that set none of their own (every JSON body the API accepts is
 * far smaller; the largest per-route limit is 4 KiB). Fastify's default is 1 MiB. */
export const DEFAULT_BODY_LIMIT_BYTES = 16 * 1024;

/** Time allowed to receive a whole request (Fastify's default is 0 = unlimited; its docs say to
 * set it when the server may run without a reverse proxy). Responses are not bounded by it. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** HSTS only where HTTPS is required (staging/production — the same rule as the `Secure` cookie).
 * No `preload`: that is an irreversible, domain-wide decision for whoever owns the domain. */
const HSTS = "max-age=31536000; includeSubDomains";

/**
 * Headers for every API response. The API only returns JSON and binary downloads, never HTML, so
 * the CSP forbids everything; it and the frame headers only matter if a response is ever opened
 * directly in a browser tab. The SPA's own policy is `apps/web/security-headers.ts`.
 */
export function apiSecurityHeaders(nodeEnv: AppEnv["NODE_ENV"]): Record<string, string> {
  const headers: Record<string, string> = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "cross-origin-resource-policy": "same-origin",
  };
  if (nodeEnv === "production" || nodeEnv === "staging") {
    headers["strict-transport-security"] = HSTS;
  }
  return headers;
}

/** Fastify options derived from the security settings above and TRUST_PROXY. */
export function httpSecurityServerOptions(env: AppEnv) {
  return {
    bodyLimit: DEFAULT_BODY_LIMIT_BYTES,
    requestTimeout: REQUEST_TIMEOUT_MS,
    // Random, never taken from the request (a client-chosen id could forge log correlation).
    genReqId: () => randomUUID(),
    // Only the listed proxies may set X-Forwarded-For; none by default (packages/config).
    trustProxy: env.TRUST_PROXY.length > 0 ? env.TRUST_PROXY : false,
  };
}

/** Safe public messages for client errors raised by Fastify or its plugins (bad JSON, body too
 * large, wrong content type, rate limiting…). Never the internal error message. */
const CLIENT_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  400: "Invalid request.",
  404: "Not found.",
  405: "Method not allowed.",
  408: "Request timeout.",
  413: "Request body too large.",
  415: "Unsupported media type.",
  429: "Too many requests.",
};

/** Adds the security headers, a no-store default and the request id to every reply. */
function addSecurityHeaders(nodeEnv: AppEnv["NODE_ENV"]) {
  const headers = Object.entries(apiSecurityHeaders(nodeEnv));
  return function onSend(
    request: FastifyRequest,
    reply: FastifyReply,
    payload: unknown,
    done: (error: null, payload: unknown) => void,
  ): void {
    for (const [name, value] of headers) {
      if (!reply.hasHeader(name)) {
        reply.header(name, value);
      }
    }
    // Most API responses are per-user; a route that serves something cacheable says so itself.
    if (!reply.hasHeader("cache-control")) {
      reply.header("cache-control", "no-store");
    }
    reply.header("x-request-id", request.id);
    done(null, payload);
  };
}

/**
 * Client errors (4xx) get a safe, status-specific message and are logged at `info` without a stack
 * (any client can trigger them — they must not flood the error log). Everything else is a generic
 * 500, logged in full through the allowlisting error serializer (logging/error-serializer.ts).
 */
function handleError(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const status = error.statusCode;
  if (status !== undefined && status >= 400 && status < 500) {
    request.log.info({ statusCode: status, code: error.code }, "request.rejected");
    return reply
      .status(status)
      .send({ error: CLIENT_ERROR_MESSAGES[status] ?? "Invalid request." });
  }
  request.log.error({ err: error }, "Unhandled request error");
  return reply.status(500).send({ error: "Internal Server Error" });
}

/** Answers a request no route matched, or returns undefined to fall through to the JSON 404. */
export type NotFoundFallback = (
  request: FastifyRequest,
  reply: FastifyReply,
) => FastifyReply | undefined;

/**
 * Registers the headers, the error handler and the not-found handler on the root instance.
 * `notFoundFallback` (M17): serves the SPA shell to page navigations when the API serves the SPA.
 */
export function registerHttpSecurity(
  app: FastifyInstance,
  env: AppEnv,
  notFoundFallback?: NotFoundFallback,
): void {
  app.addHook("onSend", addSecurityHeaders(env.NODE_ENV));
  app.setErrorHandler(handleError);
  // Fastify's default 404 echoes the method and path back.
  app.setNotFoundHandler(
    (request, reply) =>
      notFoundFallback?.(request, reply) ?? reply.code(404).send({ error: "Not found." }),
  );
}
