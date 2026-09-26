# Personal-data export format (version 1)

Status: ACCEPTED (M15, [ADR-026](../adr/adr-026-privacy-data-management.md)). Not legal advice — see the
[disclaimer](README.md).

`GET /data-management/export` (session only) returns the caller's data as a JSON attachment. The schema is
`personalDataExportSchema` in `packages/contracts/src/privacy/privacy.schema.ts`; the version constant is
`PERSONAL_DATA_EXPORT_VERSION` (domain). **Changing the shape means bumping the version** — never a silent change.

## Structure

All timestamps are ISO 8601 UTC strings. Arrays are ordered oldest first.

```jsonc
{
  "exportVersion": "1",
  "generatedAt": "2026-09-26T10:00:00.000Z",
  "account": { "userId", "email", "role", "emailVerified", "createdAt", "updatedAt" },
  "profile": { "firstName", "lastName", "nickname", "avatarId", "createdAt", "updatedAt" } | null,
  "learning": {
    "lessons": [{ "lessonId", "status", "startedAt", "completedAt", "updatedAt" }],
    "exerciseAttempts": [{ "exerciseId", "submittedAnswer", "correct", "answeredAt" }]
  },
  "vocabulary": { "items": [{ "vocabularyItemId", "status", "createdAt", "updatedAt", "learnedAt" }] },
  "phonetics": { "items": [{ "phoneticRepresentationId", "status", "firstViewedAt", "lastViewedAt", "practicedAt", "completedAt" }] },
  "gamification": {
    "totalPoints": 35,                      // derived from the ledger, as everywhere else (M8)
    "pointTransactions": [{ "reason", "sourceId", "amount", "createdAt" }],
    "achievements": [{ "key", "unlockedAt" }]
  },
  "media": { "videoGenerationJobs": [{ "jobId", "videoDefinitionId", "status", "errorCategory", "createdAt", "updatedAt", "completedAt" }] },
  "communication": {
    "essentialEmails": "always-on",         // transactional email cannot be switched off (M14)
    "newsletter": { "status", "consentVersion", "consentSource", "requestedAt", "confirmedAt", "unsubscribedAt" } | null
  },
  "teaching": {
    "linkedTeachers": [{ "linkedAt" }],     // as a student: when a teacher was linked (not who)
    "linkedStudentCount": 0                 // as a teacher: a count, never the students' data
  },
  "notIncluded": ["…human-readable list of what is deliberately left out…"]
}
```

## Deliberately excluded (and listed in `notIncluded`)

| Excluded                                                             | Why                                                                                                                                                                   |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `password_hash`, session/verification/reset token hashes             | Security credentials (SECURITY_SENSITIVE)                                                                                                                             |
| `unsubscribe_key`, `confirmation_token_hash`, `confirmation_sent_at` | Credentials / internal cooldown bookkeeping                                                                                                                           |
| `normalized_email`                                                   | A derived copy of `email`, already exported                                                                                                                           |
| Teacher identity on a link; linked students' data                    | Another person's personal data. **PENDING product decision:** whether a student should be told which teacher can see their data (tied to M13's open notice question). |
| `provider_job_reference`, `media_reference`                          | INTERNAL infrastructure data (a provider reference and a server file path)                                                                                            |
| Server logs                                                          | Not in the database; hosting-dependent                                                                                                                                |

## Security

| Measure                          | How                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Authenticated, session user only | `authenticate` preHandler; no user id anywhere; any query parameter is a `400`                                                           |
| No IDOR                          | The read model is called with `request.currentUser.id` only (tested: another user's id in the query is refused, only the caller is read) |
| Allowlists at three layers       | Explicit SQL column lists → field-by-field mapping in the use case → contract schema strips unknown fields                               |
| Consistent snapshot              | All reads in one `REPEATABLE READ, READ ONLY` transaction                                                                                |
| Not cached                       | `Cache-Control: private, no-store`; the web client uses a mutation (never the query cache)                                               |
| Not sniffed / not rendered       | `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment`                                                                     |
| File name reveals nothing        | `tfm-bic-personal-data-YYYY-MM-DD.json` (date only); the client accepts only a plain `*.json` name                                       |
| No public URL, no temporary file | Generated per request in memory; the browser saves it from an object URL revoked immediately                                             |
| Not logged                       | Only `privacy.data_export_generated` with the user id                                                                                    |
| Rate limited                     | 5 per hour per client IP (each export reads every store; a person has no reason to export more often)                                    |

Generation is synchronous: the data per user is bounded by content size (a fixed number of statements, one per
store). No queue was introduced.
