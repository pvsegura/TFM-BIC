/**
 * Print edition of the Verbysia A1 book, for print-on-demand (Lulu; also fits Amazon KDP).
 * Produces two files in infrastructure/book/out/print/ (never committed — it is a paid product):
 *
 *   verbysia-a1-interior.pdf  6 x 9 in trim, pages 6.25 x 9.25 in (0.125 in bleed all round),
 *                             0.5 in safety margin + 0.2 in gutter on the binding edge, first page
 *                             is a right-hand page, black & white friendly, even page count.
 *   verbysia-a1-cover.pdf     one-piece spread: back + spine + front, 0.125 in bleed, 0.25 in safety;
 *                             spine width = pages / 444 + 0.06 in (Lulu, perfect-bound paperback).
 *
 * Specs from Lulu's help centre ("PDF Creation Settings", "How is spine width calculated?").
 * Always validate the files in the Lulu sandbox / file checker before the first real order.
 *
 *   packages/data/node_modules/.bin/tsx infrastructure/book/generate-print-book.mts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import QRCode from "qrcode";

import {
  SITE,
  escapeHtml,
  htmlToPdf,
  lessonUrl,
  loadA1,
  renderBlock,
  repoRoot,
  type Block,
} from "./book-shared.mts";

// --- geometry (inches) --------------------------------------------------------------------------
const TRIM_W = 6;
const TRIM_H = 9;
const BLEED = 0.125;
const SAFETY = 0.5;
const GUTTER = 0.2;
const COVER_SAFETY = 0.25;
/** Below this the spine is too thin to carry text safely (Lulu leaves it to the designer). */
const MIN_SPINE_FOR_TEXT = 0.25;

const PAGE_W = TRIM_W + 2 * BLEED;
const PAGE_H = TRIM_H + 2 * BLEED;
const OUTER = BLEED + SAFETY;
const INNER = BLEED + SAFETY + GUTTER;

const spineWidth = (pages: number) => pages / 444 + 0.06;
const inch = (value: number) => `${value.toFixed(4)}in`;

const OUT_DIR = path.join(repoRoot, "infrastructure/book/out/print");
const TITLE = "Hiszpański metodą PUENTE";
const SUBTITLE = "Poziom A1 · od myślenia po polsku do mówienia po hiszpańsku";
const EDITION = "Wydanie 1 · 2026";
/** Reserve a white box for the ISBN barcode on the back (only once the book has an ISBN). */
const ISBN_BARCODE_BOX = false;

