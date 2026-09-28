# M17 — Hosting Options

Status: **PENDING USER DECISION** — no provider is selected; nothing has been deployed or signed up for.
Date: 2026-09-27 · Related: [ADR-015](../adr/adr-015-deployment.md) (PENDING), [ADR-028](../adr/adr-028-production-runtime-and-deployment.md)

All figures below were read from each provider's **official** pricing/documentation pages on
2026-09-27. Free tiers and prices change; re-check the linked page immediately before signing up.
"Not verified" means the page could not be read or did not state it — it is not an assumption.

## What the application needs from a host

From the actual repository (M17), not from preference:

| Requirement                                     | Why                                                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Run a Docker image (or build from a Dockerfile) | The artifact is `infrastructure/docker/app.Dockerfile` — one Node 24 process serving API + SPA.           |
| Long-running Node server                        | Fastify + argon2 (native addon) + a Postgres pool. Not serverless functions, not static hosting.          |
| **One** instance                                | Rate limits, the audio cache and video jobs are in memory (ADR-027/028).                                  |
| HTTPS on a custom domain, one origin            | `SameSite=Strict` session cookie + Origin check against `APP_BASE_URL`.                                   |
| Custom HTTP response headers                    | The M16 CSP/HSTS/frame headers are sent by the app itself — the host must not strip them.                 |
| Secrets as environment variables                | `DATABASE_URL`, `AUTH_SESSION_SECRET`, `EMAIL_LINK_SECRET`, later provider keys.                          |
| Outbound TLS to Postgres                        | Neon (ADR-005); production requires `sslmode=require`+.                                                   |
| SIGTERM with ≥ 10 s grace; HTTP health checks   | Graceful shutdown is bounded at 8 s; `/health` liveness, `/ready` readiness.                              |
| A one-off command before release                | `node dist/migrate.js --migrations-root /app/migrations` (pre-deploy/release command, or a Jenkins step). |
| Known proxy address range                       | `TRUST_PROXY` must list the proxy; "trust all" is refused by the config.                                  |

Persistent disk is **not** required (nothing is stored locally; video is disabled in production).

## Compute options

| Option                 | Docker                                                         | Cheapest always-on (official page)                                                                  | Free tier (official page)                                                                                                    | TLS / custom domain                                                              | Notes                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Railway**            | Builds a Dockerfile; custom path via `RAILWAY_DOCKERFILE_PATH` | Hobby **$5/month including $5 of usage**; RAM ≈ $10/GB-month, CPU ≈ $20/vCPU-month, egress $0.05/GB | $5 one-time trial credit, 30 days                                                                                            | Custom domains (CNAME + TXT), certificates provisioned and renewed automatically | Proxy IP range, forwarded-IP header, HTTP→HTTPS redirect and health-check details **not verified**. Pre-built registry images: not stated on the page read. |
| **Fly.io**             | Yes (Machines)                                                 | shared-cpu-1x: 256 MB ≈ $3.29, 512 MB ≈ $4.93, 1 GB ≈ $7.21 /month (Ashburn)                        | No compute allowance stated; first 10 single-hostname certificates free                                                      | $0.10/month per extra hostname certificate                                       | Egress $0.02/GB (EU/NA).                                                                                                                                    |
| **Koyeb**              | Yes (registry or Dockerfile)                                   | eco-nano 256 MB $1.61/month (limited regions); nano 256 MB $2.68/month                              | One Free instance per organization: 512 MB, 0.1 vCPU; Frankfurt or Washington; **scales to zero after 1 h without traffic**  | Ten custom domains free, then $0.20/month each                                   | A scaled-to-zero instance loses in-memory rate limits on every wake-up.                                                                                     |
| **Render**             | Yes                                                            | Paid instance prices: **not verified** (pricing page did not render)                                | 750 free instance hours/month; spins down after 15 min idle, ~1 min spin-up. Render itself: "Do not use them for production" | Not verified                                                                     | Free Render Postgres expires after 30 days and has **no backups** — not a DB option.                                                                        |
| **Google Cloud Run**   | Yes                                                            | **Not verified** (pricing page did not render)                                                      | Not verified                                                                                                                 | Not verified                                                                     | Scale-to-zero serverless containers; same in-memory caveat as Koyeb.                                                                                        |
| **VPS (e.g. Hetzner)** | Yes (you run Docker)                                           | **Not verified** (price table did not render)                                                       | —                                                                                                                            | You configure TLS (e.g. a reverse proxy) yourself                                | Most control, most maintenance: OS updates, TLS, firewall, backups are yours.                                                                               |
| **GitHub Pages**       | **No** — static files only                                     | —                                                                                                   | Free; 1 GB site, soft 100 GB/month                                                                                           | Yes                                                                              | **Not viable**: cannot run the API; its terms exclude SaaS and "sensitive transactions" such as passwords; no custom response headers.                      |

## Database (already decided: Neon, ADR-005 — not provisioned)

| Plan   | Official figures (2026-09-27)                                                                                                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free   | 0.5 GB storage/project, 100 CU-hours/project, scale-to-zero after 5 min (cannot be disabled), **restore window 6 hours (1 GB limit)**; when CU-hours run out, compute is suspended until the next period |
| Launch | Pay-as-you-go, no minimum; $0.106/CU-hour; storage $0.35/GB-month; **restore window up to 7 days**; automated backup schedules on paid plans (snapshots $0.09/GB-month)                                  |

Railway also offers Postgres, but moving the database is not needed: Neon works from any host over TLS.

## Other services

