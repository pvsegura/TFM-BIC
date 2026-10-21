import {
  categorizeAudioGenerationError,
  categorizeCoachError,
  EmailDeliveryError,
  type AiAgentService,
  type AudioGenerationService,
  type EmailProvider,
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

type Operation = "audio" | "email" | "ai_coach";

async function measure<T>(
  metrics: MetricsRegistry,
  labels: { provider: string; operation: Operation },
  categorize: (error: unknown) => string,
  call: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  const record = (outcome: "success" | "failure", category: string) => {
    const durationMs = performance.now() - startedAt;
    metrics.increment("provider_calls_total", { ...labels, outcome, category });
    metrics.observe("provider_call_duration_ms", { ...labels, outcome }, durationMs);
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

/**
 * The AI Coach's agent provider (M23, ADR-034; or the fake). Both calls of a turn are measured —
 * the first request and each tool-result continuation — so `provider_calls_total` counts actual
 * provider requests, which is what the daily quota is spent on, not coaching turns.
 *
 * Nothing from the conversation is recorded: not the learner's message, not the answer, not a tool
 * argument, not a tool result, not the instructions. Only the provider name, the operation, the
 * outcome and a bounded failure category — all controlled values, as `metrics.ts` requires.
 */
export function instrumentAiAgent(
  inner: AiAgentService,
  provider: string,
  metrics: MetricsRegistry,
): AiAgentService {
  const labels = { provider, operation: "ai_coach" as const };
  return {
    respond: (request) =>
      measure(metrics, labels, categorizeCoachError, () => inner.respond(request)),
    continueWithToolResults: (continuation, results) =>
      measure(metrics, labels, categorizeCoachError, () =>
        inner.continueWithToolResults(continuation, results),
      ),
  };
}
