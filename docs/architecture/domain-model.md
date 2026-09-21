# Domain Model — Bounded Contexts

Status: PROPOSED (M0 analysis). Implemented so far: Identity & Authentication (M3), Student Profile
and the Media avatar catalog (M4) — every other context below is still unimplemented. | Related:
[ADR-001](../adr/adr-001-architecture-style.md)

This is a conceptual analysis of module boundaries, not a schema. No entities are implemented in
M0. Goal: avoid a "God Domain" by identifying responsibilities and relationships up front.

## Contexts

### Identity & Authentication

Registration, login, logout, email verification, password reset/hashing, session/token issuance,
role checks. Owns: credentials, sessions, roles. Does **not** own profile display data (nickname,
avatar) — that's Student/Teacher Profile. Roles (M0): `STUDENT`, `TEACHER`; reserved for later:
`ADMIN`, `CONTENT_EDITOR`, `SUPPORT`, `MODERATOR` (see [ADR-006](../adr/adr-006-authentication.md)).

### Users

Root identity record shared by all roles (id, email, role, status, timestamps). Student/Teacher
profiles reference a User; Users does not know Student/Teacher-specific fields.

### Student Profile

Name, surname, nickname, avatar selection, email/privacy preferences. Depends on Users
(identity) and Media (avatar options), not on Progress/Scoring.

_Implemented in M4_ (first name, last name, nickname, avatar): `student_profiles`, one row per user,
keyed by and foreign-keyed to `users.id`, with no copy of email or role — see
[ADR-017](../adr/adr-017-student-profile.md). Email/privacy preferences are not part of M4.

### Teachers / Students (relationship context)

Teacher-to-many-students association, invitations to link accounts. Must be designed for
pagination/filtering/efficient queries from the start (many students per teacher) — see
[architecture-overview.md](architecture-overview.md#non-functional-requirements).

### Languages

Language catalog (`languageId`, metadata, active/inactive). Root of the multi-language strategy —
every content-bearing context below is scoped by `languageId`. Implemented in M5 as validated JSON
behind a `ContentRepository` port — see [content-architecture.md](content-architecture.md) and
[ADR-018](../adr/adr-018-content-languages.md).

### Courses / Levels

Level catalog per language (A1–C2 for Polish initially — see
[content-architecture.md](content-architecture.md)). Courses are the structuring unit for lessons
within a level.

### Lessons

Ordered lesson content within a level/course: references to video, audio, vocabulary, exercises.
Lesson _metadata/progress_ is domain data; lesson _content_ (script, media) is `content/` data —
see Content Architecture for the split.

**As built in M6** ([ADR-019](../adr/adr-019-lessons.md)): a lesson is an M5 content item of `type: "lesson"`
identified by its `ContentId` (`LessonId`); the lesson experience adds only `LessonProgress` (per student:
`in_progress` | `completed`, with `startedAt`/`completedAt`; "not started" is derived) and the pure
transitions `startLesson` / `completeLesson`, which only move forward and are idempotent. Exercises, scoring
and points (below) remain later milestones and will attach to lesson progress without touching content.

### Exercises

Polymorphic exercise types (multiple choice, fill-in-the-blank, matching, listening,
pronunciation, translation, ordering, etc.). Owns exercise definitions and validation rules per
type; does not own attempts/scores (see Scoring).

### Scoring / Progress

Exercise attempts, correctness, points awarded, lesson-completion state, per-skill progress
rollups. Depends on Exercises (to validate) and feeds Gamification. This is a **critical flow**
requiring tests regardless of coverage thresholds (see
[testing-strategy.md](../testing/testing-strategy.md)).

### Gamification

Points totals, achievements, (future: streaks, badges, XP, leaderboards). Reads from
Scoring/Progress; does not itself calculate exercise correctness.

### Vocabulary

Word/meaning/example/pronunciation entries scoped by language, level, lesson, category. Mostly
`content/`-backed (see Content Architecture) with possible per-student interaction state
(e.g., "seen", "saved") living in the domain.

### Phonetics

Phonemes, IPA, minimal pairs, pronunciation exercises. Independent module so it can evolve
(e.g., speech scoring) without coupling to Vocabulary.

### Media

Avatar catalog, video/audio asset references (not the generation pipeline itself — see
[ai-integration-strategy.md](ai-integration-strategy.md)). Owns metadata/URLs, not binary storage
logic.

_Implemented in M4_ for the avatar catalog only: a small static list of ids and labels in
`packages/domain/src/media/`, re-exported through `packages/contracts`. Video/audio references are
not implemented.

### Email

Transactional email sending (verification, password reset, invitations) — distinct from
Newsletter. See [ADR-014](../adr/adr-014-email.md).

### Newsletter

Marketing-consent subscription, preferences, unsubscribe. Deliberately separate from
Email/Identity to keep marketing consent isolated from transactional flows (GDPR: different legal
basis) — see [privacy-gdpr.md](../security/privacy-gdpr.md).

### Subscriptions

Student subscription/plan state (if the product has paid tiers). Boundary kept distinct from
Identity so billing changes don't ripple into auth.

### Invitations

Generic invitation mechanism reused by "invite a friend" (Student) and "link student to teacher"
(Teachers). Modeled once, referenced by both contexts rather than duplicated.

### Privacy & Data Management

Account deletion requests, data export requests, consent records, audit trail of privacy actions.
Cross-cutting but modeled as its own context so it can be audited independently — see
[privacy-gdpr.md](../security/privacy-gdpr.md).

## Cross-context relationships (high level)

```
Identity <-- Student Profile / Teacher Profile
Teachers 1..* -- *..1 Students (via Teacher-Student relationship + Invitations)
Languages 1 -- * Courses/Levels 1 -- * Lessons 1 -- * Exercises
Exercises 1 -- * Exercise Attempts (Scoring) --> Progress --> Gamification
Lessons -- Vocabulary, Phonetics, Media (content references, scoped by languageId)
Privacy & Data Management -- reads/acts across Identity, Student Profile, Progress (deletion/export)
```

## Explicitly avoided in M0

No entity schemas, no ORM models, no migrations. This document is for module-boundary analysis
only, to prevent an accidental "God Domain" package once implementation starts.
