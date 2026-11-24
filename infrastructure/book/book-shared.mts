/** Shared by the digital book (generate-book.mts) and the print edition (generate-print-book.mts). */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

export type Block =
  | { type: "explanation"; text: string }
  | { type: "example"; text: string; translation?: string; note?: string }
  | { type: "dialogue"; lines: { speaker: string; text: string; translation?: string }[] };

export function renderBlock(block: Block): string {
  if (block.type === "explanation") return `<p class="explanation">${escapeHtml(block.text)}</p>`;
  if (block.type === "example") {
    return `<div class="example"><p class="es" lang="es">${escapeHtml(block.text)}</p>${
      block.translation ? `<p class="pl">${escapeHtml(block.translation)}</p>` : ""
    }${block.note ? `<p class="note">${escapeHtml(block.note)}</p>` : ""}</div>`;
  }
  return `<table class="dialogue">${block.lines
    .map(
      (line) =>
        `<tr><th>${escapeHtml(line.speaker)}</th><td><span lang="es">${escapeHtml(line.text)}</span>${
          line.translation ? `<br><span class="pl">${escapeHtml(line.translation)}</span>` : ""
        }</td></tr>`,
    )
    .join("")}</table>`;
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
