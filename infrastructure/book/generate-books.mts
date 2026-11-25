/**
 * The Verbysia course books (docs/product/verbysia/PLAN-LIBROS.md): for one level, a Podręcznik
 * (textbook) and a Zeszyt ćwiczeń (workbook), A4, generated from the same content as the web.
 *
 *   packages/data/node_modules/.bin/tsx infrastructure/book/generate-books.mts --level a1
 *     [--book podrecznik|zeszyt|all] [--format print|digital]
 *
 * Pagination is done by Paged.js inside headless Chrome (puppeteer-core): it gives page numbers to
 * the table of contents, running headers and — read back from the paginated DOM — the page index
 * the web uses ("Podręcznik s. 42"), written to content/books/{language}-{level}.json.
 *
 * print   → interior with 0.125 in bleed + a cover spread per book (Lulu / KDP), even page count
 * digital → plain A4 pages, no bleed, no cover (the PDF learners download)
 *
 * Output goes to infrastructure/book/out/{level}/ (not committed: paid products).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import puppeteer, { type Browser } from "puppeteer-core";
import QRCode from "qrcode";

import { loadContentCatalog } from "../../packages/data/src/content/load-content-catalog.js";
import { loadGrammarReference } from "../../packages/data/src/content/load-grammar-reference.js";
import type {
  ContentCatalog,
  ContentItem,
  Exercise,
  GrammarTopic,
  UnitSectionPhase,
} from "../../packages/domain/src/index.js";
import { escapeHtml as e, PHASE_LABELS, renderBlock, repoRoot, SITE } from "./book-shared.mts";
import { answerKey, EXERCISE_STYLE, exerciseLabel, renderExercise } from "./print-exercises.mts";

// --- options ------------------------------------------------------------------------------------
function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
}
const LANGUAGE = arg("language", "es");
const LEVEL = arg("level", "a1");
const BOOK = arg("book", "all");
const FORMAT = arg("format", "print") as "print" | "digital";
const COURSE = `${LANGUAGE}-${LEVEL}`;
const LEVEL_LABEL = LEVEL.toUpperCase();

// --- geometry (inches) and series design ---------------------------------------------------------
const A4_W = 8.27;
const A4_H = 11.69;
const BLEED = FORMAT === "print" ? 0.125 : 0;
const SAFETY = 0.5;
const GUTTER = 0.25;
const COVER_SAFETY = 0.25;
const spineWidth = (pages: number) => pages / 444 + 0.06;
const inch = (v: number) => `${v.toFixed(3)}in`;

/** One colour per level: the collection looks the same, each level is recognisable on a shelf. */
const LEVEL_COLOURS: Record<string, string> = {
  a1: "#2e7d32",
  a2: "#00838f",
  b1: "#1565c0",
  b2: "#6a1b9a",
  c1: "#c62828",
  c2: "#37474f",
};
const COLOUR = LEVEL_COLOURS[LEVEL] ?? "#1d2433";
const NAVY = "#1d2433";

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];
const PAGED_JS = path.join(repoRoot, "node_modules/pagedjs/dist/paged.polyfill.js");
const OUT_DIR = path.join(repoRoot, "infrastructure/book/out", LEVEL);
const INDEX_FILE = path.join(repoRoot, "content/books", `${COURSE}.json`);

const BOOKS = {
  podrecznik: { title: "Podręcznik", file: "podrecznik" },
  zeszyt: { title: "Zeszyt ćwiczeń", file: "zeszyt-cwiczen" },
} as const;
type BookKey = keyof typeof BOOKS;

// --- content ------------------------------------------------------------------------------------
interface Unit {
  number: number;
  title: string;
  lessons: ContentItem[];
  exercises: Exercise[];
}

function unitTitle(number: number, lessons: ContentItem[]): string {
  if (number === 0) return "Wyzwanie: 7 dni, żeby zacząć mówić";
  // The big unit number is printed next to the title, so "Jednostka 3." is not repeated.
  if (lessons.length === 1)
    return (
      (lessons[0]?.title ?? "").replace(/^Jednostka \d+\.\s*/, "") || `Jednostka ${String(number)}`
    );
  return `Jednostka ${String(number)}`;
}

