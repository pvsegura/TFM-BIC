export class InvalidLevelIdError extends Error {
  constructor(value: string) {
    super(`"${value}" is not a valid CEFR levelId (expected one of a1, a2, b1, b2, c1, c2).`);
    this.name = "InvalidLevelIdError";
  }
}
