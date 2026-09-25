/**
 * How the audio should sound, in the platform's own terms (M12, ADR-013). Never a provider's
 * voice name: an adapter maps each profile to whatever its provider needs.
 *
 * - `standard` — natural pace.
 * - `slow` — slower and clearer, for a learner hearing a word or sentence for the first time.
 */
export const VOICE_PROFILES = ["standard", "slow"] as const;
export type VoiceProfile = (typeof VOICE_PROFILES)[number];

export function isVoiceProfile(value: string): value is VoiceProfile {
  return (VOICE_PROFILES as readonly string[]).includes(value);
}
