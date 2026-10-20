import type { FastifyReply, FastifyRequest } from "fastify";

import type { MappedCatalogError } from "./catalog-error.mapper.js";

/** The one body for a request that does not match its schema: it never says which part failed. */
export const INVALID_REQUEST = { error: "Invalid request." } as const;

/** A per-user response (progress, state, a conversation): no shared cache — browser, proxy or
 * CDN — may keep any of it. */
export function noStore(reply: FastifyReply): void {
  void reply.header("Cache-Control", "private, no-store");
}

/** The user the request is for — always the session's, set by `authenticate`. */
export function sessionUserId(request: FastifyRequest): string {
  const user = request.currentUser;
  if (!user) {
    // Unreachable: `authenticate` replies 401 before any handler runs. Failing loudly beats
    // carrying on with no identity.
    throw new Error(`${request.method} ${request.url} ran without an authenticated user.`);
  }
  return user.id;
}

/**
 * The body of an authenticated handler: runs it, marks a successful result `noStore`, and turns a
 * domain error into the route's own safe response through `mapError`. A mapper rethrows what it
 * does not recognise, which leaves it to Fastify's central handler (generic 500, logged).
 */
export async function privateResponse<T>(
  reply: FastifyReply,
  mapError: (error: unknown) => MappedCatalogError,
  run: () => Promise<T>,
): Promise<T | FastifyReply> {
  try {
    const result = await run();
    noStore(reply);
    return result;
  } catch (error) {
    const mapped = mapError(error);
    return reply.code(mapped.statusCode).send(mapped.body);
  }
}
