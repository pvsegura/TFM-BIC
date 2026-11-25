// Authoring helpers for A1 exercises (used to write units 1-2). Run from the repo root:
//   node infrastructure/content-authoring/<unit-script>.mjs
// New exercises get a temporary number; renumber(unit) assigns consecutive workbook numbers
// in PUENTE phase order. Then: pnpm content:validate and regenerate the books.
// Helpers to author A1 exercises as files and renumber a unit's workbook numbers by PUENTE phase.
import fs from "node:fs";

const ROOT_OF = (language, level) =>
  `c:/Users/usuario/TFM-BIC/content/languages/${language}/levels/${level}/`;
const ROOT = ROOT_OF("es", "a1");
const PH = [
  "perceive",
  "connect",
  "structure",
  "sound",
  "culture",
  "transform",
  "express",
  "review",
];

/** options.language / options.instruction / options.level: defaults es / pl / a1 (Spanish for Polish speakers). */
export function kit(unit, lessonId, startOrder = 300, options = {}) {
  const language = options.language ?? "es";
  const instruction = options.instruction ?? "pl";
  const level = options.level ?? "a1";
  const root = ROOT_OF(language, level);
  let order = startOrder;
  const list = [];
  const add = (id, phase, type, prompt, explanation, configuration, lines) => {
    order += 10;
    list.push({
      schemaVersion: 1,
      id,
      lessonId,
      languageId: language,
      levelId: level,
      type,
      status: "published",
      order,
      instructionLanguage: instruction,
      book: { unit, number: 150, phase, ...(lines ? { lines } : {}) },
      prompt,
      explanation,
      configuration,
    });
  };
  return {
    mc: (id, phase, prompt, explanation, options, correct = 0) =>
      add(id, phase, "multiple-choice", prompt, explanation, {
        options: options.map((text, i) => ({ id: `opt-${"abcd"[i]}`, text })),
        correctOptionId: `opt-${"abcd"[correct]}`,
      }),
    tf: (id, phase, prompt, explanation, value) =>
      add(id, phase, "true-false", prompt, explanation, { correctAnswer: value }),
    ta: (id, phase, prompt, explanation, accepted, lines = 1) =>
      add(
        id,
        phase,
        "text-answer",
        prompt,
        explanation,
        { acceptedAnswers: accepted, caseSensitive: false },
        lines,
      ),
    match: (id, phase, prompt, explanation, pairs) =>
      add(id, phase, "matching", prompt, explanation, {
        pairs: pairs.map(([left, right]) => ({ left, right })),
      }),
    order: (id, phase, prompt, explanation, items, joiner = " ") =>
      add(id, phase, "ordering", prompt, explanation, { items, joiner }, 1),
    gap: (id, phase, prompt, explanation, text, gaps) =>
      add(id, phase, "gap-fill", prompt, explanation, {
        text,
        gaps: gaps.map((accepted) => ({ accepted })),
        caseSensitive: false,
      }),
    write: (
      id,
      phase,
      prompt,
      explanation,
      modelAnswer,
      checklist,
      minWords,
      maxWords,
      lines = 6,
    ) =>
      add(
        id,
        phase,
        "open-writing",
        prompt,
        explanation,
        { modelAnswer, checklist, minWords, maxWords },
        lines,
      ),
    save() {
      for (const exercise of list) {
        fs.writeFileSync(
          `${root}exercises/${exercise.id}.json`,
          `${JSON.stringify(exercise, null, 2)}\n`,
        );
      }
      return list.length;
    },
  };
}

/** Gives a unit's exercises consecutive workbook numbers in PUENTE phase order. */
export function renumber(unit, options = {}) {
  const instruction = options.instruction ?? "pl";
  const ROOT = ROOT_OF(options.language ?? "es", options.level ?? "a1");
  const lessons = {};
  for (const f of fs.readdirSync(ROOT + "content")) {
    const j = JSON.parse(fs.readFileSync(ROOT + "content/" + f, "utf8"));
    lessons[j.id] = j.order;
  }
  const ex = fs
    .readdirSync(ROOT + "exercises")
    .map((f) => ({ f, j: JSON.parse(fs.readFileSync(ROOT + "exercises/" + f, "utf8")) }))
    .filter((x) => x.j.book?.unit === unit && x.j.instructionLanguage === instruction);
  ex.sort(
    (a, b) =>
      PH.indexOf(a.j.book.phase) - PH.indexOf(b.j.book.phase) ||
      lessons[a.j.lessonId] - lessons[b.j.lessonId] ||
      a.j.order - b.j.order,
  );
  ex.forEach(({ f }, i) => {
    const file = ROOT + "exercises/" + f;
    fs.writeFileSync(
      file,
      fs.readFileSync(file, "utf8").replace(/"number": \d+/, `"number": ${i + 1}`),
    );
  });
  return ex.length;
}

/** Adds image prompts to content/images/plan.json (skips assets already planned). */
export function planImages(items) {
  const file = "c:/Users/usuario/TFM-BIC/content/images/plan.json";
  const plan = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const item of items) if (!plan.some((p) => p.asset === item.asset)) plan.push(item);
  fs.writeFileSync(file, `${JSON.stringify(plan, null, 2)}\n`);
}
