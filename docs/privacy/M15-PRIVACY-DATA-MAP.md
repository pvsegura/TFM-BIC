# M15 Privacy Data Map

Status: LIVE — factual inventory of the implementation, inspected 2026-09-26 (branch `feature/privacy-gdpr`,
built on M14). Not legal advice — see the [disclaimer](README.md).

Everything below was read from the code (Drizzle schemas and migrations, repositories, routes, the web app), not
from earlier documentation. Nothing was added to storage to complete this inventory.

## A–B. What personal data exists and where it is stored

One PostgreSQL database (Neon is the chosen provider, never provisioned; Docker Postgres in dev, in-process
PGlite in tests). Each bounded context owns its tables; **every user-owned table has a foreign key to
`users.id`** (`ON DELETE CASCADE`).

| Table (context)                           | Personal / user-related columns                                                                                                                                                                                 | Class (see [classification](DATA-CLASSIFICATION.md)) |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `users` (identity, M3)                    | `id`, `email`, `normalized_email`, `password_hash` (Argon2id), `role`, `email_verified`, `created_at`, `updated_at`                                                                                             | PERSONAL; `password_hash` SECURITY_SENSITIVE         |
| `sessions` (identity, M3)                 | `user_id`, `token_hash`, `created_at`, `expires_at`, `rotated_at`                                                                                                                                               | SECURITY_SENSITIVE                                   |
| `email_verification_tokens` (M3)          | `user_id`, `token_hash`, `created_at`, `expires_at`, `used_at`                                                                                                                                                  | SECURITY_SENSITIVE                                   |
| `password_reset_tokens` (M3)              | `user_id`, `token_hash`, `created_at`, `expires_at`, `used_at`                                                                                                                                                  | SECURITY_SENSITIVE                                   |
| `student_profiles` (profile, M4)          | `first_name`, `last_name`, `nickname`, `avatar_id` (catalog id, not an image), timestamps                                                                                                                       | PERSONAL                                             |
| `lesson_progress` (lessons, M6)           | `lesson_id`, `status`, `started_at`, `completed_at`, `updated_at`                                                                                                                                               | PERSONAL                                             |
| `exercise_attempts` (exercises, M7)       | `exercise_id`, `submitted_answer` (jsonb, free text for text-answer exercises), `correct`, `answered_at`                                                                                                        | PERSONAL                                             |
| `point_transactions` (gamification, M8)   | `reason`, `source_id`, `amount`, `created_at` (append-only; UPDATE refused by trigger, DELETE allowed)                                                                                                          | PERSONAL                                             |
| `user_achievements` (gamification, M8)    | `achievement_key`, `unlocked_at`                                                                                                                                                                                | PERSONAL                                             |
| `user_vocabulary` (vocabulary, M9)        | `vocabulary_item_id`, `status`, timestamps                                                                                                                                                                      | PERSONAL                                             |
| `user_phonetic_progress` (phonetics, M10) | `phonetic_representation_id`, `status`, view/practice/completion timestamps                                                                                                                                     | PERSONAL                                             |
| `video_generation_jobs` (video, M11)      | `id`, `video_definition_id`, `status`, `error_category`, timestamps; `provider_job_reference`, `media_reference` (server file path)                                                                             | PERSONAL; the two references INTERNAL                |
| `teacher_students` (teaching, M13)        | `teacher_id`, `student_id`, `linked_at`                                                                                                                                                                         | PERSONAL (about both users)                          |
| `newsletter_subscriptions` (M14)          | `status`, `consent_version`, `consent_source`, `requested_at`, `confirmed_at`, `unsubscribed_at`, `confirmation_sent_at`, `updated_at`; `unsubscribe_key`, `confirmation_token_hash`, `confirmation_expires_at` | PERSONAL; key and token hash SECURITY_SENSITIVE      |

**Not stored anywhere in the database:** IP addresses, user agents, date of birth, location, payment data,
audio clips (M12 returns them in the response; a bounded in-memory cache keyed by _content text_ only), rendered
video files per user, any analytics identifier.

**Outside the database:**

