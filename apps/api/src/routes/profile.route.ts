import type { ResolveSessionUseCase } from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  profileResponseSchema,
  updateProfileRequestSchema,
  type ProfileResponse,
  type ProfileValidationErrorResponse,
} from "@tfm-bic/contracts";
import type { StudentProfile, User } from "@tfm-bic/domain";
import type { FastifyInstance } from "fastify";

import type { ProfileUseCases } from "../composition/profile-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { mapProfileError } from "./profile-error.mapper.js";

const INVALID_BODY_MESSAGE = "Invalid request body.";

/** The largest legitimate body is four short fields (well under 2 KB even
 * with every character JSON-escaped), so anything bigger is rejected (413)
 * before it is parsed — Fastify's 1 MB default is far more than this needs. */
const PATCH_BODY_LIMIT_BYTES = 4 * 1024;

const FIELD_KEYS = ["firstName", "lastName", "nickname", "avatarId"] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

function isFieldKey(key: unknown): key is FieldKey {
  return FIELD_KEYS.some((field) => field === key);
}

/** Attributes validation issues to the four editable fields. Anything else
 * (e.g. an unrecognized key like `role`) yields only the generic message. */
function toValidationErrorBody(error: {
  issues: readonly { path: readonly PropertyKey[]; message: string }[];
}): ProfileValidationErrorResponse {
  const fields: Partial<Record<FieldKey, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (isFieldKey(key) && fields[key] === undefined) {
      fields[key] = issue.message;
    }
  }
  return Object.keys(fields).length > 0
    ? { error: INVALID_BODY_MESSAGE, fields }
    : { error: INVALID_BODY_MESSAGE };
}

/**
 * Account facts (`email`, `role`) come from the authenticated identity; the
 * name/nickname/avatar come from the profile record (`null` while the student
 * has not saved one). Parsed through the response schema so nothing outside
 * the documented shape can ever be serialized.
 */
function toProfileResponse(user: User, profile: StudentProfile | null): ProfileResponse {
  return profileResponseSchema.parse({
    userId: user.id,
    firstName: profile?.firstName ?? null,
    lastName: profile?.lastName ?? null,
    nickname: profile?.nickname ?? null,
    avatarId: profile?.avatarId ?? null,
    email: user.email,
    role: user.role,
  });
}

export function registerProfileRoutes(
  app: FastifyInstance,
  deps: { useCases: ProfileUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, resolveSession, env } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(resolveSession);

  // There is deliberately no `:id` anywhere: both routes act only on the
  // authenticated user, whose id comes from the session (`request.currentUser`)
  // — never from the URL, query string or body.

  app.get("/profile", { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.currentUser;
    if (!user) {
      // Unreachable: `authenticate` already replied 401 — this satisfies the
      // type checker without duplicating that response.
      return reply.code(401).send({ error: "Unauthenticated" });
    }
    const profile = await useCases.getCurrentProfile.execute({ userId: user.id });
    return toProfileResponse(user, profile);
  });

  app.patch(
    "/profile",
    { bodyLimit: PATCH_BODY_LIMIT_BYTES, preHandler: [verifyOrigin, authenticate] },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) {
        return reply.code(401).send({ error: "Unauthenticated" });
      }

      // `.strict()`: any key beyond the four editable fields (role, userId,
      // email, emailVerified, ...) is a 400, not a silent drop.
      const parsed = updateProfileRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(toValidationErrorBody(parsed.error));
      }

      try {
        // Fields are mapped one by one — nothing from the body is spread onto
        // the input, and `userId` can only be the session's.
        const { firstName, lastName, nickname, avatarId } = parsed.data;
        const profile = await useCases.updateCurrentProfile.execute({
          userId: user.id,
          firstName,
          lastName,
          nickname,
          avatarId,
        });
        return toProfileResponse(user, profile);
      } catch (error) {
        const mapped = mapProfileError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );
}
