---
name: language-learning
description: Domain knowledge for the language-learning product itself - skills taxonomy (grammar/vocabulary/reading/listening/writing/speaking/phonetics), exercise types, gamification, progress model. Use when designing lesson/exercise/progress features.
---

# Language-Learning Domain

## Skill categories a level's content must be able to express

Grammar, vocabulary, reading, listening, writing, speaking, phonetics/pronunciation, exercises,
video lessons, revision — as content categories (data), not separate code paths (see
[content-authoring](../content-authoring/SKILL.md)).

## Exercise types (extensible system, not a fixed enum baked into logic)

Multiple choice, fill-in-the-blank, matching, listening, pronunciation, translation, ordering,
vocabulary, grammar, reading, writing, true/false, flashcards. Each should be able to: register an
attempt, validate the answer, calculate a score, store the result, associate with a lesson,
associate with a skill, and contribute to progress — see
[domain-model.md](../../../docs/architecture/domain-model.md) (Exercises, Scoring/Progress).
None of these types are implemented in M0 — this is the extensibility contract for when they are.

## Progress / Gamification (MVP scope)

Points, lesson completion, exercise scores, basic achievements. Streaks, badges, XP, daily goals,
leaderboards are future roadmap, not MVP — see [roadmap.md](../../../docs/product/roadmap.md).
Don't build speculative gamification mechanics ahead of this scope.

## Levels

A1–C2, Polish first. See [content-authoring](../content-authoring/SKILL.md) for the UNKNOWN flag
on official competency-standard claims — don't assert specifics without a verified source.
