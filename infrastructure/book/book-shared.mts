/** Shared by the digital book (generate-book.mts) and the print edition (generate-print-book.mts). */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ContentBlock, UnitSectionPhase } from "../../packages/domain/src/index.js";
import { loadContentCatalog } from "../../packages/data/src/content/load-content-catalog.js";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

export const SITE = "https://www.verbysia.com";
/** Challenge days a visitor can open without an account (keep in sync with the web demo). */
const DEMO_LESSONS = new Set(["es-day-1-greetings", "es-day-2-building-sentences"]);

export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

export function lessonUrl(id: string): string {
  return DEMO_LESSONS.has(id) ? `${SITE}/wyzwanie-7-dni/demo/${id}` : `${SITE}/learn/lessons/${id}`;
}

export type Block = ContentBlock;

/** Section labels printed in the books (the books are written for Polish speakers). */
export const PHASE_LABELS: Record<UnitSectionPhase, string> = {
  perceive: "P · Słuchaj i rozumiej",
  connect: "U · Łącz i zapamiętuj",
  structure: "E · Buduj zdania",
  sound: "Wymowa i pisownia",
  culture: "Czytanie i kultura",
  transform: "T · Przekształcaj",
  express: "E · Mów i pisz",
  review: "N · Utrwalaj",
};

const e = escapeHtml;
const paras = (items: string[], lang?: string) =>
  items.map((p) => `<p${lang ? ` lang="${lang}"` : ""}>${e(p)}</p>`).join("");

/** Print HTML for one content block. Every string is escaped; class names are styled per book. */
export function renderBlock(block: Block): string {
  switch (block.type) {
    case "explanation":
      return `<p class="explanation">${e(block.text)}</p>`;
    case "example":
      return `<div class="example"><p class="es" lang="es">${e(block.text)}</p><p class="pl">${e(block.translation)}</p>${
        block.note ? `<p class="note">${e(block.note)}</p>` : ""
      }</div>`;
    case "dialogue":
      return `<table class="dialogue">${block.lines
        .map(
          (line) =>
            `<tr><th>${e(line.speaker)}</th><td><span lang="es">${e(line.text)}</span><br><span class="pl">${e(line.translation)}</span></td></tr>`,
        )
        .join("")}</table>`;
    case "section":
      return `<h3 class="section"><span class="phase">${e(PHASE_LABELS[block.phase])}</span>${e(block.title)}</h3>`;
    case "reading":
      return `<div class="reading"><p class="label">Czytanie</p><h4 lang="es">${e(block.title)}</h4>${paras(block.paragraphs, "es")}</div>`;
    case "culture":
      return `<div class="culture"><p class="label">Kultura</p><h4>${e(block.title)}</h4>${paras(block.paragraphs)}</div>`;
    case "pitfall":
      return `<div class="pitfall"><p class="label">Pułapka</p><p>✗ <s lang="es">${e(block.wrong)}</s> &nbsp; ✓ <strong lang="es">${e(block.right)}</strong></p><p class="pl">${e(block.explanation)}</p></div>`;
    case "comparison":
      return `<div class="comparison"><p>${e(block.source)}</p><p lang="es"><strong>${e(block.target)}</strong></p>${
        block.note ? `<p class="note">${e(block.note)}</p>` : ""
      }</div>`;
    case "table":
      return `<table class="grid">${block.caption ? `<caption>${e(block.caption)}</caption>` : ""}<thead><tr>${block.columns
        .map((c) => `<th>${e(c)}</th>`)
        .join("")}</tr></thead><tbody>${block.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${e(cell)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
    case "mission":
      return `<div class="mission"><p class="label">Misja</p><h4>${e(block.title)}</h4><ol>${block.steps
        .map((step) => `<li>${e(step)}</li>`)
        .join("")}</ol></div>`;
    case "summary":
      return `<div class="summary"><p class="label">Ściąga</p><ul class="phrases">${block.phrases
        .map((p) => `<li><strong lang="es">${e(p.text)}</strong> — ${e(p.translation)}</li>`)
        .join("")}</ul><p class="label">Potrafię…</p><ul class="cando">${block.canDo
        .map((c) => `<li>☐ ${e(c)}</li>`)
        .join("")}</ul></div>`;
  }
}

/** The published A1 lessons in course order, and how many exercises each has in the app. */
export async function loadA1() {
  const result = await loadContentCatalog(path.join(repoRoot, "content"));
  if (!result.ok) throw new Error("Content is invalid: run pnpm content:validate");
  const { catalog } = result;
  const lessons = catalog.content
    .filter(
      (c) =>
        c.languageId === "es" &&
        c.levelId === "a1" &&
        c.type === "lesson" &&
        c.status === "published",
    )
    .sort((a, b) => a.order - b.order);
  const exerciseCount = new Map<string, number>();
  for (const exercise of catalog.exercises) {
    exerciseCount.set(exercise.lessonId, (exerciseCount.get(exercise.lessonId) ?? 0) + 1);
  }
  return { lessons, exerciseCount };
}

/** Renders an HTML file to PDF with headless Chrome/Edge. */
export function htmlToPdf(htmlFile: string, pdfFile: string): void {
  const browser = BROWSERS.find((candidate) => existsSync(candidate));
  if (!browser) throw new Error("No Chrome/Edge found to render the PDF.");
  execFileSync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfFile}`,
    `file:///${htmlFile.replaceAll("\\", "/")}`,
  ]);
}
