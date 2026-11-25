import type { ResolveShortLinkUseCase } from "@verbysia/application";
import type { AppEnv } from "@verbysia/config";
import type { FastifyInstance, FastifyReply } from "fastify";

import { publicRateLimit } from "./public-rate-limit.js";

/** Where a link that does not (or no longer) resolve sends the reader: still somewhere useful. */
const FALLBACK = "/learn/lessons";

/**
 * Short links printed as QR codes in the books (PLAN-LIBROS.md §6):
 * `GET /k/:course/:unit[/:target]` → `302` to the lesson, section or workbook exercise. Public,
 * like the catalog: the target page applies its own access rules after the redirect. Always a
 * temporary redirect, so the destination can move without breaking printed copies, and always a
 * path on this site (never an absolute URL built from the request).
 */
export function registerShortLinkRoutes(
  app: FastifyInstance,
  deps: { resolve: ResolveShortLinkUseCase; env: AppEnv },
): void {
  const config = { rateLimit: publicRateLimit(deps.env) };

  const handler = async (
    params: { course: string; unit: string; target?: string },
    reply: FastifyReply,
  ) => {
    const path = await deps.resolve.execute(params);
    return reply.header("cache-control", "no-store").redirect(path ?? FALLBACK, 302);
  };

  app.get<{ Params: { course: string; unit: string } }>(
    "/k/:course/:unit",
    { config },
    async (request, reply) => handler(request.params, reply),
  );
  app.get<{ Params: { course: string; unit: string; target: string } }>(
    "/k/:course/:unit/:target",
    { config },
    async (request, reply) => handler(request.params, reply),
  );
}
