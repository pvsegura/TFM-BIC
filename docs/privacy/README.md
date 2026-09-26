# Privacy documentation (M15)

Status: LIVE — technical documentation. **Not legal advice.**

> **Internal note.** This implementation provides technical privacy and data-management capabilities.
> It does not constitute legal advice or establish legal compliance. Final legal wording, lawful bases,
> retention periods, processor/controller roles, international transfer mechanisms, consent requirements,
> and other legal matters must be reviewed and approved by the appropriate legal/privacy professional before
> production use where required.

Every document here describes what the code **actually does** (inspected on 2026-09-26, branch
`feature/privacy-gdpr`). Anything that needs a legal or product decision is marked **PENDING** and says which
decision is needed; nothing is filled in by assumption.

| Document                                                         | What it answers                                                                     |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [M15-PRIVACY-DATA-MAP.md](M15-PRIVACY-DATA-MAP.md)               | What personal data exists, where, why, who reaches it, what leaves the system       |
| [M15-GDPR-SOURCES.md](M15-GDPR-SOURCES.md)                       | Which official sources were checked, for what, and which could not be fetched       |
| [DATA-CLASSIFICATION.md](DATA-CLASSIFICATION.md)                 | The four internal classes and the rules they drive (logging, API, export, deletion) |
| [PROCESSING-REGISTER.md](PROCESSING-REGISTER.md)                 | Technical processing register and retention register (legal bases PENDING)          |
| [DATA-DELETION-MATRIX.md](DATA-DELETION-MATRIX.md)               | What account deletion does to every table, and what it cannot reach                 |
| [DATA-EXPORT-FORMAT.md](DATA-EXPORT-FORMAT.md)                   | The export's schema (version 1), exclusions and security                            |
| [EXTERNAL-DATA-FLOWS.md](EXTERNAL-DATA-FLOWS.md)                 | What reaches Gemini, Hyperframes, an email provider, the database host              |
| [THIRD-PARTY-SERVICES.md](THIRD-PARTY-SERVICES.md)               | Subprocessor/third-party inventory, DPA and transfer status (all PENDING)           |
| [TEACHER-DATA-ACCESS.md](TEACHER-DATA-ACCESS.md)                 | Exactly what a teacher can and cannot see, and how it is enforced                   |
| [M15-PRIVACY-RISK-ASSESSMENT.md](M15-PRIVACY-RISK-ASSESSMENT.md) | Lightweight technical risk check (current vs future vs pending review)              |

Architecture decision: [ADR-026](../adr/adr-026-privacy-data-management.md). The older overview,
[security/privacy-gdpr.md](../security/privacy-gdpr.md), now points here.
