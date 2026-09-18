/** Thrown by services/auth-api.ts for any non-2xx auth API response — the
 * message is already the safe, generic text the API returned (see
 * apps/api/src/routes/auth-error.mapper.ts), safe to show directly. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