| Where                                                        | What                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API process logs (stdout, Pino)                              | Per request (one `request.completed` line since M18): method, route template, path **without query string**, **client IP address**, status, duration; every line also carries service, environment and release (M18). Events with a user id (see J). Cookies/authorization redacted. |
| `FakeEmailProvider` memory (all environments)                | The last 500 rendered emails (recipient address, subject, body with link tokens) — kept in process memory because no real provider exists (ADR-014/025). Lost on restart. Readable over HTTP only under `NODE_ENV=test`.                                                             |
| `InMemoryAudioCache` (API memory)                            | Generated clips keyed by content text + voice — **no user data**.                                                                                                                                                                                                                    |
| Hyperframes output (`content/video-scripts/<id>/output.mp4`) | One file per _content definition_, only if the real adapter runs — **no user data**.                                                                                                                                                                                                 |
| Browser                                                      | `tfm_bic_session` cookie (httpOnly, signed, SameSite=Strict, 7 days); `tfm-bic-theme` in localStorage (light/dark). TanStack Query cache in memory (cleared on logout/deletion).                                                                                                     |

## C. Why each category is stored (technical/product purpose)

| Data                                             | Technical/product purpose                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Account + credentials                            | Sign-in, account recovery, role-based access (student/teacher)                              |
| Sessions, tokens                                 | Keep a user signed in; single-use email verification and password reset                     |
| Profile                                          | Display name/nickname/avatar in the app and, when linked, to a teacher                      |
| Lesson, exercise, vocabulary, phonetics progress | Resume and show learning progress; server-side exercise evaluation history                  |
| Points, achievements                             | Gamification (M8)                                                                           |
| Video generation jobs                            | Track a requested render until it completes                                                 |
| Teacher links                                    | Authorise a teacher to see a student's learning metrics (M13)                               |
| Newsletter record                                | Demonstrate and honour marketing consent (double opt-in) and its withdrawal (M14)           |
| Request logs (IP)                                | Operations and security (rate limiting is by IP, in memory; logs record the IP per request) |

Legal bases for these purposes are **PENDING** — see [PROCESSING-REGISTER.md](PROCESSING-REGISTER.md).

## D. Which modules can access it

- Each context's repository reads/writes only its own tables, always filtered by the session user's id.
- **Teacher dashboard read model (M13)** reads `users`, `student_profiles`, `lesson_progress`,
  `exercise_attempts`, `point_transactions`, `user_achievements` of the teacher's **linked** students only.
- **Privacy context (M15)**: `SqlPersonalDataReadModel` reads the session user's rows in every table (explicit
  column lists); `DrizzleAccountErasureStore` deletes them.
- **Newsletter sender** reads `users.email` joined with `subscribed` records only.
- **Operator CLI** (`teacher:admin`) changes roles/links; anyone with database credentials can read everything.

## E. External providers that may receive it

Summary (detail: [EXTERNAL-DATA-FLOWS.md](EXTERNAL-DATA-FLOWS.md), [THIRD-PARTY-SERVICES.md](THIRD-PARTY-SERVICES.md)):

| Provider             | Active?                                      | Personal data sent                                       |
| -------------------- | -------------------------------------------- | -------------------------------------------------------- |
| Email provider       | **No** (fake only; ADR-014 PENDING)          | Would receive: address, subject, body (with link tokens) |
| Gemini TTS (Google)  | Off by default (`AUDIO_GENERATION_PROVIDER`) | None — catalog text only                                 |
| Hyperframes          | Off by default; runs **locally**             | None                                                     |
| Database host (Neon) | Chosen, never provisioned                    | Everything in the database                               |
| Hosting (ADR-015)    | PENDING                                      | Logs (incl. IP), all traffic                             |

## F. User-facing controls

| Control                                            | Where                    | Since |
| -------------------------------------------------- | ------------------------ | ----- |
| Edit/clear first name, last name, nickname, avatar | `/profile`               | M4    |
| Newsletter subscribe (double opt-in) / unsubscribe | `/profile`, email link   | M14   |
| **Download my data (JSON)**                        | `/profile` → Your data   | M15   |
| **Delete my account** (password + acknowledgement) | `/profile` → Your data   | M15   |
| Log out                                            | header                   | M3    |
| Privacy notice                                     | `/privacy` (footer link) | M15   |

