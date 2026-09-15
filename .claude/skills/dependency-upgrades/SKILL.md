---
name: dependency-upgrades
description: Mandatory checklist before installing or upgrading any dependency - version, Node/TS compatibility, peer deps, breaking changes, security advisories, then test/lint/typecheck/build. Use before any package.json change.
---

# Dependency Upgrades

Full policy: [docs/development/dependency-management.md](../../../docs/development/dependency-management.md).

## Before installing/upgrading anything

1. Current stable version (not a pre-release unless deliberate).
2. Compatibility with the project's Node.js version.
3. Compatibility with the project's TypeScript version.
4. Peer dependencies resolve cleanly.
5. Changelog reviewed for breaking changes relevant to this project's usage.
6. No open security advisories on the target version.
7. Decision documented (ADR if stack-level, commit message if routine).

## After installing/upgrading

8. Run the test suite.
9. Run lint.
10. Run typecheck.
11. Run build.

Only commit (`chore:`/`build:`) once all of the above pass.

## Never

- `npm install <pkg>@latest` (or equivalent) without going through the checklist above.
- Assume a version number, API shape, or compatibility claim without checking — this is a
  specific application of [anti-hallucination](../anti-hallucination/SKILL.md) to dependencies.
