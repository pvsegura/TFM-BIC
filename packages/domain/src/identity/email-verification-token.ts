import type { SecurityToken } from "./security-token.js";

/** Distinct nominal type from `PasswordResetToken` so a token issued for
 * one purpose cannot be type-checked as usable for the other, even though
 * the shape (and the `isTokenUsable` rule) is shared. */
export type EmailVerificationToken = SecurityToken;
