import type { SecurityToken } from "./security-token.js";

/** See `EmailVerificationToken` — same shape, kept as a separate exported
 * name so repository/port interfaces stay unambiguous about which kind of
 * token they handle. */
export type PasswordResetToken = SecurityToken;
