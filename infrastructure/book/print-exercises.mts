/**
 * Print rendering of exercises for the workbooks (Zeszyt ćwiczeń). The exercise is presented
 * through the same domain presenter as the web, so a scrambled order (ordering, matching) is
 * identical on paper and on screen. The answer key is built from the exercise's own data.
 */
import {
  createDefaultExerciseTypeRegistry,
  type Exercise,
} from "../../packages/domain/src/index.js";
import { escapeHtml as e } from "./book-shared.mts";

const registry = createDefaultExerciseTypeRegistry();
const LETTERS = "abcdefghij";

/** "3.14" when the exercise has a workbook placement, otherwise its order in the lesson. */
export function exerciseLabel(exercise: Exercise): string {
  return exercise.book
    ? `${String(exercise.book.unit)}.${String(exercise.book.number)}`
    : String(exercise.order);
}

function writingLines(count: number): string {
  return `<div class="lines">${'<div class="line"></div>'.repeat(count)}</div>`;
}

function body(exercise: Exercise): string {
  const presented = registry.present(exercise);
  switch (presented.type) {
    case "multiple-choice":
      return `<ol class="choices">${presented.options
        .map(
          (option, i) => `<li>☐ ${LETTERS[i] ?? ""}) <span lang="es">${e(option.text)}</span></li>`,
        )
        .join("")}</ol>`;
    case "true-false":
      return `<p class="tf">☐ Prawda &nbsp;&nbsp; ☐ Fałsz</p>`;
    case "text-answer":
      return writingLines(exercise.book?.lines ?? 1);
    case "ordering":
      return `<p class="tiles" lang="es">${presented.items
        .map((item) => `<span class="tile">${e(item)}</span>`)
        .join(" ")}</p>${writingLines(exercise.book?.lines ?? 1)}`;
    case "matching":
      return `<table class="match"><tbody>${presented.left
        .map(
          (left, i) =>
            `<tr><td>${String(i + 1)}. <span lang="es">${e(left)}</span></td><td class="box">___</td><td>${LETTERS[i] ?? ""}) ${e(presented.right[i] ?? "")}</td></tr>`,
        )
        .join("")}</tbody></table>`;
    case "gap-fill":
      return `<p class="gaps" lang="es">${presented.segments
        .map(
          (segment, i) =>
            e(segment) + (i < presented.segments.length - 1 ? '<span class="gap"></span>' : ""),
        )
        .join("")}</p>`;
    case "open-writing":
      return `<ul class="checklist">${presented.checklist
        .map((item) => `<li>☐ ${e(item)}</li>`)
        .join("")}</ul>${writingLines(exercise.book?.lines ?? Math.ceil(presented.maxWords / 9))}`;
  }
}

/** One exercise as it appears in the workbook. */
export function renderExercise(exercise: Exercise): string {
  return `<div class="exercise" id="ex-${e(exerciseLabel(exercise))}"><p class="prompt"><span class="num">${e(exerciseLabel(exercise))}</span> ${e(exercise.prompt)}</p>${body(exercise)}</div>`;
}

/** The answer-key line for an exercise (the "Rozwiązania" pages at the end of the workbook). */
export function answerKey(exercise: Exercise): string {
  switch (exercise.type) {
    case "multiple-choice": {
      const presented = registry.present(exercise);
      const options = presented.type === "multiple-choice" ? presented.options : [];
      const index = options.findIndex((o) => o.id === exercise.configuration.correctOptionId);
      return `${LETTERS[index] ?? "?"}) ${options[index]?.text ?? ""}`;
    }
    case "true-false":
      return exercise.configuration.correctAnswer ? "Prawda" : "Fałsz";
    case "text-answer":
      return exercise.configuration.acceptedAnswers.join(" / ");
    case "ordering":
      return exercise.configuration.items.join(exercise.configuration.joiner);
    case "matching": {
      const presented = registry.present(exercise);
      const right = presented.type === "matching" ? presented.right : [];
      return exercise.configuration.pairs
        .map((pair, i) => `${String(i + 1)}–${LETTERS[right.indexOf(pair.right)] ?? "?"}`)
        .join(", ");
    }
    case "gap-fill":
      return exercise.configuration.gaps.map((gap) => gap.accepted.join(" / ")).join("; ");
    case "open-writing":
      return `Przykład: ${exercise.configuration.modelAnswer}`;
  }
}

/** Styles for the printed exercises (black & white). */
export const EXERCISE_STYLE = `
.exercise { margin: 0 0 4mm; break-inside: avoid; }
.exercise .prompt { margin: 0 0 1.5mm; }
.exercise .num { display: inline-block; min-width: 9mm; font: 700 9.5pt "Segoe UI", Arial, sans-serif; border: .75pt solid #111; border-radius: 1mm; text-align: center; margin-right: 1.5mm; }
.choices { list-style: none; padding-left: 10mm; margin: 0; columns: 2; }
.tf { padding-left: 10mm; margin: 0; }
.tiles { padding-left: 10mm; margin: 0 0 1mm; }
.tile { display: inline-block; border: .5pt solid #555; padding: .5mm 2mm; margin: .5mm; }
.match { margin-left: 10mm; border-collapse: collapse; }
.match td { padding: .8mm 3mm .8mm 0; }
.match .box { width: 10mm; }
.gaps { padding-left: 10mm; line-height: 2; margin: 0; }
.gap { display: inline-block; width: 28mm; border-bottom: .75pt solid #111; margin: 0 1mm; }
.checklist { list-style: none; padding-left: 10mm; margin: 0 0 1mm; font-size: 9pt; }
.lines { padding-left: 10mm; }
.line { border-bottom: .5pt solid #888; height: 8mm; }
`;