function unitsOf(catalog: ContentCatalog): Unit[] {
  const lessons = catalog.content
    .filter(
      (c) =>
        c.languageId === LANGUAGE &&
        c.levelId === LEVEL &&
        c.type === "lesson" &&
        c.status === "published" &&
        c.unit !== undefined,
    )
    .sort((a, b) => a.order - b.order);
  const numbers = [...new Set(lessons.map((l) => l.unit ?? 0))].sort((a, b) => a - b);
  return numbers.map((number) => {
    const own = lessons.filter((l) => l.unit === number);
    const ids = new Set(own.map((l) => l.id as string));
    const exercises = catalog.exercises
      .filter((x) => x.status === "published" && ids.has(x.lessonId))
      .sort((a, b) => (a.book?.number ?? 1000 + a.order) - (b.book?.number ?? 1000 + b.order));
    return { number, title: unitTitle(number, own), lessons: own, exercises };
  });
}

const qr = (url: string) =>
  QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
const shortUrl = (unit: number, target?: string) =>
  `${SITE}/k/${COURSE}/${String(unit)}${target ? `/${target}` : ""}`;
const printedUrl = (url: string) => url.replace("https://", "");

// --- styles -------------------------------------------------------------------------------------
const BASE_STYLE = `
@page {
  size: ${inch(A4_W)} ${inch(A4_H)};
  ${BLEED ? `bleed: ${inch(BLEED)}; marks: none;` : ""}
  margin: ${inch(SAFETY + 0.15)} ${inch(SAFETY)} ${inch(SAFETY + 0.2)};
}
@page :right {
  margin-left: ${inch(SAFETY + GUTTER)};
  @top-right { content: string(unit); font: 8pt "Segoe UI", Arial, sans-serif; color: #555; }
  @bottom-right { content: counter(page); font: 9pt Georgia, serif; }
}
@page :left {
  margin-right: ${inch(SAFETY + GUTTER)};
  @top-left { content: "Verbysia · ${LEVEL_LABEL} · " string(book); font: 8pt "Segoe UI", Arial, sans-serif; color: #555; }
  @bottom-left { content: counter(page); font: 9pt Georgia, serif; }
}
@page front { @top-left { content: none; } @top-right { content: none; } @bottom-left { content: none; } @bottom-right { content: none; } }
@page opener { @top-left { content: none; } @top-right { content: none; } }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: Georgia, "Times New Roman", serif; font-size: 10.5pt; line-height: 1.45; color: #111; }
h1, h2, h3, h4 { font-family: "Segoe UI", Arial, sans-serif; }
.book-name { string-set: book content(text); display: none; }
.front { page: front; break-after: page; }
.title-page { height: 9.6in; display: flex; flex-direction: column; justify-content: center; text-align: center; }
.title-page .brand { letter-spacing: .35em; text-transform: uppercase; font: 700 12pt "Segoe UI", Arial, sans-serif; }
.title-page h1 { font-size: 30pt; margin: 8mm 0 4mm; }
.title-page .level { font: 800 40pt "Segoe UI", Arial, sans-serif; border: 2pt solid #111; display: inline-block; padding: 0 6mm; margin: 0 auto; }
.title-page .kind { font-size: 15pt; margin-top: 6mm; }
.imprint { height: 9.6in; display: flex; flex-direction: column; justify-content: flex-end; font-size: 8.5pt; }
.imprint p { margin: 0 0 2mm; }
.toc h2, .how h2 { font-size: 18pt; }
.toc ol { list-style: none; padding: 0; }
.toc li { display: flex; gap: 2mm; margin: 2mm 0; }
.toc li a { color: inherit; text-decoration: none; flex: 1; display: flex; }
.toc li a .dots { flex: 1; border-bottom: .75pt dotted #777; margin: 0 2mm 1.2mm; }
.toc li a::after { content: target-counter(attr(href), page); }
.unit-opener { page: opener; break-before: right; height: 9.4in; display: flex; flex-direction: column; }
.unit-opener .big { font: 800 64pt "Segoe UI", Arial, sans-serif; line-height: 1; margin: 0; }
.unit-opener h2 { font-size: 24pt; margin: 3mm 0 6mm; string-set: unit content(text); }
.unit-opener .goals { font-size: 11pt; }
.unit-opener .goals li { margin: 1.5mm 0; }
.unit-opener .qr-box { margin-top: auto; display: flex; gap: 5mm; align-items: center; border: 1pt solid #111; padding: 4mm; }
.unit-opener .qr-box svg { width: 28mm; height: 28mm; }
.lesson-title { font-size: 15pt; margin: 6mm 0 2mm; break-after: avoid; }
.lesson-desc { font-style: italic; margin: 0 0 3mm; }
.unit-head { break-before: right; border-bottom: 2pt solid #111; display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; margin-bottom: 4mm; }
.unit-head h2 { margin: 0 0 2mm; font-size: 18pt; string-set: unit content(text); }
.unit-head .num { font: 800 28pt "Segoe UI", Arial, sans-serif; margin: 0; }
.qr-small { text-align: center; font: 7pt "Segoe UI", Arial, sans-serif; width: 38mm; white-space: nowrap; }
.qr-small svg { width: 22mm; height: 22mm; }
.phase-head { font-size: 11pt; margin: 5mm 0 2mm; text-transform: uppercase; letter-spacing: .08em; border-bottom: .75pt solid #111; break-after: avoid; }
.appendix { break-before: right; }
.appendix h2 { font-size: 18pt; string-set: unit content(text); }
.glossary { columns: 2; column-gap: 8mm; font-size: 9.5pt; }
.glossary p { margin: 0 0 1mm; break-inside: avoid; }
.key { font-size: 9pt; columns: 2; column-gap: 8mm; }
.key p { margin: 0 0 1.2mm; break-inside: avoid; }
.key h3 { column-span: all; font-size: 11pt; margin: 4mm 0 1mm; }
.transcript { font-size: 9.5pt; }
.blank-end { break-before: page; }
/* Content blocks (shared with the 6x9 edition) */
.explanation { margin: 0 0 2.5mm; text-align: justify; hyphens: auto; }
.example { border-left: 2pt solid #111; padding: .5mm 0 .5mm 3mm; margin: 0 0 2.5mm; break-inside: avoid; }
.example .es { font-family: "Segoe UI", Arial, sans-serif; font-weight: 700; margin: 0; }
.example .pl, .example .note, .pl { color: #333; font-size: 9.5pt; margin: 0; }
.dialogue { border-collapse: collapse; width: 100%; margin: 2mm 0 3mm; break-inside: avoid; }
.dialogue th { text-align: left; vertical-align: top; padding: 1.2mm 3mm 1.2mm 0; width: 26mm; font-family: "Segoe UI", Arial, sans-serif; }
.dialogue td { padding: 1.2mm 0; border-bottom: .5pt solid #999; }
.section { margin: 6mm 0 3mm; font-size: 13pt; border-bottom: .75pt solid #111; padding-bottom: 1mm; break-after: avoid; }
.section .phase { display: block; font-size: 8pt; letter-spacing: .12em; text-transform: uppercase; color: #444; }
.label { font: 700 8pt "Segoe UI", Arial, sans-serif; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 1mm; }
.reading, .culture, .mission, .summary, .pitfall, .comparison { margin: 0 0 3mm; padding: 2.5mm 3mm; break-inside: avoid; }
.reading { border: .75pt solid #111; }
.culture, .summary { background: #eee; }
.pitfall { border-left: 3pt solid #111; background: #f3f3f3; }
.comparison { border: .5pt dashed #555; display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 4mm; }
.grid { border-collapse: collapse; width: 100%; margin: 0 0 3mm; font-size: 9.5pt; break-inside: avoid; }
.grid caption { text-align: left; font-size: 8.5pt; color: #444; }
.grid th, .grid td { border: .5pt solid #777; padding: 1mm 2mm; text-align: left; }
.grid th { background: #e6e6e6; }
.mission { border: 1.5pt solid #111; }
${EXERCISE_STYLE}
`;

