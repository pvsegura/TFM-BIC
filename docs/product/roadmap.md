# Future Roadmap

Status: PROPOSED — direction only, not scheduled/implemented.

The architecture (content-as-data, `languageId` parameterization, hexagonal service interfaces)
is designed so the following can be added without rearchitecting:

- Additional languages (English, Spanish, German, French, Italian, Portuguese, ...) — new
  `content/languages/<id>/` trees, no new components/logic.
- Levels A2–C2 for Polish, then for each new language.
- Blog.
- Kids-oriented content track.
- Deeper phonetics/pronunciation/speaking tooling.
- Spaced repetition for vocabulary review.
- AI tutor / adaptive learning / recommendations — would need its own AI-integration ADR(s),
  following the same interface-behind-adapter pattern as ADR-011.
- Leaderboards (extends Gamification context — see [domain-model.md](../architecture/domain-model.md)).
- Mobile application — would consume the same `packages/contracts` API, new presentation layer
  only if architecture holds as intended.
- CMS / content-editor UI — swaps the `ContentRepository` filesystem adapter for a CMS/DB adapter
  (see [content-architecture.md](../architecture/content-architecture.md)); domain/application
  unaffected by design.
- Admin dashboard — uses the `ADMIN`/`CONTENT_EDITOR`/`SUPPORT`/`MODERATOR` roles reserved in
  [ADR-006](../adr/adr-006-authentication.md).

None of the above is scheduled or implemented as of M0.
