/**
 * A server-managed authentication session (ADR-006, OPTION A). The cookie
 * carries only the opaque token; `tokenHash` is what's persisted (a SHA-256
 * hash of the token), so a leaked row does not yield a usable session.
 */
export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  /** Set when the session was rotated (e.g. re-issued on login); informational. */
  readonly rotatedAt: Date | null;
}

export function isSessionExpired(session: Session, now: Date): boolean {
  return now.getTime() >= session.expiresAt.getTime();
}