// --- interior -----------------------------------------------------------------------------------
const INTERIOR_STYLE = `
@page { size: ${inch(PAGE_W)} ${inch(PAGE_H)}; margin: ${inch(OUTER)} ${inch(OUTER)} ${inch(OUTER + 0.15)}; }
/* First page is a right-hand page: its binding edge is on the left. */
@page :right { margin-left: ${inch(INNER)}; margin-right: ${inch(OUTER)};
  @bottom-right { content: counter(page); font: 8.5pt Georgia, serif; color: #444; } }
@page :left { margin-left: ${inch(OUTER)}; margin-right: ${inch(INNER)};
  @bottom-left { content: counter(page); font: 8.5pt Georgia, serif; color: #444; } }
@page front { @bottom-right { content: none; } @bottom-left { content: none; } }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #111; font-size: 10.5pt; line-height: 1.45; }
h1, h2, h3 { font-family: "Segoe UI", Arial, sans-serif; color: #111; }
.front { page: front; break-after: page; }
.title-page { height: ${inch(TRIM_H - 2 * SAFETY - 0.3)}; display: flex; flex-direction: column; justify-content: center; text-align: center; }
.title-page .brand { letter-spacing: .3em; text-transform: uppercase; font-weight: 700; font-family: "Segoe UI", Arial, sans-serif; }
.title-page h1 { font-size: 26pt; margin: 6mm 0; line-height: 1.15; }
.title-page .sub { font-size: 11pt; }
.imprint { height: ${inch(TRIM_H - 2 * SAFETY - 0.3)}; display: flex; flex-direction: column; justify-content: flex-end; font-size: 8.5pt; color: #333; }
.imprint p { margin: 0 0 2.5mm; }
.blank { break-after: page; height: 1px; }
.toc h2 { font-size: 16pt; }
.toc ol { padding-left: 6mm; }
.toc li { margin: 1.6mm 0; }
.how h2 { font-size: 14pt; }
.chapter { break-before: right; }
.chapter header { border-bottom: 1.5pt solid #111; margin-bottom: 5mm; padding-bottom: 2mm; display: flex; justify-content: space-between; gap: 6mm; align-items: flex-start; }
.chapter .num { font-family: "Segoe UI", Arial, sans-serif; font-size: 9pt; letter-spacing: .15em; text-transform: uppercase; color: #444; margin: 0; }
.chapter h2 { margin: 1mm 0 2mm; font-size: 16pt; line-height: 1.2; }
.chapter .desc { margin: 0; color: #333; font-style: italic; }
.qr { width: 25mm; flex: none; text-align: center; font: 7pt "Segoe UI", Arial, sans-serif; color: #333; }
.qr svg { width: 22mm; height: 22mm; }
.explanation { margin: 0 0 2.5mm; text-align: justify; hyphens: auto; }
.example { border-left: 2pt solid #111; padding: .5mm 0 .5mm 3mm; margin: 0 0 2.5mm; break-inside: avoid; }
.example .es { font-family: "Segoe UI", Arial, sans-serif; font-weight: 700; margin: 0; }
.example .pl, .example .note, .pl { color: #333; font-size: 9.5pt; margin: 0; }
.dialogue { border-collapse: collapse; width: 100%; margin: 2mm 0 3mm; break-inside: avoid; font-size: 10pt; }
.dialogue th { text-align: left; vertical-align: top; padding: 1.2mm 2.5mm 1.2mm 0; width: 20mm; font-family: "Segoe UI", Arial, sans-serif; }
.dialogue td { padding: 1.2mm 0; border-bottom: .5pt solid #999; }
.section { margin: 6mm 0 3mm; font-size: 13pt; border-bottom: .75pt solid #111; padding-bottom: 1mm; break-after: avoid; }
.section .phase { display: block; font-size: 8pt; letter-spacing: .12em; text-transform: uppercase; color: #444; }
.label { font: 700 8pt "Segoe UI", Arial, sans-serif; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 1mm; }
.reading, .culture, .mission, .summary, .pitfall, .comparison { margin: 0 0 3mm; padding: 2.5mm 3mm; break-inside: avoid; }
.reading { border: .75pt solid #111; }
.reading h4, .culture h4, .mission h4 { margin: 0 0 1.5mm; }
.reading p, .culture p { margin: 0 0 1.5mm; text-align: justify; }
.culture { background: #eee; }
.pitfall { border-left: 3pt solid #111; background: #f3f3f3; }
.pitfall p, .comparison p { margin: 0 0 1mm; }
.comparison { border: .5pt dashed #555; display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 4mm; }
.comparison .note { grid-column: 1 / -1; }
.grid { border-collapse: collapse; width: 100%; margin: 0 0 3mm; font-size: 9.5pt; break-inside: avoid; }
.grid caption { text-align: left; font-size: 8.5pt; color: #444; }
.grid th, .grid td { border: .5pt solid #777; padding: 1mm 2mm; text-align: left; }
.grid th { background: #e6e6e6; }
.mission { border: 1.5pt solid #111; }
.summary { background: #f3f3f3; }
.summary ul { margin: 0 0 2mm; padding-left: 0; list-style: none; }
.app { margin-top: 4mm; padding: 2.5mm 3mm; border: .75pt solid #111; font-size: 9pt; break-inside: avoid; }
`;

