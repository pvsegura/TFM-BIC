import type { User } from "@tfm-bic/domain";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by the `authenticate` preHandler once a valid session is
     * resolved — undefined for anonymous requests. Never trust any other
     * source (headers, body) for identity — see docs/adr/adr-006-authentication.md. */
    currentUser?: User;
  }
}
