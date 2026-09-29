# Runbook: Hyperframes (video generation) failures

Alert: ≥ 2 `video.render_failed` over 30 min. Low. Applies only when `VIDEO_GENERATION_PROVIDER=hyperframes`, which
production refuses and no deployment uses today (adapter unverified, no persistent media storage — ADR-012/028).

## 1. Symptoms

Video jobs end `failed`; `video.render_failed` lines; users see the failed state on the video page.

## 2. Possible causes

By `category`: `provider_unavailable` (Hyperframes CLI, headless Chrome or FFmpeg missing on the host) · `timeout` ·
`provider_rejected` (render project invalid) · `unknown`. Also: the process restarted mid-render — the job is
in-process and non-durable (ADR-012) and stays `processing` with no `video.render_completed`/`failed` line.

## 3. First checks

1. `video.render_started` vs `video.render_completed` / `video.render_failed` counts and categories.
2. Host has Chrome/FFmpeg and disk space (**PROVIDER-SPECIFIC**).
3. Restarts in the window (`server.started`).

## 4. Logs / metrics to inspect

`provider_calls_total{operation="video"}` and `provider_call_duration_ms{operation="video"}`; `video.render_*`
lines (`videoDefinitionId`, `durationMs`, `category`). The job owner is not in these lines.

## 5. Safe mitigation

`VIDEO_GENERATION_PROVIDER=disabled` and redeploy.

## 6. Rollback considerations

Only if a release changed the adapter or the video scripts.

## 7. Escalation

Project owner.

## 8. Recovery verification

A test render reaches `video.render_completed` and the job shows `completed`.
