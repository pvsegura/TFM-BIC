/**
 * A narrator character (M21, ADR-031): the voice a whole lesson is told in. The domain only knows
 * its id and display name; how a provider realises it (a prebuilt voice name, a model, a style
 * instruction) is adapter configuration kept in content/languages/<lang>/media/narrators.json and
 * read only by the generation pipeline's composition root.
 *
 * Consistency is by configuration: every clip of one lesson is generated with the same provider
 * settings. It is not a guaranteed biometric identity — the provider does not promise that two
 * generations with the same prebuilt voice are indistinguishable.
 */
export interface Narrator {
  id: string;
  displayName: string;
}

export const NARRATOR_ID_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;

export function isNarratorId(value: string): boolean {
  return NARRATOR_ID_PATTERN.test(value);
}
