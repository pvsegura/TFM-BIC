# content/exercises

Reserved. Exercises are **not** kept here: like lessons they belong to a language and level, so each one is a
file under `content/languages/<code>/levels/<level>/exercises/<exercise-id>.json`, tied to its lesson by
`lessonId`.

The exercise _types_ themselves (multiple choice, text answer, true/false) are code, not data: each has a
configuration schema, an evaluator and a view, and content cannot add one. See
[ADR-020](../../docs/adr/adr-020-exercises.md) and the exercises section of
[content-architecture.md](../../docs/architecture/content-architecture.md).
