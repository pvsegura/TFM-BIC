/**
 * The encodings a generated clip can have. Only what an adapter actually returns today is listed
 * (the Gemini and fake adapters both return a RIFF/WAV file — see ADR-013); a new entry is added
 * only when a provider really produces it.
 */
export const AUDIO_FORMATS = ["audio/wav"] as const;
export type AudioFormat = (typeof AUDIO_FORMATS)[number];
