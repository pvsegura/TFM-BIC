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