function interiorHtml(chapters: string[], titles: string[], blankPagesAtEnd: number): string {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${TITLE}</title><style>${INTERIOR_STYLE}</style></head><body>
<section class="front"><div class="title-page">
  <p class="brand">Verbysia</p><h1>${TITLE}</h1><p class="sub">${SUBTITLE}</p>
</div></section>
<section class="front"><div class="imprint">
  <p><strong>${TITLE}</strong> — ${SUBTITLE}</p>
  <p>${EDITION}. © 2026 Verbysia. Wszelkie prawa zastrzeżone. Kopiowanie i rozpowszechnianie bez zgody wydawcy zabronione.</p>
  <p>Każdy rozdział ma kod QR prowadzący do lekcji, nagrań i ćwiczeń w aplikacji ${SITE.replace("https://", "")}.</p>
  <p>[DANE WYDAWCY I ISBN DO UZUPEŁNIENIA]</p>
</div></section>
<section class="front toc"><h2>Spis treści</h2><ol>${titles.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ol></section>
<section class="front how"><h2>Jak korzystać z tej książki</h2>
  <p>Każdy rozdział to jedna lekcja kursu A1: wyjaśnienia po polsku, przykłady i dialogi.</p>
  <p>Zeskanuj kod QR przy tytule rozdziału, aby otworzyć tę samą lekcję w aplikacji: posłuchasz wymowy, rozwiążesz ćwiczenia z wyjaśnieniami i powtórzysz słówka w trenerze pamięci.</p>
  <p>Ucz się regularnie — kilkanaście minut dziennie daje więcej niż jedna długa sesja w tygodniu.</p>
</section>
${chapters.join("\n")}
${'<div class="blank" style="break-before: page"></div>'.repeat(blankPagesAtEnd)}
</body></html>`;
}

// --- cover --------------------------------------------------------------------------------------
async function coverHtml(pages: number): Promise<{ html: string; width: number; spine: number }> {
  const spine = spineWidth(pages);
  const width = 2 * TRIM_W + spine + 2 * BLEED;
  const panel = TRIM_W + BLEED; // each outer panel, bleed included
  const qr = await QRCode.toString(`${SITE}/ksiazka`, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
  });
  const spineText = spine >= MIN_SPINE_FOR_TEXT;
  const pad = BLEED + COVER_SAFETY + 0.15;
  const style = `
@page { size: ${inch(width)} ${inch(PAGE_H)}; margin: 0; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; width: ${inch(width)}; height: ${inch(PAGE_H)}; display: flex; font-family: "Segoe UI", Arial, sans-serif; overflow: hidden; }
.panel { width: ${inch(panel)}; height: 100%; box-sizing: border-box; background: #1d2433; color: #fff; position: relative; }
.back { padding: ${inch(pad)}; padding-right: ${inch(COVER_SAFETY + 0.15)}; }
.front { padding: ${inch(pad)}; padding-left: ${inch(COVER_SAFETY + 0.15)}; display: flex; flex-direction: column; }
.spine { width: ${inch(spine)}; height: 100%; background: #e8a33d; color: #1d2433; display: flex; align-items: center; justify-content: center; }
.spine span { transform: rotate(90deg); white-space: nowrap; font-weight: 700; font-size: ${spine > 0.4 ? "11pt" : "8pt"}; letter-spacing: .05em; }
.brand { color: #e8a33d; letter-spacing: .35em; text-transform: uppercase; font-weight: 700; font-size: 11pt; margin: 0; }
.front h1 { font-family: Georgia, serif; font-size: 34pt; line-height: 1.1; margin: .5in 0 .2in; }
.front .level { display: inline-block; background: #e8a33d; color: #1d2433; font-weight: 800; font-size: 22pt; padding: .05in .2in; border-radius: .08in; align-self: flex-start; }
.front .sub { font-size: 12pt; margin-top: .25in; color: #f3e6cf; }
.bridge { margin-top: auto; height: 1.4in; }
.front .foot { font-size: 9.5pt; color: #cfd6e4; }
.back h2 { font-family: Georgia, serif; font-size: 16pt; margin: 0 0 .15in; color: #e8a33d; }
.back p, .back li { font-size: 10pt; line-height: 1.45; color: #eef1f6; }
.back ul { padding-left: .2in; }
.back .qr { position: absolute; left: ${inch(pad)}; bottom: ${inch(pad)}; display: flex; gap: .15in; align-items: center; font-size: 9pt; }
.back .qr svg { width: .9in; height: .9in; background: #fff; padding: .05in; }
.back .barcode { position: absolute; right: ${inch(COVER_SAFETY + 0.15)}; bottom: ${inch(pad)}; width: 2in; height: 1.2in; background: #fff; }
`;
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Okładka</title><style>${style}</style></head><body>
<div class="panel back">
  <h2>Zacznij mówić po hiszpańsku — krok po kroku</h2>
  <p>Kurs A1 napisany z myślą o Polakach: wyjaśnienia po polsku, porównania z polszczyzną i typowe błędy, których unikniesz od pierwszego dnia.</p>
  <ul>
    <li>21 rozdziałów: od powitań do pierwszej rozmowy, rodziny, zakupów, miasta i zdrowia</li>
    <li>przykłady i dialogi z tłumaczeniem</li>
    <li>kod QR przy każdym rozdziale: nagrania, ćwiczenia i trener pamięci w aplikacji</li>
  </ul>
  <p>Metoda PUENTE prowadzi od myślenia po polsku do mówienia po hiszpańsku — bez obietnic „płynności w miesiąc”, za to z jasnym planem.</p>
  <div class="qr">${qr}<span>www.verbysia.com</span></div>
  ${ISBN_BARCODE_BOX ? `<div class="barcode"></div>` : ""}
</div>
<div class="spine">${spineText ? `<span>VERBYSIA · ${TITLE.toUpperCase()} · A1</span>` : ""}</div>
<div class="panel front">
  <p class="brand">Verbysia</p>
  <h1>${TITLE.replace(" metodą", "<br>metodą")}</h1>
  <span class="level">A1</span>
  <p class="sub">${SUBTITLE}</p>
  <svg class="bridge" viewBox="0 0 400 140" aria-hidden="true">
    <path d="M10 120 Q200 -20 390 120" fill="none" stroke="#e8a33d" stroke-width="8"/>
    <line x1="10" y1="120" x2="390" y2="120" stroke="#e8a33d" stroke-width="6"/>
    ${[60, 110, 160, 200, 240, 290, 340].map((x) => `<line x1="${x}" y1="120" x2="${x}" y2="${120 - 140 * (1 - ((x - 200) / 190) ** 2) * 0.62}" stroke="#e8a33d" stroke-width="3"/>`).join("")}
  </svg>
  <p class="foot">Wyjaśnienia po polsku · kody QR do lekcji i ćwiczeń</p>
</div>
</body></html>`;
  return { html, width, spine };
}

/** Page count of a Chrome-generated PDF (its page tree root carries /Count). */
function pdfPageCount(file: string): number {
  const text = readFileSync(file).toString("latin1");
  const counts = [
    ...text.matchAll(
      /\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g,
    ),
  ].map((m) => Number(m[1] ?? m[2]));
  if (counts.length === 0) throw new Error(`Could not read the page count of ${file}`);
  return Math.max(...counts);
}

async function main() {
  const { lessons, exerciseCount } = await loadA1();
  const chapters = await Promise.all(
    lessons.map(async (lesson, index) => {
      const url = lessonUrl(lesson.id);
      const qr = await QRCode.toString(url, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
      });
      return `<section class="chapter">
  <header>
    <div><p class="num">Rozdział ${String(index + 1)}</p><h2>${escapeHtml(lesson.title)}</h2><p class="desc">${escapeHtml(lesson.description)}</p></div>
    <div class="qr">${qr}<div>lekcja i ćwiczenia</div></div>
  </header>
  ${(lesson.blocks as Block[]).map((b) => renderBlock(b)).join("\n  ")}
  <p class="app">W aplikacji: ${String(exerciseCount.get(lesson.id) ?? 0)} ćwiczeń z wyjaśnieniami po polsku, nagrania i powtórki słówek. ${escapeHtml(url.replace("https://", ""))}</p>
</section>`;
    }),
  );
  const titles = lessons.map((l) => l.title);

  mkdirSync(OUT_DIR, { recursive: true });
  const interiorHtmlFile = path.join(OUT_DIR, "interior.html");
  const interiorPdf = path.join(OUT_DIR, "verbysia-a1-interior.pdf");

  // Render once to count pages, then pad to an even count (a printed sheet has two sides).
  writeFileSync(interiorHtmlFile, interiorHtml(chapters, titles, 0), "utf8");
  htmlToPdf(interiorHtmlFile, interiorPdf);
  let pages = pdfPageCount(interiorPdf);
  if (pages % 2 === 1) {
    writeFileSync(interiorHtmlFile, interiorHtml(chapters, titles, 1), "utf8");
    htmlToPdf(interiorHtmlFile, interiorPdf);
    pages = pdfPageCount(interiorPdf);
  }

  const cover = await coverHtml(pages);
  const coverHtmlFile = path.join(OUT_DIR, "cover.html");
  const coverPdf = path.join(OUT_DIR, "verbysia-a1-cover.pdf");
  writeFileSync(coverHtmlFile, cover.html, "utf8");
  htmlToPdf(coverHtmlFile, coverPdf);

  const summary = {
    trim: `${String(TRIM_W)} x ${String(TRIM_H)} in`,
    interiorPage: `${String(PAGE_W)} x ${String(PAGE_H)} in`,
    pages,
    spineIn: Number(cover.spine.toFixed(4)),
    coverIn: `${cover.width.toFixed(4)} x ${String(PAGE_H)}`,
    chapters: lessons.length,
  };
  writeFileSync(path.join(OUT_DIR, "print-spec.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(summary);
}

await main();