Not available: email-address change (not implemented since M3), password change while signed in (only reset).

## G. Deletion operations that exist

Before M15: none (only `ON DELETE CASCADE` in the schema; no workflow). Unsubscribe (M14) withdraws consent but
keeps the record. Password reset revokes all sessions. **M15 adds account deletion** — see
[DATA-DELETION-MATRIX.md](DATA-DELETION-MATRIX.md).

## H. Email/marketing consent data

Only `newsletter_subscriptions` (M14): one row per user who ever asked to subscribe; states
`pending → subscribed → unsubscribed`; consent text version `NEWSLETTER_CONSENT_VERSION`; source `settings`;
timestamps. Transactional email has no consent record (it cannot be switched off). There is no generic
`emailOptIn` flag anywhere.

## I. What teachers can see

See [TEACHER-DATA-ACCESS.md](TEACHER-DATA-ACCESS.md).

## J. Logs that may contain personal data

| Log event                                                                                            | Personal fields                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| every request (`request.completed`, M18)                                                             | client IP (`remoteAddress`)                                                                                                                                                                                                    |
| `client.error` (M18: SPA error report)                                                               | none — kind, error class name and pathname only; the client IP is on its `request.completed` line                                                                                                                              |
| `auth.login_success`                                                                                 | `userId`                                                                                                                                                                                                                       |
| `newsletter.subscription_requested`, `newsletter.unsubscribed`                                       | `userId`                                                                                                                                                                                                                       |
| `teacher.student_viewed`                                                                             | `teacherId`, `studentId`                                                                                                                                                                                                       |
| `privacy.data_export_generated`, `privacy.account_deletion_refused`, `privacy.account_deleted` (M15) | `userId`                                                                                                                                                                                                                       |
| `Unhandled request error`                                                                            | **before M15:** Drizzle errors carried bound SQL parameters (e.g. email, password hash, token hashes) and Postgres `detail` (`Key (normalized_email)=(…)`). **Fixed in M15** (allowlist error serializer + message scrubbing). |

Never logged: passwords, cookies, authorization headers, query strings, export contents, exercise answers,
email subjects/bodies/recipients (M14 delivery events carry category/template/outcome only).

## K. Generated media and users

Video jobs belong to a user; the rendered media does not (one file per content definition). Audio clips are
generated from catalog text and never stored per user. No generated media contains user data.

## L. Identifiers exposed to clients

The user's own `id` (`/auth/me`, `/profile`, export); a teacher sees linked students' `studentId` (M13); video
job ids to their owner. No endpoint takes another user's id except the teacher detail route, which only resolves
through the teacher's own links (identical `404` otherwise).

## M–N. What can realistically be exported / deleted

Everything in the table in A–B that is PERSONAL, through one read model — see
[DATA-EXPORT-FORMAT.md](DATA-EXPORT-FORMAT.md). Everything in the database can be deleted in one transaction;
logs, the fake email capture, and any future provider-side copies cannot be reached by account deletion — see
[DATA-DELETION-MATRIX.md](DATA-DELETION-MATRIX.md).

## O. What was missing before M15 (and what M15 did)

| Gap                                                           | M15                                                                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| No account deletion workflow                                  | Implemented (password re-auth, one transaction, register guard)                                                |
| No data export                                                | Implemented (JSON v1, `no-store`, rate limited)                                                                |
| No privacy notice or policy version                           | `/privacy`, `privacy-policy-v1`, draft pending legal review                                                    |
| Error logs could contain SQL parameters                       | Fixed                                                                                                          |
| No inventory/classification/register                          | This folder                                                                                                    |
| Controller identity, lawful bases, retention, DPAs, transfers | **PENDING** — legal/product decisions, not engineering ones                                                    |
| Email change, restriction/objection workflows                 | Not implemented — see [PROCESSING-REGISTER.md](PROCESSING-REGISTER.md#data-subject-rights--technical-coverage) |
