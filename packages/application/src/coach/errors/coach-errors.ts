/**
 * Why a coaching turn could not be answered (M23, ADR-034). Each maps to one safe HTTP response in
 * `apps/api`; none of them carries a provider message, a URL, a key or a stack, because the mapper
 * only ever sees these types.
 *
 * The product rule behind them: the coach is an enhancement. Every failure here must leave the rest
 * of the application usable and say so to the learner.
 */

/** The deployment has the coach switched off (`AI_COACH_PROVIDER=disabled`). */
export class CoachUnavailableError extends Error {
  constructor() {
    super("The AI Coach is not enabled in this environment.");
    this.name = "CoachUnavailableError";
  }
}

/** The provider refused the request for a reason retrying will not fix (4xx other than 429). */
export class CoachProviderRejectedError extends Error {
  constructor(detail: string) {
    super(`The AI provider rejected the request (${detail}).`);
    this.name = "CoachProviderRejectedError";
  }
}

/** The provider is down, overloaded, or unreachable. */
export class CoachProviderUnavailableError extends Error {
  constructor(detail: string) {
    super(`The AI provider is unavailable (${detail}).`);
    this.name = "CoachProviderUnavailableError";
  }
}

/** The provider's own quota or rate limit, not ours. */
export class CoachProviderRateLimitedError extends Error {
  constructor() {
    super("The AI provider is rate limiting this project.");
    this.name = "CoachProviderRateLimitedError";
  }
}

/** Our own timeout. Never retried: the abandoned call may still be billed. */
export class CoachTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`The AI provider did not answer within ${timeoutMs} ms.`);
    this.name = "CoachTimeoutError";
  }
}

/** The provider is misconfigured (no key, unknown model, authentication refused). */
export class CoachConfigurationError extends Error {
  constructor(detail: string) {
    super(`The AI Coach is misconfigured (${detail}).`);
    this.name = "CoachConfigurationError";
  }
}

/** The provider answered, but not with anything usable — or kept asking for tools forever. */
export class CoachResponseError extends Error {
  constructor(detail: string) {
    super(`The AI provider's response could not be used (${detail}).`);
    this.name = "CoachResponseError";
  }
}

/** This process is already handling as many coaching turns as it allows at once. */
export class CoachBusyError extends Error {
  constructor() {
    super("Too many AI Coach requests are in flight.");
    this.name = "CoachBusyError";
  }
}

/** A bounded set of categories for metrics and logs. Never a provider message. */
export function categorizeCoachError(error: unknown): string {
  if (error instanceof CoachTimeoutError) return "timeout";
  if (error instanceof CoachProviderRateLimitedError) return "rate_limited";
  if (error instanceof CoachProviderUnavailableError) return "unavailable";
  if (error instanceof CoachProviderRejectedError) return "rejected";
  if (error instanceof CoachConfigurationError) return "configuration";
  if (error instanceof CoachResponseError) return "bad_response";
  if (error instanceof CoachBusyError) return "busy";
  if (error instanceof CoachUnavailableError) return "disabled";
  return "unknown";
}
