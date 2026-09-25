import { categorizeAudioGenerationError, type GenerateAudioResult } from "@tfm-bic/application";

interface LogContext {
  generationId: string;
  source: { type: string; vocabularyItemId: string; part: string };
  voice: string;
  durationMs: number;
}

/**
 * Structured log fields for one generation (M12 observability). Content ids, profile, provider,
 * model, cache use, size and duration — never the spoken text, the audio, or a provider's own
 * error message. The request id is added by Fastify's per-request logger.
 */
function common(context: LogContext) {
  return {
    generationId: context.generationId,
    sourceType: context.source.type,
    contentId: context.source.vocabularyItemId,
    part: context.source.part,
    voice: context.voice,
  };
}

export function audioGenerationSuccessLog(context: LogContext & { result: GenerateAudioResult }) {
  const { audio, cached } = context.result;
  return {
    audioGeneration: {
      ...common(context),
      status: "succeeded" as const,
      provider: audio.provider,
      model: audio.model,
      cached,
      bytes: audio.data.byteLength,
      durationMs: context.durationMs,
    },
  };
}

export function audioGenerationFailureLog(context: LogContext & { error: unknown }) {
  return {
    audioGeneration: {
      ...common(context),
      status: "failed" as const,
      failureCategory: categorizeAudioGenerationError(context.error),
      durationMs: context.durationMs,
    },
  };
}
