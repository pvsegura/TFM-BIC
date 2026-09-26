/**
 * Outcome of consuming a single-use token (M16, S-05). `consume` marks the token used **and**
 * checks it in one atomic step, so two simultaneous requests with the same token can never both
 * get `consumed` — the check-then-mark sequence it replaces could.
 */
export type TokenConsumption<Token> =
  { outcome: "consumed"; token: Token } | { outcome: "not_found" | "already_used" | "expired" };