// --- shared front matter ------------------------------------------------------------------------
function frontMatter(book: BookKey, units: Unit[], tocExtra: { href: string; label: string }[]) {
  const name = BOOKS[book].title;
  const toc = [
    ...units.map((u) => ({
      href: `#unit-${String(u.number)}`,
      label: `${u.number === 0 ? "0" : String(u.number)}. ${u.title}`,
    })),
    ...tocExtra,
  ];
  return `<p class="book-name">${e(name)}</p>
<section class="front"><div class="title-page">
  <p class="brand">Verbysia</p>
  <h1>Hiszpański metodą PUENTE</h1>
  <p class="level">${LEVEL_LABEL}</p>
  <p class="kind">${e(name)}</p>
</div></section>
<section class="front"><div class="imprint">
  <p><strong>Verbysia · Hiszpański metodą PUENTE · ${LEVEL_LABEL} · ${e(name)}</strong></p>
  <p>Wydanie 1 · 2026 · © Verbysia. Wszelkie prawa zastrzeżone.</p>
  <p>Książka i kurs w aplikacji ${printedUrl(SITE)} to jeden kurs: te same jednostki, te same numery ćwiczeń i nagrań.</p>
  <p>Ilustracje i ikony: [ŹRÓDŁA I LICENCJE DO UZUPEŁNIENIA].</p>
  <p>[DANE WYDAWCY I ISBN DO UZUPEŁNIENIA]</p>
</div></section>
<section class="front toc"><h2>Spis treści</h2><ol>${toc
    .map((t) => `<li><a href="${t.href}">${e(t.label)}<span class="dots"></span></a></li>`)
    .join("")}</ol></section>`;
}

