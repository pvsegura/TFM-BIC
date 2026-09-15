# Dependency Management Policy

Status: ACCEPTED | Related: [dependency-upgrades skill](../../.claude/skills/dependency-upgrades/SKILL.md)

**Never install or upgrade to "latest" blindly.** Before installing or upgrading any dependency:

1. Check the current stable version (not a pre-release, unless deliberately opted into).
2. Check compatibility with the project's Node.js version.
3. Check compatibility with the project's TypeScript version.
4. Check peer dependencies resolve cleanly.
5. Check the changelog for breaking changes relevant to how the project uses the package.
6. Check for open security advisories on the current and target version.
7. Document the decision (in the relevant ADR if it's a stack-level choice, or a commit message
   for a routine bump).
8. Run the test suite.
9. Run lint.
10. Run typecheck.
11. Run build.

Only after all of the above passes is the dependency change committed (`chore:` or `build:`,
per [commit-convention.md](commit-convention.md)).

## Applies to

Every dependency decision left PENDING in the ADRs (workspace tool in ADR-002, backend framework
version in ADR-004, ORM in ADR-005, etc.) goes through this checklist when it's finally installed
— the ADR records the *architectural* reasoning; this policy governs the *mechanical* act of
adding it to `package.json`.
