/** Deliberately omits the rejected input — names are personal data and this
 * error can end up in logs (see docs/security/security-baseline.md). */
export class InvalidProfileNameError extends Error {
  constructor() {
    super("Not a valid name.");
    this.name = "InvalidProfileNameError";
  }
}
