/** Thrown by the services in this folder for any non-2xx API response — the
 * message is already the safe, generic text the API returned (see
 * apps/api/src/routes/auth-error.mapper.ts), safe to show directly.
 * `fieldErrors` is set only when the API attributed a validation failure to
 * specific form fields (see services/profile-api.ts). */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** The API refuses a request for something that does not exist (404) or that
 * is malformed and so cannot exist (400) — both are "not found" to a person. */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 400);
}

/** What a person is told when the API gave no message of its own (network failure, bad body). */
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** The message to show for a failed request: the API's own fixed text, or the generic one. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
}
