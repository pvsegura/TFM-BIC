# Security Baseline

Status: ACCEPTED (baseline principles) | Related: [ADR-006](../adr/adr-006-authentication.md)

Principles to be applied from the first line of implementation code, not retrofitted.

## Authentication & authorization

- Passwords hashed with a modern, salted algorithm — exact algorithm/cost factor PENDING,
  verified against current best practice at implementation time (see ADR-006).
- All authorization checks enforced server-side (`apps/api`); UI-level role hiding is UX only,
  never the security boundary.
- Session/token mechanism PENDING (ADR-006) — whichever is chosen, tokens/session secrets are
  never logged.

## Input/output validation

- All external input (HTTP bodies, query params, route params) validated with Zod schemas from
  `packages/contracts` before reaching application/domain code.
- Output encoding handled by React's default escaping — no `dangerouslySetInnerHTML` without a
  documented, reviewed reason (e.g., sanitized rich content).

## Common vulnerability classes

- **XSS**: rely on React's default escaping; sanitize any HTML explicitly allowed into the DOM
  (e.g., rich-text lesson content) with a vetted sanitizer at the point of storage or render.
- **SQL injection**: repository implementations use parameterized queries/query builder, never
  string-concatenated SQL.
- **CSRF**: dependent on session mechanism choice (ADR-006) — SameSite cookies or CSRF tokens as
  appropriate once decided.
- **Rate limiting**: applied at the API layer for auth endpoints (login, password reset,
  registration) at minimum, to blunt credential-stuffing/enumeration.
- **Secure headers**: standard security headers (CSP, HSTS, X-Content-Type-Options, etc.) set at
  the API/reverse-proxy layer (`infrastructure/nginx/`) — exact CSP policy deferred until frontend
  asset/CDN strategy (tied to ADR-015) is known.

## Secrets

- No secret ever committed to Git. `.env.example` documents variable _names_ only.
- Environment variables validated (presence + shape) at process startup, failing fast rather than
  behaving unpredictably with a missing secret.
- CI secrets (DB URL, provider API keys, SonarQube token) stored as Jenkins credentials, never in
  `Jenkinsfile`/`sonar-project.properties`/shell steps/logs — see
  [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md#secrets) (implemented M2: the SonarQube
  token today, via the SonarQube Scanner plugin's own credential binding).

## Dependency security

- Dependency updates follow [dependency-management.md](../development/dependency-management.md),
  including a security-advisory check before upgrading.
- Automated dependency audit as a CI step — **not yet added** to the M2 `Jenkinsfile` (its stage
  list is lint/format/typecheck/test/coverage/build/E2E/SonarQube/Quality Gate only); mechanism
  (`pnpm audit` as an explicit stage vs. relying on SonarQube's dependency-vulnerability checks)
  still open.

## Audit logging

- Privacy-relevant and destructive actions (account deletion, data export, role changes) are
  audit-logged — detail owned by the Privacy & Data Management context (see
  [domain-model.md](../architecture/domain-model.md)).

## Least privilege

- Database credentials used by the API scoped to only what the API needs; no shared "admin"
  credential reused across environments.
- Provider API keys (Gemini, email, Hyperframes-hosted-if-applicable) scoped/rotated per current
  provider capability — verified per provider, not assumed uniform.
