import { createLanguageId, type LanguageId } from "@tfm-bic/domain";

import type { Clock } from "../ports/clock.js";

export interface GetHealthStatusInput {
  defaultLanguage: string;
  /** The running build (APP_VERSION) — public, never anything secret. */
  version: string;
}

export interface GetHealthStatusResult {
  status: "ok";
  timestamp: string;
  defaultLanguage: LanguageId;
  version: string;
}

/**
 * Minimal use case proving the layering pattern end to end (route ->
 * use case -> domain, via an injected port instead of direct I/O) without
 * implementing a real business feature. See docs/adr and
 * .claude/skills/project-architecture for the rule this demonstrates.
 */
export class GetHealthStatusUseCase {
  constructor(private readonly clock: Clock) {}

  execute(input: GetHealthStatusInput): GetHealthStatusResult {
    return {
      status: "ok",
      timestamp: this.clock.now().toISOString(),
      defaultLanguage: createLanguageId(input.defaultLanguage),
      version: input.version,
    };
  }
}
