import {
  categorizeAudioGenerationError,
  EmailDeliveryError,
  VideoGenerationTimeoutError,
  VideoProviderRejectedError,
  VideoProviderUnavailableError,
  type AudioGenerationService,
  type EmailProvider,
  type VideoGenerationService,
} from "@tfm-bic/application";

import type { MetricsRegistry } from "./metrics.js";

/**
 * Provider decorators (M18, ADR-029): each wraps a port from @tfm-bic/application and records
 * `provider_calls_total` / `provider_call_duration_ms` by provider, operation, outcome and a
 * bounded failure category. They live in the composition layer, so neither the domain nor the
 * application layer knows about metrics. Nothing from the request (text, recipient, subject,
 * links) or the provider's error message is recorded. Behaviour is unchanged: same result,
 * same error.
 */

type Operation = "audio" | "video" | "email";

interface EventLog {
  info(details: object, msg: string): void;
  warn(details: object, msg: string): void;
}

async function measure<T>(
  metrics: MetricsRegistry,
  labels: { provider: string; operation: Operation },
  categorize: (error: unknown) => string,
  call: () => Promise<T>,
  onDone?: (outcome: { durationMs: number; category: string | undefined }) => void,
): Promise<T> {
  const startedAt = performance.now();
  const record = (outcome: "success" | "failure", category: string) => {
    const durationMs = performance.now() - startedAt;
    metrics.increment("provider_calls_total", { ...labels, outcome, category });
    metrics.observe("provider_call_duration_ms", { ...labels, outcome }, durationMs);
    onDone?.({
      durationMs: Math.round(durationMs),
      category: outcome === "failure" ? category : undefined,
    });
  };
  try {
    const result = await call();
    record("success", "none");
    return result;
  } catch (error) {
    record("failure", categorize(error));
    throw error;
  }
}

/** Gemini TTS (or the fake). The audio route already logs each generation; this adds aggregates. */
export function instrumentAudioProvider(
  inner: AudioGenerationService,
  provider: string,
  metrics: MetricsRegistry,
): AudioGenerationService {
  return {
    generate: (request) =>
      measure(metrics, { provider, operation: "audio" }, categorizeAudioGenerationError, () =>
        inner.generate(request),
      ),
  };
}

/** The same categories the video use case stores on a failed job. */
function categorizeVideoError(error: unknown): string {
  if (error instanceof VideoProviderRejectedError) return "provider_rejected";
  if (error instanceof VideoGenerationTimeoutError) return "timeout";
  if (error instanceof VideoProviderUnavailableError) return "provider_unavailable";
  return "unknown";
}

/**
 * Hyperframes (or the fake). The render runs as an in-process background task (ADR-012) that
 * logged nothing, so this also writes its start and end. The definition id is catalog content,
 * not personal data; the job's owner is never logged here.
 */
export function instrumentVideoProvider(
  inner: VideoGenerationService,
  provider: string,
  metrics: MetricsRegistry,
  log: EventLog,
): VideoGenerationService {
  return {
    generate: (request) => {
      const context = { provider, videoDefinitionId: request.videoDefinitionId };
      log.info(context, "video.render_started");
      return measure(
        metrics,
        { provider, operation: "video" },
        categorizeVideoError,
        () => inner.generate(request),
        ({ durationMs, category }) => {
          if (category === undefined) {
            log.info({ ...context, durationMs }, "video.render_completed");
          } else {
            log.warn({ ...context, durationMs, category }, "video.render_failed");
          }
        },
      );
    },
  };
}

/** Email adapter. Each attempt is already logged (`email.delivery_*`); this adds aggregates. */
export function instrumentEmailProvider(
  inner: EmailProvider,
  metrics: MetricsRegistry,
): EmailProvider {
  return {
    name: inner.name,
    send: (message) =>
      measure(
        metrics,
        { provider: inner.name, operation: "email" },
        (error) => (error instanceof EmailDeliveryError ? "provider_error" : "unknown"),
        () => inner.send(message),
      ),
  };
}