// --- Podręcznik ---------------------------------------------------------------------------------
async function textbookHtml(units: Unit[], glossary: string, grammar: string): Promise<string> {
  const how = `<section class="front how"><h2>Jak korzystać z podręcznika</h2>
  <p>Każda jednostka prowadzi przez fazy metody PUENTE: ${Object.values(PHASE_LABELS).map(e).join(" · ")}.</p>
  <p>Kod QR na początku jednostki otwiera ją w aplikacji: nagrania, ćwiczenia z natychmiastową korektą, trener pamięci i asystent AI. Ćwiczenia do tej jednostki znajdziesz w Zeszycie ćwiczeń pod tym samym numerem.</p>
  <p>Na końcu: tabele gramatyczne i słowniczek hiszpańsko-polski.</p></section>`;
  const body = await Promise.all(
    units.map(async (unit) => {
      const goals = unit.lessons.flatMap((l) =>
        l.blocks.flatMap((b) => (b.type === "summary" ? b.canDo : [])),
      );
      const goalList = goals.length > 0 ? goals : unit.lessons.map((l) => l.description);
      const url = shortUrl(unit.number);
      const lessons = unit.lessons
        .map((lesson) => {
          const blocks = lesson.blocks
            .map((b) =>
              b.type === "section"
                ? `<div data-index="section:${String(unit.number)}/${b.phase}"></div>${renderBlock(b)}`
                : renderBlock(b),
            )
            .join("\n");
          return `${unit.lessons.length > 1 ? `<h3 class="lesson-title">${e(lesson.title)}</h3><p class="lesson-desc">${e(lesson.description)}</p>` : ""}${blocks}`;
        })
        .join("\n");
      return `<section class="unit-opener" id="unit-${String(unit.number)}" data-index="unit:${String(unit.number)}">
  <p class="big">${String(unit.number)}</p>
  <h2>${e(unit.title)}</h2>
  <p><strong>Po tej jednostce potrafisz:</strong></p>
  <ul class="goals">${goalList.map((g) => `<li>${e(g)}</li>`).join("")}</ul>
  <div class="qr-box">${await qr(url)}<div><strong>Ta jednostka w aplikacji</strong><br>nagrania, ćwiczenia, trener pamięci<br>${e(printedUrl(url))}</div></div>
</section>
<section class="unit-body">${lessons}</section>`;
    }),
  );
  return `${frontMatter("podrecznik", units, [
    { href: "#grammar", label: "Tabele gramatyczne" },
    { href: "#glossary", label: "Słowniczek hiszpańsko-polski" },
  ])}${how}${body.join("\n")}
<section class="appendix" id="grammar"><h2>Tabele gramatyczne</h2>${grammar}</section>
<section class="appendix" id="glossary"><h2>Słowniczek hiszpańsko-polski</h2><div class="glossary">${glossary}</div></section>`;
}

