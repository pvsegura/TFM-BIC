# MVP Definition

Status: PROPOSED — definition only, not implemented in M0.

## Scope

- Registration, login, logout, email verification.
- Student profile (name, surname, nickname, avatar selection).
- Student dashboard (points, progress, level, completed lessons, next lesson, exercises, scores,
  recent activity, achievements, skill progress).
- Lessons with video + audio, for **Polish A1** only.
- Exercises (a first subset of the extensible exercise-type system — exact subset PENDING product
  scope decision, not fixed in M0).
- Points and progress tracking.
- Vocabulary (Polish A1).
- Basic teacher dashboard (student list, progress, lessons completed, exercise results).
- Newsletter signup.
- Legal pages (Terms, Privacy, Data Management, Contact) — content PENDING legal review, see
  [privacy-gdpr.md](../security/privacy-gdpr.md).
- Dark mode, responsive UI.
- Automated testing per [testing-strategy.md](../testing/testing-strategy.md).
- CI/CD per [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md).

## Explicitly out of MVP scope

A2–C2 content, additional languages, advanced gamification (streaks, badges, XP, leaderboards),
AI tutor, adaptive learning, mobile app, CMS/content-editor UI, admin dashboard — see
[roadmap.md](roadmap.md).

## Dependencies on PENDING decisions

MVP cannot be fully implemented until ADR-004 (backend framework), ADR-005 (DB provider),
ADR-006 (session mechanism), ADR-014 (email provider), and ADR-015 (hosting) are resolved. Video/
audio-dependent lessons additionally depend on ADR-012/ADR-013 verification holding up at
implementation time.
