# Observability Data Policy

Status: M18 · 2026-09-29 · Decision record: [ADR-029](adr/adr-029-observability.md)

What the application observes about itself, what may and may not appear, where it goes and for how long. This is
an engineering policy, **not a legal assessment**: legal bases, retention approval and transfers remain with the
M15 privacy documents and their PENDING legal review ([docs/privacy/](privacy/README.md)).

## 1. What exists

| Signal                   | Where it is produced                                                          | Where it goes                                                        |
| ------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Operational logs (JSON)  | `apps/api` logger (`logging/logger-options.ts`)                               | Process stdout → the host's log viewer. Nothing else.                |
| HTTP/provider/DB metrics | `apps/api/src/observability/` (in memory)                                     | `GET /internal/metrics`, only if `METRICS_TOKEN` is set. Not stored. |
| Frontend error reports   | `apps/web/src/observability/client-error-reporter.ts` → `POST /client-errors` | One `client.error` log line. Not stored.                             |
| Health / readiness       | `GET /health` (liveness, release id), `GET /ready` (`{ ready }` only)         | The host's probes.                                                   |
| Audit events             | Existing structured log events (M15/M16), e.g. `privacy.account_deleted`      | Same log stream (see §6).                                            |

No third-party observability provider receives anything (no error tracker, APM, log shipper or analytics).

## 2. Fields that can appear

Every line: `time`, `level`, `service`, `env`, `version`, `msg`; inside a request `reqId`.

| Event                                                         | Extra fields                                                                                 | Personal data?                                                           |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `request.completed`                                           | `method`, `route` (template), `path` (no query), `statusCode`, `durationMs`, `remoteAddress` | **Client IP** (personal data). Path ids are catalog/job ids, not people. |
| `request.rejected` (4xx), `Unhandled request error` (5xx)     | `statusCode`, `code`; for 5xx the allowlisted error (type, redacted message/stack, code)     | No (SQL parameters and driver detail removed, M15)                       |
| `auth.*`, `privacy.*`, `newsletter.*`, lesson/exercise events | as before M18 — some carry the **user id** (UUID)                                            | User id (pseudonymous identifier)                                        |
| `email.delivery_*`                                            | category, template, adapter, outcome                                                         | No — never recipient, subject or links                                   |
| `Audio generated` / `Audio generation failed`                 | generation id, content ids, voice, duration, category                                        | No                                                                       |
| `video.render_*`                                              | provider, `videoDefinitionId`, `durationMs`, `category`                                      | No                                                                       |
| `ai_coach.turn_completed`                                     | mode, tool names, instruction version, token counts, history length                          | No — never the message, the answer, a tool argument or result            |
| `readiness.lost` / `readiness.restored`, `database.*`         | a safe reason code (SQLSTATE / Node code / `timeout`)                                        | No — never a host or connection string                                   |
| `client.error`                                                | `kind`, `name` (error class), `path` (pathname only)                                         | No (IP on the request line)                                              |
| `process.*` (fatal), `shutdown.*`, `server.started`           | allowlisted error, signal, timings                                                           | No                                                                       |

Metrics carry **only** controlled labels: HTTP method, route template (`unmatched` for 404s), status code,
provider name, operation, outcome, failure category, client-error kind. Each metric keeps at most 200 label sets;
excess collapses into `{ overflow: "true" }`.

## 3. Forbidden in logs, metrics and reports

Passwords · session cookies/tokens · `Authorization` headers · password-reset, email-verification and unsubscribe
tokens · API keys and secrets (`GEMINI_API_KEY`, `GEMINI_AGENT_API_KEY`, `AUTH_SESSION_SECRET`, `EMAIL_LINK_SECRET`, `METRICS_TOKEN`) · AI Coach conversations (a learner's message, the coach's answer, a tool argument or a tool result) ·
connection strings · query strings · request/response bodies · email addresses, names, email subjects/bodies ·
text sent to Gemini, generated audio or video · SQL bound parameters · browser error messages and stacks ·
localStorage/form values. As metric labels additionally: user ids, request ids, IPs, full URLs, free text.

