# content/languages/pl

Polish — the first supported language. `language.json` registers it (`pl`, `polski`, `pl-PL`, `ltr`) and
declares every CEFR level, A1 to C2, as `available`. Each level has a **representative set** of lessons and
explanations (A1: eight items and 18 exercises; A2–C2: nine items and 16–21 exercises each), explained in
English. It covers the typical topics and grammar of each level — it is **not** a complete course at any
level, not exam preparation and not CEFR-certified. A native-speaker review is recommended before real use.

| Level | Focus |
| ----- | ----- |
| A1 | greetings, introductions, polite words, no articles, spelling and sounds, numbers and age, family, days of the week |
| A2 | shopping, daily routine, past tense, directions, accusative, overview of cases, the restaurant, weather and seasons, the home |
| B1 | verb aspect, future and conditional, verbs of motion, the doctor's, opinions, genitive and locative, comparison, making arrangements, must/can/should |
| B2 | job interview, real and unreal conditions, reported speech, impersonal forms, arguing, verb prefixes, complaints, relative clauses with który, żeby clauses |
| C1 | formal correspondence, participles, nominal style, hedging, idioms, register, concession and contrast, diminutives, negotiating |
| C2 | literary forms, numerals in full, word order, irony, near-synonyms, regional Polish, proverbs, particles, public speaking |

`vocabulary/` holds the A1 categories (including `days-and-time`) plus categories for the later levels
(`town-and-shopping`, `home-and-weather` and `eating-out` A2; `health-and-travel` and `plans-and-comparisons`
B1; `work-and-society` and `services-and-complaints` B2; `formal-and-academic` and `business-and-argument`
C1; `nuance-and-style` and `sayings-and-rhetoric` C2), each entry tagged with its `levelId`. `phonetics/` holds the A1 sounds. Lesson videos and word audio are
generated in batches (see `media/plan.json`); a lesson or word without media yet is shown as text, examples,
dialogues and exercises.