// --- Zeszyt ćwiczeń -----------------------------------------------------------------------------
async function workbookHtml(units: Unit[]): Promise<string> {
  const how = `<section class="front how"><h2>Jak korzystać z zeszytu</h2>
  <p>Ćwiczenia mają te same numery co w aplikacji (np. 3.14 = jednostka 3, ćwiczenie 14). Możesz je rozwiązać tutaj albo w aplikacji, gdzie odpowiedź sprawdzi się od razu.</p>
  <p>Kod QR przy jednostce otwiera jej ćwiczenia w aplikacji. Rozwiązania i transkrypcje nagrań są na końcu zeszytu.</p></section>`;
  const body = await Promise.all(
    units.map(async (unit) => {
      let lastPhase: UnitSectionPhase | undefined;
      const exercises = unit.exercises
        .map((x) => {
          const phase = x.book?.phase;
          const head =
            phase && phase !== lastPhase
              ? `<h3 class="phase-head">${e(PHASE_LABELS[phase])}</h3>`
              : "";
          lastPhase = phase ?? lastPhase;
          return `${head}<div data-index="exercise:${e(exerciseLabel(x))}"></div>${renderExercise(x)}`;
        })
        .join("\n");
      const url = shortUrl(unit.number);
      return `<section>
  <header class="unit-head" id="unit-${String(unit.number)}" data-index="unit:${String(unit.number)}"><div><p class="num">${String(unit.number)}</p><h2>${e(unit.title)}</h2></div>
  <div class="qr-small">${await qr(url)}<div>${e(printedUrl(url))}</div></div></header>
  ${exercises}
</section>`;
    }),
  );
  const key = units
    .map(
      (u) =>
        `<h3>Jednostka ${String(u.number)}</h3>${u.exercises
          .map((x) => `<p><strong>${e(exerciseLabel(x))}</strong> ${e(answerKey(x))}</p>`)
          .join("")}`,
    )
    .join("");
  const transcripts = units
    .map((u) => {
      const dialogues = u.lessons.flatMap((l) => l.blocks.filter((b) => b.type === "dialogue"));
      if (dialogues.length === 0) return "";
      return `<h3>Jednostka ${String(u.number)}</h3>${dialogues.map(renderBlock).join("")}`;
    })
    .join("");
  return `${frontMatter("zeszyt", units, [
    { href: "#key", label: "Rozwiązania" },
    { href: "#transcripts", label: "Transkrypcje nagrań" },
  ])}${how}${body.join("\n")}
<section class="appendix" id="key"><h2>Rozwiązania</h2><div class="key">${key}</div></section>
<section class="appendix transcript" id="transcripts"><h2>Transkrypcje nagrań</h2>${transcripts}</section>`;
}

// --- appendices ---------------------------------------------------------------------------------
function glossaryHtml(catalog: ContentCatalog): string {
  const items = catalog.vocabulary
    .filter(
      (v) =>
        v.languageId === LANGUAGE &&
        v.status === "published" &&
        (!v.levelId || v.levelId === LEVEL),
    )
    .sort((a, b) => a.lemma.localeCompare(b.lemma, LANGUAGE));
  const seen = new Set<string>();
  return items
    .filter((v) => (seen.has(v.lemma) ? false : (seen.add(v.lemma), true)))
    .map((v) => `<p><strong lang="${LANGUAGE}">${e(v.lemma)}</strong> — ${e(v.translation)}</p>`)
    .join("");
}

function grammarHtml(topics: GrammarTopic[]): string {
  return topics
    .filter((t) => t.languageId === LANGUAGE && t.status === "published" && t.levelId === LEVEL)
    .map(
      (t) =>
        `<h3>${e(t.title)}</h3><p>${e(t.description)}</p>${t.sections
          .map(
            (s) =>
              `${s.heading ? `<h4>${e(s.heading)}</h4>` : ""}${s.text ? `<p>${e(s.text)}</p>` : ""}${
                s.table
                  ? renderBlock({
                      type: "table",
                      caption: s.table.caption,
                      columns: s.table.columns,
                      rows: s.table.rows,
                    })
                  : ""
              }`,
          )
          .join("")}`,
    )
    .join("");
}

// --- rendering ----------------------------------------------------------------------------------
interface Rendered {
  pages: number;
  index: Record<string, number>;
}

