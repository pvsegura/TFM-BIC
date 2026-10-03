# content/languages/pl

Polish — the first supported language. `language.json` registers it (`pl`, `polski`, `pl-PL`, `ltr`) and
declares every CEFR level, A1 to C2, as `available`. Each level has a **representative set** of lessons and
one explanation (A1: five items and nine exercises; A2–C2: six items and 10–12 exercises each), explained in
English. It covers the typical topics and grammar of each level — it is **not** a complete course at any
level, not exam preparation and not CEFR-certified. A native-speaker review is recommended before real use.

| Level | Focus |
| ----- | ----- |
| A1 | greetings, introductions, polite words, no articles, spelling and sounds |
| A2 | shopping, daily routine, past tense, directions, accusative, overview of cases |
| B1 | verb aspect, future and conditional, verbs of motion, the doctor's, opinions, genitive and locative |
| B2 | job interview, real and unreal conditions, reported speech, impersonal forms, arguing, verb prefixes |
| C1 | formal correspondence, participles, nominal style, hedging, idioms, register |
| C2 | literary forms, numerals in full, word order, irony, near-synonyms, regional Polish |

`vocabulary/` holds the A1 seed categories plus one category per later level (`town-and-shopping` A2,
`health-and-travel` B1, `work-and-society` B2, `formal-and-academic` C1, `nuance-and-style` C2), each entry
tagged with its `levelId`. `phonetics/` holds the A1 sounds. Videos and recorded audio exist for A1 only;
later levels are text, examples, dialogues and exercises until their media is generated.
