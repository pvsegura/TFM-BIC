/** Name of the cookie carrying the opaque session token — see ADR-006. */
export const SESSION_COOKIE_NAME = "tfm_bic_session";

/** 7 days, in seconds — matches LoginUseCase's session TTL. */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
