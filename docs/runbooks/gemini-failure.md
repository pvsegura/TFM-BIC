# Runbook: Gemini (audio generation) failures

Alert: ≥ 3 audio provider failures and ≥ 50 % failure ratio over 15 min. Medium. Applies only when
`AUDIO_GENERATION_PROVIDER=gemini` (today every deployment uses `disabled` or `fake` — ADR-013 PENDING).

## 1. Symptoms

"Audio generation failed" lines; users get a safe audio error (502/503/504 by category); the rest of the app works.

## 2. Possible causes

By `category` on `provider_calls_total{operation="audio"}` and on the route's log line: `provider_rate_limited`
(quota/free-tier limit) · `provider_unavailable` (Google outage/network) · `timeout` · `provider_rejected` (request
refused) · `provider_configuration` (bad/revoked `GEMINI_API_KEY`, wrong `GEMINI_TTS_MODEL`). Only on the route's log
line: `busy` — our own limit of 4 concurrent generations, reached before the provider is called.

## 3. First checks

1. The dominant category (metrics or log search on `Audio generation failed`).
2. Google AI status page and the project's quota page (**PROVIDER-SPECIFIC**).
3. Was the key or model changed recently?

## 4. Logs / metrics to inspect

`provider_calls_total{provider="gemini",operation="audio"}`, `provider_call_duration_ms`, the audio route's
success/failure lines (generation id, content ids, `durationMs`). The text sent to Gemini is **never** logged.

## 5. Safe mitigation

Set `AUDIO_GENERATION_PROVIDER=disabled` and redeploy: a clear 503, no provider calls. Configuration category →
rotate/fix the key in the host's secret store (M17 secrets management). Rate limit → wait for the quota window.

## 6. Rollback considerations

Not release-related unless the adapter or model changed in the last deploy.

## 7. Escalation

Project owner → Google AI support/billing.

## 8. Recovery verification

A generation succeeds; failure ratio back near 0 over 15 min; re-enable (`gemini`) only after a manual test.
