import { InvalidTokenError, TokenAlreadyUsedError, TokenExpiredError } from "@tfm-bic/domain";

import type { TokenConsumption } from "./ports/token-consumption.js";

/** The consumed token, or the same domain error each outcome has always produced. */
export function requireConsumedToken<Token>(result: TokenConsumption<Token>): Token {
  switch (result.outcome) {
    case "consumed":
      return result.token;
    case "not_found":
      throw new InvalidTokenError();
    case "already_used":
      throw new TokenAlreadyUsedError();
    case "expired":
      throw new TokenExpiredError();
  }
}
