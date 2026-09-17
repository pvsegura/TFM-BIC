import { isSessionExpired, type User } from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type { SessionRepository } from "../ports/session-repository.js";
import type { TokenGenerator } from "../ports/token-generator.js";
import type { UserRepository } from "../ports/user-repository.js";

export interface ResolveSessionInput {
  sessionToken: string;
}

/**
 * Resolves a raw session token (from the cookie) to its `User` — used both
 * by `GET /auth/me` and by the `apps/api` auth preHandler that protects
 * other routes. Returns `null` rather than throwing for "not authenticated"
 * so callers choose their own response (401 vs treating the request as
 * anonymous) — never trusts anything but the token itself.
 */
export class ResolveSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly userRepository: UserRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: ResolveSessionInput): Promise<User | null> {
    const tokenHash = this.tokenGenerator.hash(input.sessionToken);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);
    if (!session || isSessionExpired(session, this.clock.now())) {
      return null;
    }

    const user = await this.userRepository.findById(session.userId);
    return user ?? null;
  }
}