## 4. Redaction rules (centralised — not left to each call site)

| Rule                                                                                                                                                                                                         | Where                                     | Tested by                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ---------------------------------------------------------- |
| `authorization`, `cookie`, `set-cookie`, and fields named `password`, `currentPassword`, `newPassword`, `token`, `apiKey`, `secret`, `authorization`, `cookie` (top level and one level down) → `[redacted]` | `logging/logger-options.ts`               | `logger-options.test.ts`                                   |
| Query strings dropped from every logged URL                                                                                                                                                                  | `logging/request-serializer.ts`           | `request-serializer.test.ts`, `http-observability.test.ts` |
| Errors serialized from an allowlist; `params:` lines scrubbed from messages/stacks                                                                                                                           | `logging/error-serializer.ts`             | `error-serializer.test.ts`                                 |
| Unhandled process errors go through the same logger                                                                                                                                                          | `lifecycle/process-lifecycle.ts`          | `process-lifecycle.test.ts`                                |
| Provider decorators record labels only, never request/response content                                                                                                                                       | `observability/instrumented-providers.ts` | `instrumented-providers.test.ts`                           |
| Client reports: closed schema, no free text; unsafe names/paths replaced before sending                                                                                                                      | contracts + web reporter                  | schema, route and reporter tests                           |

A new log call must not log a whole request, body, user or provider object; log ids and codes. Deeper nesting
than one level is not covered by name-based redaction — keep log objects flat.

## 5. Retention, access, providers, transfers

| Topic                  | Current state                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Retention              | Staging demo on Render: **7 days** (Hobby workspace, verified 2026-09-28), then deleted by the host. Metrics: until the process restarts/sleeps. Production retention: **PENDING** with the production host (ADR-015) and legal review (M15 PROCESSING-REGISTER). |
| Access                 | Logs: members of the host workspace (today: the project owner). Metrics: holders of `METRICS_TOKEN`. Keep both lists minimal.                                                                                                                                     |
| External providers     | Only the hosting platform (already a processor for all traffic, M15 THIRD-PARTY-SERVICES). No observability vendor.                                                                                                                                               |
| International transfer | Whatever the host's region/processing implies — assessed with the host, not added by M18.                                                                                                                                                                         |
| Export for incidents   | Copy only the needed time window and fields (M17 incident response), store it access-restricted, delete when the incident is closed.                                                                                                                              |

## 6. Operational logs vs audit events

- **Operational** (`request.completed`, errors, readiness, providers, client errors): reliability and
  debugging. May be sampled, dropped or reduced to `warn` without loss of any obligation.
- **Audit** (security/privacy-relevant actions: `auth.login_*`, `auth.password_reset_completed`,
  `privacy.account_deleted`, `privacy.data_export_generated`, `newsletter.*`): M15/M16 chose **logs-only audit**
  (no audit table). M18 does not change that and does not duplicate them. Do not lower their level or remove
  their fields without revisiting ADR-026.

## 7. Environment separation

`env` is on every line and in `/internal/metrics`. Tests run with the logger `silent`, never with the deployed
configuration, and the E2E server is a local process — no test writes to a deployed log stream. Each deployment
has its own host service and its own `METRICS_TOKEN`; never reuse a token across environments.

## 8. Failure modes

| If this fails…                        | …then                                                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| stdout / the host's log collector     | The process only writes to stdout; collection is the host's job. If the collector is down, lines are lost but requests are not affected. |
| the metrics registry                  | Invalid observations are ignored; recording never throws into a request.                                                                 |
| `/internal/metrics` scraping          | Nothing depends on it.                                                                                                                   |
| a browser report (`/client-errors`)   | Dropped silently, capped at 5 per page load; the page is unaffected.                                                                     |
| the host's health-check notifications | No alert reaches anyone — see the PENDING alert channel in [runbooks/README.md](runbooks/README.md).                                     |
