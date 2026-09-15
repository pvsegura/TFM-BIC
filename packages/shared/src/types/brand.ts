/**
 * Nominal-typing helper. Lets domain value objects (e.g. LanguageId) be
 * structurally a `string`/`number` at runtime while remaining distinct
 * types at compile time, so a raw string can't be passed where a validated
 * value object is expected.
 */
export type Brand<T, BrandName extends string> = T & {
  readonly __brand: BrandName;
};
