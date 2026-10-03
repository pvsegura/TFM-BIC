# ADR-033: Grammar reference

Status: ACCEPTED (M23)
Date: 2026-10-03

## Context

Learners asked for quick-lookup pages beside Phonetics — time adverbs, word formation, verbs and
conjugations, pronouns — in every course (Polish explained in English, English explained in Spanish).
Lessons teach in context; a learner in the middle of an exercise needs a table they can find in seconds.

## Decisions

1. **A separate, read-only content kind.** Topics live in `content/languages/<languageId>/grammar/<topicId>.json`,
   one file per topic, validated by a strict schema (`grammarFileSchema`): title, description, a category
   (shelf), an optional level, and sections made of a heading, a short text, a table and/or examples. Tables
   must have one cell per column in every row.
2. **No progress, no session.** Unlike Phonetics (M10), nothing is recorded: the API (`GET /grammar?language=`,
   `GET /grammar/:topicId`) is public and read-only like the catalog (ADR-018), rate limited with the public
   limit, and listed in the route inventory. Responses are allowlisted (no status, no order).
3. **Checked against the catalog at start-up.** `loadGrammarReference` runs after the catalog is valid: the
   language must be declared, the file must be in its language's folder and named by its id, ids carry the
   language prefix and are unique, the order is unique per shelf, and a published topic's level must be
   available. Any problem stops the server and fails `pnpm content:validate`, like every other content.
4. **Fixed shelves, data-driven content.** The categories (verbs, pronouns, nouns, adjectives, adverbs,
   prepositions, numbers, connectors, word formation) are a domain constant used only for grouping; nothing
   branches on a language.
5. **Web.** `/learn/grammar` lists a language's topics by shelf with a language switcher and an
   accent-insensitive search; `/learn/grammar/:topicId` shows the tables (scrollable on phones) and examples.
   A "Grammar" link sits next to "Phonetics".

## Alternatives considered

- **Reuse lessons of type `explanation`.** Rejected: content blocks have no tables, and reference pages would
  mix with the lesson flow, progress and videos.
- **Reuse Phonetics' model.** Rejected: it is built around per-student progress and a database table that a
  reference does not need.

## Consequences

- Adding a topic or a language's reference is adding JSON files; no code changes.
- The reference summarises the forms used in the course; it is not a complete grammar and should get the same
  native-speaker review as the courses.
- No new tests were added in this milestone at the product owner's request; the existing suites (including
  the route inventory) and `pnpm content:validate` cover it.