async function renderBook(
  browser: Browser,
  inner: string,
  htmlFile: string,
  pdfFile: string,
): Promise<Rendered> {
  const render = async (padding: boolean): Promise<Rendered> => {
    const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Verbysia</title>
<style>${BASE_STYLE}</style>
<script>window.PagedConfig = { auto: true, after: () => { window.__pagedDone = true; } };</script>
<script src="${pathToFileURL(PAGED_JS).href}"></script></head>
<body>${inner}${padding ? '<div class="blank-end"></div>' : ""}</body></html>`;
    writeFileSync(htmlFile, html, "utf8");
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load", timeout: 120_000 });
    await page.waitForFunction("window.__pagedDone === true", { timeout: 600_000 });
    const result = await page.evaluate(() => {
      const index: Record<string, number> = {};
      for (const el of document.querySelectorAll<HTMLElement>("[data-index]")) {
        const key = el.dataset.index;
        const pageEl = el.closest<HTMLElement>(".pagedjs_page");
        const number = Number(pageEl?.dataset.pageNumber);
        if (key && Number.isFinite(number) && !(key in index)) index[key] = number;
      }
      return { pages: document.querySelectorAll(".pagedjs_page").length, index };
    });
    await page.pdf({ path: pdfFile, preferCSSPageSize: true, printBackground: true });
    await page.close();
    return result;
  };
  const first = await render(false);
  // A printed book has two sides per sheet: pad to an even page count.
  return FORMAT === "print" && first.pages % 2 === 1 ? render(true) : first;
}

async function renderCover(browser: Browser, book: BookKey, pages: number, file: string) {
  const spine = spineWidth(pages);
  const width = 2 * A4_W + spine + 2 * BLEED;
  const height = A4_H + 2 * BLEED;
  const panel = A4_W + BLEED;
  const pad = BLEED + COVER_SAFETY + 0.2;
  const name = BOOKS[book].title;
  const siteQr = await qr(`${SITE}/k/${COURSE}/1`);
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>
@page { size: ${inch(width)} ${inch(height)}; margin: 0; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; width: ${inch(width)}; height: ${inch(height)}; display: flex; font-family: "Segoe UI", Arial, sans-serif; overflow: hidden; }
.panel { width: ${inch(panel)}; height: 100%; box-sizing: border-box; background: ${NAVY}; color: #fff; position: relative; }
.back { padding: ${inch(pad)}; padding-right: ${inch(COVER_SAFETY + 0.3)}; }
.front { padding: ${inch(pad)}; padding-left: ${inch(COVER_SAFETY + 0.3)}; display: flex; flex-direction: column; }
.band { position: absolute; left: 0; right: 0; top: 38%; height: 1.3in; background: ${COLOUR}; }
.spine { width: ${inch(spine)}; height: 100%; background: ${COLOUR}; color: #fff; display: flex; align-items: center; justify-content: center; }
.spine span { transform: rotate(90deg); white-space: nowrap; font-weight: 700; font-size: 10pt; letter-spacing: .05em; }
.brand { color: #e8a33d; letter-spacing: .35em; text-transform: uppercase; font-weight: 700; font-size: 13pt; margin: 0; position: relative; }
.front h1 { font-family: Georgia, serif; font-size: 40pt; line-height: 1.1; margin: .6in 0 0; position: relative; }
.front .level { position: relative; margin-top: .55in; font-size: 64pt; font-weight: 800; line-height: 1; }
.front .kind { position: relative; font-size: 22pt; margin-top: .1in; }
.front .foot { margin-top: auto; font-size: 11pt; color: #cfd6e4; position: relative; }
.back h2 { font-family: Georgia, serif; color: #e8a33d; font-size: 20pt; margin: 0 0 .2in; }
.back p, .back li { font-size: 11pt; line-height: 1.5; color: #eef1f6; }
.back .qr { position: absolute; left: ${inch(pad)}; bottom: ${inch(pad)}; display: flex; gap: .2in; align-items: center; font-size: 10pt; }
.back .qr svg { width: 1.1in; height: 1.1in; background: #fff; padding: .06in; }
</style></head><body>
<div class="panel back">
  <h2>${book === "podrecznik" ? "Hiszpański od podstaw — po polsku" : "Ćwiczenia do każdej jednostki"}</h2>
  <p>${
    book === "podrecznik"
      ? "Podręcznik kursu Verbysia: dialogi, słownictwo, gramatyka z porównaniem do polskiego, typowe błędy Polaków, czytanki i zadania do mówienia."
      : "Zeszyt ćwiczeń kursu Verbysia: ćwiczenia ponumerowane tak samo jak w aplikacji, powtórki, rozwiązania i transkrypcje nagrań."
  }</p>
  <ul><li>poziom ${LEVEL_LABEL} według ESOKJ</li><li>kody QR do nagrań i ćwiczeń w aplikacji</li><li>razem z ${book === "podrecznik" ? "Zeszytem ćwiczeń" : "Podręcznikiem"} tworzy pełny kurs</li></ul>
  <div class="qr">${siteQr}<span>${e(printedUrl(SITE))}</span></div>
</div>
<div class="spine">${spine >= 0.25 ? `<span>VERBYSIA · HISZPAŃSKI ${LEVEL_LABEL} · ${e(name.toUpperCase())}</span>` : ""}</div>
<div class="panel front">
  <div class="band"></div>
  <p class="brand">Verbysia</p>
  <h1>Hiszpański<br>metodą PUENTE</h1>
  <p class="level">${LEVEL_LABEL}</p>
  <p class="kind">${e(name)}</p>
  <p class="foot">Wyjaśnienia po polsku · kody QR do lekcji i ćwiczeń</p>
</div></body></html>`;
  writeFileSync(file.replace(/\.pdf$/, ".html"), html, "utf8");
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
  await page.close();
  return { spine, width, height };
}

// --- main ---------------------------------------------------------------------------------------
async function main() {
  const loaded = await loadContentCatalog(path.join(repoRoot, "content"));
  if (!loaded.ok) throw new Error("Content is invalid: run pnpm content:validate");
  const grammar = await loadGrammarReference(path.join(repoRoot, "content"), loaded.catalog);
  const topics = grammar.ok ? grammar.topics : [];
  const units = unitsOf(loaded.catalog);
  if (units.length === 0) throw new Error(`No published units for ${COURSE}.`);

  const executablePath = BROWSERS.find((candidate) => existsSync(candidate));
  if (!executablePath) throw new Error("No Chrome/Edge found.");
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ executablePath, headless: true });

  const previous = existsSync(INDEX_FILE)
    ? (JSON.parse(readFileSync(INDEX_FILE, "utf8")) as Record<string, unknown>)
    : {};
  const pageIndex: Record<string, unknown> = { ...previous, course: COURSE };
  const report: Record<string, unknown> = {};
  try {
    const wanted: BookKey[] = BOOK === "all" ? ["podrecznik", "zeszyt"] : [BOOK as BookKey];
    for (const book of wanted) {
      const inner =
        book === "podrecznik"
          ? await textbookHtml(units, glossaryHtml(loaded.catalog), grammarHtml(topics))
          : await workbookHtml(units);
      const base = `verbysia-${COURSE}-${BOOKS[book].file}-${FORMAT}`;
      const result = await renderBook(
        browser,
        inner,
        path.join(OUT_DIR, `${base}.html`),
        path.join(OUT_DIR, `${base}.pdf`),
      );
      const entry: Record<string, unknown> = { pages: result.pages };
      if (FORMAT === "print") {
        const cover = await renderCover(
          browser,
          book,
          result.pages,
          path.join(OUT_DIR, `verbysia-${COURSE}-${BOOKS[book].file}-okladka.pdf`),
        );
        entry.coverIn = `${cover.width.toFixed(3)} x ${cover.height.toFixed(3)}`;
        entry.spineIn = Number(cover.spine.toFixed(3));
      }
      report[book] = entry;
      // The web shows the printed (not the digital) page numbers.
      if (FORMAT === "print") pageIndex[book] = { pages: result.pages, index: result.index };
    }
  } finally {
    await browser.close();
  }
  if (FORMAT === "print") {
    mkdirSync(path.dirname(INDEX_FILE), { recursive: true });
    writeFileSync(INDEX_FILE, `${JSON.stringify(pageIndex, null, 2)}\n`);
  }
  console.log(
    JSON.stringify({ course: COURSE, format: FORMAT, units: units.length, ...report }, null, 2),
  );
}

await main();
