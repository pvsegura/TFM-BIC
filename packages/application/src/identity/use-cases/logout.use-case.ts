import type { SessionRepository } from "../ports/session-repository.js";
import type { TokenGenerator } from "../ports/token-generator.js";

export interface LogoutInput {
  sessionToken: string;
}

/** Idempotent/safe with no valid session (M3 brief: "be safe when called
 * without a valid session") — a missing session is simply not found, not
 * an error. */
export class LogoutUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly tokenGenerator: TokenGenerator,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const tokenHash = this.tokenGenerator.hash(input.sessionToken);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);
    if (session) {
      await this.sessionRepository.revoke(session.id);
    }
  }
}
