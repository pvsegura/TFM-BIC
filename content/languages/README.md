# content/languages

The canonical, version-controlled source of every language the platform teaches, addressed by
language code (`pl/` today). Content here is **data, not code**: adding a language or level is adding
files, never changing application code.

```
languages/<code>/language.json                             metadata + which CEFR levels exist and their status
languages/<code>/levels/<levelId>/content/<contentId>.json one content item per file (file name = id)
```

Check your work with `pnpm content:validate` (the same loader the API runs at startup). Full rules,
formats and the "add a language" steps: [docs/architecture/content-architecture.md](../../docs/architecture/content-architecture.md)
and [ADR-018](../../docs/adr/adr-018-content-languages.md).
