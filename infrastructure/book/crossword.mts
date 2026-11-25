/**
 * A small crossword (autodefinido) per unit for the workbook: words from the course vocabulary that
 * actually appear in the unit's lessons, clues are their translations. Deterministic: the same
 * content always gives the same grid. Letters are printed without accents (ñ is kept), as in
 * Spanish crossword puzzles.
 */
import { escapeHtml as e } from "./book-shared.mts";

export interface CrosswordWord {
  answer: string;
  clue: string;
}

interface Placed {
  word: string;
  clue: string;
  row: number;
  col: number;
  across: boolean;
  number: number;
}

export interface Crossword {
  grid: (string | null)[][];
  placed: Placed[];
}

const SIZE = 17;

/** Uppercase, no acute accents or diaeresis; ñ stays. */
export function crosswordLetters(word: string): string {
  return word
    .toUpperCase()
    .replace(/Ñ/g, "\u0000")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\u0000/g, "Ñ");
}

function canPlace(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  across: boolean,
): number {
  const dr = across ? 0 : 1;
  const dc = across ? 1 : 0;
  const endR = row + dr * (word.length - 1);
  const endC = col + dc * (word.length - 1);
  if (row < 0 || col < 0 || endR >= SIZE || endC >= SIZE) return -1;
  // the cells just before and after the word must be empty
  const before = grid[row - dr]?.[col - dc];
  const after = grid[endR + dr]?.[endC + dc];
  if (before || after) return -1;
  let crossings = 0;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid[r]?.[c] ?? null;
    if (cell) {
      if (cell !== word[i]) return -1;
      crossings++;
    } else {
      // no side neighbours for a new letter (they would form unintended words)
      const side1 = across ? grid[r - 1]?.[c] : grid[r]?.[c - 1];
      const side2 = across ? grid[r + 1]?.[c] : grid[r]?.[c + 1];
      if (side1 || side2) return -1;
    }
  }
  return crossings;
}

export function buildCrossword(words: CrosswordWord[], max = 10): Crossword | null {
  const candidates = words
    .map((w) => ({ word: crosswordLetters(w.answer), clue: w.clue }))
    .filter((w) => /^[A-ZÑ]{3,11}$/.test(w.word))
    .sort((a, b) => b.word.length - a.word.length || a.word.localeCompare(b.word));
  const unique = candidates.filter((w, i) => candidates.findIndex((x) => x.word === w.word) === i);
  if (unique.length < 4) return null;

  const grid: (string | null)[][] = Array.from({ length: SIZE }, () =>
    Array<string | null>(SIZE).fill(null),
  );
  const placed: Omit<Placed, "number">[] = [];
  const put = (word: string, clue: string, row: number, col: number, across: boolean) => {
    for (let i = 0; i < word.length; i++) {
      const r = row + (across ? 0 : i);
      const c = col + (across ? i : 0);
      (grid[r] as (string | null)[])[c] = word[i] ?? null;
    }
    placed.push({ word, clue, row, col, across });
  };

  const first = unique[0];
  if (!first) return null;
  put(
    first.word,
    first.clue,
    Math.floor(SIZE / 2),
    Math.floor((SIZE - first.word.length) / 2),
    true,
  );

  for (const candidate of unique.slice(1)) {
    if (placed.length >= max) break;
    let best: { row: number; col: number; across: boolean; score: number } | null = null;
    for (const p of placed) {
      for (let i = 0; i < p.word.length; i++) {
        for (let j = 0; j < candidate.word.length; j++) {
          if (p.word[i] !== candidate.word[j]) continue;
          const across = !p.across;
          const crossR = p.row + (p.across ? 0 : i);
          const crossC = p.col + (p.across ? i : 0);
          const row = across ? crossR : crossR - j;
          const col = across ? crossC - j : crossC;
          const score = canPlace(grid, candidate.word, row, col, across);
          if (score > 0 && (!best || score > best.score)) best = { row, col, across, score };
        }
      }
    }
    if (best) put(candidate.word, candidate.clue, best.row, best.col, best.across);
  }
  if (placed.length < 4) return null;

  // crop to the used area and number the starting cells row by row
  const rows = placed.flatMap((p) => [p.row, p.row + (p.across ? 0 : p.word.length - 1)]);
  const cols = placed.flatMap((p) => [p.col, p.col + (p.across ? p.word.length - 1 : 0)]);
  const r0 = Math.min(...rows);
  const c0 = Math.min(...cols);
  const cropped = grid
    .slice(r0, Math.max(...rows) + 1)
    .map((row) => row.slice(c0, Math.max(...cols) + 1));
  const starts = [
    ...new Set(placed.map((p) => `${String(p.row - r0)},${String(p.col - c0)}`)),
  ].sort((a, b) => {
    const [ar = 0, ac = 0] = a.split(",").map(Number);
    const [br = 0, bc = 0] = b.split(",").map(Number);
    return ar - br || ac - bc;
  });
  return {
    grid: cropped,
    placed: placed.map((p) => ({
      ...p,
      row: p.row - r0,
      col: p.col - c0,
      number: starts.indexOf(`${String(p.row - r0)},${String(p.col - c0)}`) + 1,
    })),
  };
}

export function renderCrossword(
  cw: Crossword,
  labels: { title: string; across: string; down: string; hint: string },
): string {
  const numberAt = new Map(cw.placed.map((p) => [`${String(p.row)},${String(p.col)}`, p.number]));
  const cells = cw.grid
    .map(
      (row, r) =>
        `<tr>${row
          .map((cell, c) => {
            if (!cell) return '<td class="cw-off"></td>';
            const n = numberAt.get(`${String(r)},${String(c)}`);
            return `<td class="cw-on">${n ? `<span class="cw-n">${String(n)}</span>` : ""}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  const list = (across: boolean) =>
    cw.placed
      .filter((p) => p.across === across)
      .sort((a, b) => a.number - b.number)
      .map(
        (p) =>
          `<li><strong>${String(p.number)}.</strong> ${e(p.clue)} (${String(p.word.length)})</li>`,
      )
      .join("");
  return `<div class="crossword"><h3 class="phase-head">${e(labels.title)}</h3><p class="cw-hint">${e(labels.hint)}</p>
<table class="cw-grid"><tbody>${cells}</tbody></table>
<div class="cw-clues"><div><p class="label">${e(labels.across)}</p><ul>${list(true)}</ul></div><div><p class="label">${e(labels.down)}</p><ul>${list(false)}</ul></div></div></div>`;
}

export const CROSSWORD_STYLE = `
.crossword { break-inside: avoid; margin-top: 5mm; }
.cw-hint { font-size: 9pt; margin: 0 0 2mm; }
.cw-grid { border-collapse: collapse; margin: 2mm auto 3mm; }
.cw-grid td { width: 7mm; height: 7mm; padding: 0; position: relative; }
.cw-on { border: .75pt solid #111; }
.cw-n { position: absolute; top: .3mm; left: .6mm; font: 6pt "Segoe UI", Arial, sans-serif; }
.cw-clues { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; font-size: 9.5pt; }
.cw-clues ul { list-style: none; padding: 0; margin: 0; }
.cw-clues li { margin: 0 0 1mm; }
`;
