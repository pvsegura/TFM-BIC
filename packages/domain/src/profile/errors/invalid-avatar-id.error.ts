/** Deliberately omits the rejected value — it is client-controlled input. */
export class InvalidAvatarIdError extends Error {
  constructor() {
    super("Not a valid avatar.");
    this.name = "InvalidAvatarIdError";
  }
}