| Service         | Status                                                 | Official figures                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image registry  | **PENDING REGISTRY DECISION**                          | GitHub Container Registry: storage and bandwidth "currently free"; GitHub Free includes 500 MB storage / 1 GB transfer for private packages (shared with Actions). The image is ~242 MB uncompressed. Not needed if the host builds from the Dockerfile (Railway, Render, Koyeb). |
| Email (ADR-014) | **PENDING** (blocker B-2)                              | Resend (documented target only): Free 3,000 emails/month, 100/day, 3 domains; Pro $20/month for 50,000. Marketing priced separately (Free 1,000 contacts).                                                                                                                        |
| Domain          | **PENDING USER/INFRASTRUCTURE DECISION**               | Bought from a registrar; not verified here.                                                                                                                                                                                                                                       |
| CI/CD           | Existing Jenkins + SonarQube (self-hosted)             | No new cost.                                                                                                                                                                                                                                                                      |
| AI (Gemini)     | Disabled in production until ADR-013 terms are decided | —                                                                                                                                                                                                                                                                                 |
| Media storage   | None (video disabled)                                  | —                                                                                                                                                                                                                                                                                 |

## Cost summary

| Item      | FREE                                  | LOW-COST                          | PAID       | PENDING                   |
| --------- | ------------------------------------- | --------------------------------- | ---------- | ------------------------- |
| Frontend  | Served by the API (no separate cost)  |                                   |            |                           |
| Backend   | Koyeb Free (sleeps — not recommended) | Railway Hobby, Fly.io, Koyeb nano |            | Provider choice           |
| Database  | Neon Free (6 h restore window)        | Neon Launch (7 days)              |            | Plan choice, RPO          |
| Email     | Resend Free (100/day)                 |                                   | Resend Pro | Provider choice (ADR-014) |
| Media, AI | Disabled                              |                                   |            | ADR-012/013               |
| CI/CD     | Self-hosted Jenkins/SonarQube         |                                   |            |                           |
| Registry  | GHCR / host-side build                |                                   |            | Registry choice           |
| Domain    |                                       | Registrar                         |            | Domain choice             |

## Free-only candidate stack (user requirement, 2026-09-27: "something free")

The user stated the target is **free**. With the verified figures above, a zero-cost combination
exists — listed as a candidate, **still PENDING USER DECISION**:

| Piece      | Free option                                                                    | Consequence for this app                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App        | Koyeb Free instance (512 MB, 0.1 vCPU, one per organization, sleeps after 1 h) | Cold start on the first request after idle; in-memory rate limits reset on every wake-up; argon2 login is slow on 0.1 vCPU. No second free instance for staging (staging = `validate-image.sh` locally). |
| App (alt.) | Render Free (sleeps after 15 min, ~1 min spin-up, 750 h/month)                 | Render itself says not for production.                                                                                                                                                                   |
| Database   | Neon Free                                                                      | 6 h restore window only; compute suspended when the 100 CU-hours run out; scale-to-zero cold start. Logical backups (`pg_dump`) become the real backup.                                                  |
| Domain     | The host's generated subdomain with its TLS certificate                        | `APP_BASE_URL=https://<app>.koyeb.app` (or similar). A custom domain is **not** free.                                                                                                                    |
| Email      | Resend Free (100/day, 3,000/month)                                             | Whether sending to arbitrary recipients requires a verified own domain is **not verified** — if so, email forces buying a domain. Adapter still to be written (ADR-014).                                 |
| Migrations | Run from Jenkins/the operator's machine against Neon (`node dist/migrate.js`)  | No dependency on a host pre-deploy command.                                                                                                                                                              |
| Registry   | Not needed (Koyeb/Render build from the Dockerfile) or GHCR                    | —                                                                                                                                                                                                        |

Accepting this stack means explicitly accepting: no SLA anywhere, sleeping instances, a 6-hour
point-in-time window plus manual `pg_dump` backups, and single-instance in-memory rate limiting.
Verify before deploying: Koyeb's proxy range for `TRUST_PROXY`, forwarded-IP header, SIGTERM grace
period and health-check configuration (none verified in M17).

## Update 2026-09-28 (user feedback)

- **Koyeb:** when the user tried it, it asked for payment and did not work for them. Its site now shows the banner
  "Koyeb is joining Mistral! Stay tuned for a revamped Agentic experience." (reported by the user; terms of the
  transition not verified). Treated as **not usable** for this project.
- **AWS** (Lightsail container service Nano $7/month, verified 2026-09-27): **rejected by the user** — not free (and the
  project brief excludes AWS). DynamoDB is not an option either: the data layer is relational PostgreSQL.
- **Remaining free candidate:** Render Free web service (750 free instance hours/month, spins down after 15 min idle,
  ~1 min spin-up; Render says not for production — verified 2026-09-27) + Neon Free + the `onrender.com` subdomain.
  Whether Render Free needs a payment card was **not verified**. Zero-cost fallback: run the image on the developer
  machine behind a temporary Cloudflare quick tunnel (not verified; online only while the machine runs).
- Consequence of a zero-cost requirement: a **public demo/staging** (`NODE_ENV=staging`, fake email) is achievable;
  production is not, because a real email provider in practice needs a verified own domain (not free) and production
  refuses the fake provider.

## Technical assessment (not a selection)

- **Best technical fit for the current code:** an always-on single small container behind a platform
  that builds this Dockerfile and manages TLS — Railway (Hobby) and Fly.io fit; Koyeb's paid nano too.
  Scale-to-zero free tiers work but reset in-memory rate limits and add a cold start on top of Neon's.
- **Must be verified with the chosen provider before deploying:** proxy IP range (for `TRUST_PROXY`),
  forwarded-client-IP header, SIGTERM grace period, health-check configuration, HTTP→HTTPS redirect,
  pre-deploy command support (for migrations), log retention, rollback to a previous deployment.
- **Not viable:** GitHub Pages (static only; terms exclude this use).

**Decision owner:** the user. Until then: no deploy, no account creation, ADR-015 stays PENDING.
