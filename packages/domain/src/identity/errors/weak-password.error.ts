/** Does not include the raw password in the message — never log/expose it. */
export class WeakPasswordError extends Error {
  constructor(reason: string) {
    super(`Password does not meet requirements: ${reason}`);
    this.name = "WeakPasswordError";
  }
}
