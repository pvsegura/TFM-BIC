# Runbook: Email provider failures

Alert: ≥ 3 `email.delivery_failed` in 15 min, or every attempt failing. High (verification and password-reset
emails depend on it). Today only the `fake` adapter exists (ADR-014 PENDING) — it sends nothing, so this runbook
becomes live when a real adapter is added.

## 1. Symptoms

Users do not receive verification/reset/newsletter emails; `email.delivery_failed` lines; `provider_calls_total`
failures with `operation="email"`.

## 2. Possible causes

Provider outage · API key revoked/rotated · sending domain not verified / DNS (SPF, DKIM) changed · provider quota
(free tiers cap daily volume) · sender address refused.

## 3. First checks

1. Ratio of `email.delivery_failed` to `email.delivery_accepted` and the `category`/`template` affected
   (transactional vs marketing).
2. Provider status page and dashboard (**PROVIDER-SPECIFIC** — no provider chosen).
3. Recent secret or DNS changes.

## 4. Logs / metrics to inspect

`email.delivery_*` (category, template, adapter, outcome — never the recipient, subject or links);
`provider_calls_total{operation="email"}` (`provider_error` vs `unknown`); `provider_call_duration_ms{operation="email"}`.
"Accepted" means accepted by the provider, not delivered to the inbox.

## 5. Safe mitigation

Fix the key/domain in the host's secret store and restart. There is no retry queue (M14: best effort) — users can
request a new verification or reset email once it works. Do not look up recipients to "resend" from logs; they are
not there by design.

## 6. Rollback considerations

Roll back only if a release changed the email adapter or templates.

## 7. Escalation

Project owner → email provider support.

## 8. Recovery verification

A real test message (to an operator address) is accepted and arrives; no `email.delivery_failed` for 15 min.
