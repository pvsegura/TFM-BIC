/**
 * Builds the Verbysia digital book (phase E) from the validated course content: one chapter per
 * A1 lesson with its explanations, examples and dialogue, and a QR code that opens the same lesson
 * (and its exercises) in the web app. HTML is rendered to PDF with headless Chrome/Edge.
 *
 *   packages/data/node_modules/.bin/tsx infrastructure/book/generate-book.mts            # sample
 *   packages/data/node_modules/.bin/tsx infrastructure/book/generate-book.mts --full     # full book
 *
 * The sample (first chapters) goes to apps/web/public/ksiazka/ (public download); the full book to
 * infrastructure/book/out/ (not committed, never public — it is a paid product once A1 is complete).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import QRCode from "qrcode";

import {
  escapeHtml,
  htmlToPdf,
  lessonUrl,
  loadA1,
  renderBlock,
  repoRoot,
  type Block,
} from "./book-shared.mts";

const SAMPLE_CHAPTERS = 3;
const full = process.argv.includes("--full");

const STYLE = `
@page { size: A4; margin: 18mm 16mm; }
body { font-family: "Segoe UI", Arial, sans-serif; color: #1d2433; font-size: 11pt; line-height: 1.45; }
h1, h2 { font-family: Georgia, serif; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.cover h1 { font-size: 34pt; margin: 0; }
.cover .brand { color: #e8a33d; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }
.cover .note { margin-top: 30mm; color: #5b6475; font-size: 10pt; }
.toc { page-break-after: always; }
.toc li { margin: 4px 0; }
.chapter { page-break-before: always; }
.chapter header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12mm; border-bottom: 2px solid #e8a33d; margin-bottom: 6mm; }
.chapter header h2 { margin: 0 0 4px; font-size: 18pt; }
.chapter header .desc { color: #5b6475; margin: 0 0 6px; }
.qr { text-align: center; font-size: 8pt; color: #5b6475; width: 34mm; }
.qr svg { width: 30mm; height: 30mm; }
.explanation { margin: 0 0 3mm; }
.example { border-left: 3px solid #e8a33d; padding: 1mm 0 1mm 4mm; margin: 0 0 3mm; break-inside: avoid; }
.example .es { font-weight: 700; margin: 0; }
.example .pl { margin: 0; }
.example .note, .pl { color: #5b6475; font-size: 9.5pt; margin: 0; }
.dialogue { border-collapse: collapse; width: 100%; margin: 2mm 0 4mm; break-inside: avoid; }
.dialogue th { text-align: left; vertical-align: top; padding: 1.5mm 3mm 1.5mm 0; width: 28mm; color: #8a5a12; }
.dialogue td { padding: 1.5mm 0; border-bottom: 1px solid #eee; }
.app { margin-top: 5mm; padding: 3mm 4mm; background: #fdf4e6; border-radius: 3mm; font-size: 10pt; }
footer.sample { page-break-before: always; text-align: center; padding-top: 80mm; }
`;

async function main() {
  const { lessons, exerciseCount } = await loadA1();
  const chapters = full ? lessons : lessons.slice(0, SAMPLE_CHAPTERS);

  const chapterHtml = await Promise.all(
    chapters.map(async (lesson, index) => {
      const url = lessonUrl(lesson.id);
      const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
      const exercises = exerciseCount.get(lesson.id) ?? 0;
      return `<section class="chapter" id="ch-${String(index + 1)}">
  <header>
    <div><h2>${escapeHtml(lesson.title)}</h2><p class="desc">${escapeHtml(lesson.description)}</p></div>
    <div class="qr">${qr}<div>Zeskanuj: lekcja i ćwiczenia</div></div>
  </header>
  ${(lesson.blocks as Block[]).map((b) => renderBlock(b)).join("\n  ")}
  <p class="app">W aplikacji: ${String(exercises)} ćwiczeń z wyjaśnieniami po polsku i powtórki słówek w trenerze pamięci. Link: ${escapeHtml(url)}</p>
</section>`;
    }),
  );

  const title = "Hiszpański metodą PUENTE · A1";
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${title}</title><style>${STYLE}</style></head><body>
<section class="cover">
  <p class="brand">Verbysia</p>
  <h1>Hiszpański<br>metodą PUENTE</h1>
  <p>Poziom A1 · od myślenia po polsku do mówienia po hiszpańsku</p>
  <p class="note">${full ? "Wersja pełna" : "Bezpłatna próbka"} · Wyjaśnienia po polsku · Każdy rozdział ma kod QR prowadzący do lekcji i ćwiczeń w aplikacji www.verbysia.com</p>
</section>
<section class="toc"><h2>Spis treści</h2><ol>${chapters.map((l) => `<li>${escapeHtml(l.title)}</li>`).join("")}</ol></section>
${chapterHtml.join("\n")}
${full ? "" : `<footer class="sample"><h2>To koniec próbki</h2><p>Kolejne rozdziały, ćwiczenia i trener pamięci znajdziesz na www.verbysia.com.</p></footer>`}
</body></html>`;

  const outDir = full
    ? path.join(repoRoot, "infrastructure/book/out")
    : path.join(repoRoot, "apps/web/public/ksiazka");
  mkdirSync(outDir, { recursive: true });
  const base = full ? "verbysia-hiszpanski-a1" : "verbysia-hiszpanski-a1-probka";
  const htmlFile = path.join(
    full ? outDir : path.join(repoRoot, "infrastructure/book/out"),
    `${base}.html`,
  );
  mkdirSync(path.dirname(htmlFile), { recursive: true });
  writeFileSync(htmlFile, html, "utf8");

  const pdf = path.join(outDir, `${base}.pdf`);
  htmlToPdf(htmlFile, pdf);
  console.log(`wrote ${path.relative(repoRoot, pdf)} (${String(chapters.length)} chapters)`);
}

await main();
