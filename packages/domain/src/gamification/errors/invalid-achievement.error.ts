export class InvalidAchievementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAchievementError";
  }
}
