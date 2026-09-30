import type { TimedLine, VideoTimeline } from "@tfm-bic/application";
import type { VideoScene, VideoScript } from "@tfm-bic/domain";

import { pictogramMarkup } from "./pictograms.js";

/**
 * Builds one Hyperframes composition (index.html) from a video script and its timeline (M21,
 * ADR-031). Written against the contract verified on 2026-09-30 at
 * hyperframes.heygen.com/reference/html-schema and /concepts/compositions:
 *
 * - a sized root with `data-composition-id`, `data-start="0"`, `data-duration`, `data-width/height`;
 * - timed elements with `class="clip"`, `data-start`, `data-duration`, `data-track-index`;
 * - `<audio>` with `data-start`/`data-duration`/`data-volume` (mixed by the renderer's FFmpeg step);
 * - one finite GSAP timeline created `{ paused: true }` and registered synchronously on
 *   `window.__timelines` under the composition id — no wall clock, no randomness, no fetches.
 *
 * Every piece of content text is HTML-escaped; nothing from content becomes markup or script.
 * Visual language follows the site (ADR-030): exercise-book paper, the orange margin line,
 * Bricolage Grotesque, navy ink.
 */

export const COMPOSITION_ID = "main";
export const WIDTH = 1280;
export const HEIGHT = 720;
/** Bump when the template changes: part of every video's source hash. */
export const TEMPLATE_VERSION = 1;

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

const n = (value: number) => value.toFixed(3);

/** Wraps whole-word, case-insensitive occurrences of `word` in <mark>, escaping everything. */
function highlighted(text: string, word: string | undefined, locale: string): string {
  if (!word) return escapeHtml(text);
  const lowerText = text.toLocaleLowerCase(locale);
  const lowerWord = word.toLocaleLowerCase(locale);
  const isLetter = (ch: string | undefined) => ch !== undefined && /\p{L}/u.test(ch);
  let out = "";
  let i = 0;
  while (i < text.length) {
    const at = lowerText.indexOf(lowerWord, i);
    if (at === -1) break;
    const end = at + lowerWord.length;
    if (!isLetter(text[at - 1]) && !isLetter(text[end])) {
      out += `${escapeHtml(text.slice(i, at))}<mark>${escapeHtml(text.slice(at, end))}</mark>`;
    } else {
      out += escapeHtml(text.slice(i, end));
    }
    i = end;
  }
  return out + escapeHtml(text.slice(i));
}

/** Big text shrinks with its length so it always fits the frame. */
function phraseSize(text: string): number {
  const len = [...text].length;
  if (len <= 12) return 104;
  if (len <= 22) return 80;
  if (len <= 34) return 64;
  return 50;
}

interface Built {
  html: string;
  js: string[];
}

function languageName(language: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language;
  } catch {
    return language;
  }
}

/** A tween that reveals `selector` at time `t`. */
const reveal = (selector: string, t: number, dy = 14) =>
  `tl.fromTo(${JSON.stringify(selector)},{opacity:0,y:${String(dy)}},{opacity:1,y:0,duration:0.4,ease:"power2.out"},${n(t)});`;

function sceneMarkup(
  scene: VideoScene,
  index: number,
  lines: TimedLine[],
  script: VideoScript,
  locale: string,
): Built {
  const id = `s${String(index)}`;
  const js: string[] = [];
  const targetLines = lines.filter((l) => l.language === script.targetLanguage);
  const firstInstruction = lines.find((l) => l.language === script.instructionLanguage);
  const lineWithText = (text: string) => lines.find((l) => l.text === text);
  const sceneStart = lines[0]?.start ?? 0;

  // The "listening" badge pulses while the language being learned is spoken in this scene.
  const listening = targetLines.length
    ? `<div class="listening" id="${id}-listen"><span class="bars">${"<i></i>".repeat(5)}</span>${escapeHtml(languageName(script.targetLanguage))}</div>`
    : "";
  for (const line of targetLines) {
    js.push(
      `tl.fromTo("#${id}-listen",{opacity:0.35},{opacity:1,duration:0.15},${n(line.start)});`,
      `tl.fromTo("#${id}-listen .bars i",{scaleY:0.35},{scaleY:1,duration:0.16,yoyo:true,repeat:${String(
        Math.max(1, Math.floor(line.duration / 0.16) | 1),
      )},stagger:0.04,ease:"sine.inOut"},${n(line.start)});`,
      `tl.to("#${id}-listen",{opacity:0.35,duration:0.2},${n(line.start + line.duration)});`,
    );
  }

  switch (scene.kind) {
    case "title": {
      js.push(
        reveal(`#${id} .eyebrow`, sceneStart - 0.3),
        reveal(`#${id} h1`, sceneStart - 0.1, 24),
        `tl.fromTo("#margin-line",{scaleY:0},{scaleY:1,duration:1.2,ease:"power2.inOut"},0);`,
      );
      if (scene.subtitle) js.push(reveal(`#${id} .subtitle`, sceneStart + 0.4));
      return {
        html: `<p class="eyebrow">${escapeHtml(scene.eyebrow)}</p>
          <h1 class="title" style="font-size:${String(Math.min(96, phraseSize(scene.title)))}px">${escapeHtml(scene.title)}</h1>
          ${scene.subtitle ? `<p class="subtitle">${escapeHtml(scene.subtitle)}</p>` : ""}`,
        js,
      };
    }
    case "explanation": {
      scene.sentences.forEach((_, i) => {
        const line = lines[i];
        if (!line) return;
        js.push(reveal(`#${id}-p${String(i)}`, line.start - 0.2));
        if (i > 0)
          js.push(
            `tl.to("#${id}-p${String(i - 1)}",{opacity:0.42,duration:0.3},${n(line.start - 0.2)});`,
          );
      });
      return {
        html: `<p class="heading">${escapeHtml(scene.heading)}</p>
          <div class="sentences">${scene.sentences
            .map((s, i) => `<p id="${id}-p${String(i)}">${escapeHtml(s)}</p>`)
            .join("")}</div>`,
        js,
      };
    }
    case "phrase": {
      js.push(reveal(`#${id} .phrase`, sceneStart - 0.3, 20));
      if (firstInstruction) js.push(reveal(`#${id} .translation`, firstInstruction.start - 0.1));
      const noteLine = scene.phrase.note ? lineWithText(scene.phrase.note) : undefined;
      if (noteLine) js.push(reveal(`#${id} .note`, noteLine.start - 0.1));
      else if (scene.phrase.note && firstInstruction)
        js.push(reveal(`#${id} .note`, firstInstruction.start + 0.6));
      if (scene.source) js.push(reveal(`#${id} .source`, sceneStart));
      return {
        html: `<p class="heading">${escapeHtml(scene.heading)}</p>
          ${listening}
          <p class="phrase" lang="${escapeHtml(script.targetLanguage)}" style="font-size:${String(phraseSize(scene.phrase.text))}px">${highlighted(scene.phrase.text, scene.highlight, locale)}</p>
          <p class="translation">${escapeHtml(scene.phrase.translation)}</p>
          ${scene.phrase.note ? `<p class="note">${escapeHtml(scene.phrase.note)}</p>` : ""}
          ${scene.source ? `<p class="source">${escapeHtml(scene.source)}</p>` : ""}`,
        js,
      };
    }
    case "dialogue": {
      scene.lines.forEach((_, i) => {
        const line = targetLines[i];
        if (line) js.push(reveal(`#${id}-b${String(i)}`, line.start - 0.15));
      });
      return {
        html: `<p class="heading">${escapeHtml(scene.heading)}</p>
          ${listening}
          <div class="dialogue">${scene.lines
            .map(
              (
                l,
                i,
              ) => `<div class="bubble ${i % 2 === 0 ? "left" : "right"}" id="${id}-b${String(i)}">
                <span class="speaker">${escapeHtml(l.speaker)}</span>
                <span class="said" lang="${escapeHtml(script.targetLanguage)}">${escapeHtml(l.text)}</span>
                <span class="gloss">${escapeHtml(l.translation)}</span></div>`,
            )
            .join("")}</div>`,
        js,
      };
    }
    case "word": {
      const pictogram = scene.pictogram ? pictogramMarkup(scene.pictogram) : undefined;
      const meaningAt = firstInstruction?.start ?? sceneStart + 1;
      js.push(
        reveal(`#${id} .word`, sceneStart - 0.3, 24),
        reveal(`#${id} .meaning`, meaningAt - 0.1),
      );
      if (pictogram) {
        js.push(
          `document.querySelectorAll("#${id} .pictogram :not([data-accent])").forEach(function(el){var l=el.getTotalLength?el.getTotalLength():300;el.style.strokeDasharray=l;el.style.strokeDashoffset=l;});`,
          `tl.to("#${id} .pictogram :not([data-accent])",{strokeDashoffset:0,duration:1.1,stagger:0.12,ease:"power1.inOut"},${n(meaningAt - 0.2)});`,
          `tl.fromTo("#${id} .pictogram [data-accent]",{opacity:0,scale:0.4,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.35,stagger:0.3,ease:"back.out(2)"},${n(meaningAt + 0.5)});`,
        );
      }
      scene.facts.forEach((fact, i) => {
        js.push(reveal(`#${id}-f${String(i)}`, meaningAt + 0.8 + i * 0.25, 8));
        if (fact.spokenValue) {
          const spoken = targetLines.find((l) => l.text === fact.value);
          if (spoken) {
            js.push(
              `tl.to("#${id}-f${String(i)}",{backgroundColor:"rgba(255,107,53,0.18)",duration:0.2},${n(spoken.start - 0.1)});`,
              `tl.to("#${id}-f${String(i)}",{backgroundColor:"rgba(20,35,60,0.05)",duration:0.4},${n(spoken.start + spoken.duration + 0.2)});`,
            );
          }
        }
      });
      const noteLine = lines.find(
        (l) =>
          l.language === script.instructionLanguage &&
          l !== firstInstruction &&
          !l.text.endsWith(":"),
      );
      return {
        html: `${listening}
          <div class="word-layout ${pictogram ? "" : "no-pictogram"}">
            ${pictogram ? `<svg class="pictogram" viewBox="0 0 120 120" aria-hidden="true">${pictogram}</svg>` : ""}
            <div>
              <p class="word" lang="${escapeHtml(script.targetLanguage)}" style="font-size:${String(Math.min(120, phraseSize(scene.word) + 16))}px">${escapeHtml(scene.word)}</p>
              <p class="meaning">${escapeHtml(scene.meaning)}</p>
              <div class="facts">${scene.facts
                .map(
                  (f, i) =>
                    `<span class="fact" id="${id}-f${String(i)}"><b>${escapeHtml(f.label)}</b> <span${
                      f.spokenValue ? ` lang="${escapeHtml(script.targetLanguage)}"` : ""
                    }>${escapeHtml(f.value)}</span></span>`,
                )
                .join("")}</div>
              ${noteLine ? `<p class="note" id="${id}-note">${escapeHtml(noteLine.text)}</p>` : ""}
            </div>
          </div>`,
        js: noteLine ? [...js, reveal(`#${id}-note`, noteLine.start - 0.1)] : js,
      };
    }
    case "recap": {
      js.push(reveal(`#${id} .recap`, sceneStart - 0.3));
      scene.items.forEach((_, i) => {
        const line = targetLines[i];
        if (!line) return;
        js.push(
          `tl.to("#${id}-r${String(i)}",{borderColor:"rgb(255,107,53)",backgroundColor:"rgba(255,107,53,0.10)",duration:0.2},${n(line.start - 0.1)});`,
          `tl.to("#${id}-r${String(i)}",{borderColor:"rgba(20,35,60,0.15)",backgroundColor:"rgba(255,255,255,0.6)",duration:0.3},${n(line.start + line.duration + 0.1)});`,
        );
      });
      const cols = scene.items.length > 4 ? 3 : Math.max(1, Math.min(2, scene.items.length));
      return {
        html: `<p class="heading">${escapeHtml(scene.heading)}</p>
          ${listening}
          <div class="recap${scene.items.length === 1 ? " single" : ""}" style="grid-template-columns:repeat(${String(cols)},1fr)">${scene.items
            .map(
              (item, i) =>
                `<div class="card" id="${id}-r${String(i)}"><span class="said" lang="${escapeHtml(
                  script.targetLanguage,
                )}">${escapeHtml(item.text)}</span><span class="gloss">${escapeHtml(item.translation)}</span></div>`,
            )
            .join("")}</div>`,
        js,
      };
    }
    case "next-step": {
      js.push(
        reveal(`#${id} .heading`, sceneStart - 0.3),
        reveal(`#${id} .body`, sceneStart),
        `tl.fromTo("#${id} .arrow",{x:-12,opacity:0},{x:0,opacity:1,duration:0.5,ease:"power2.out"},${n(sceneStart + 0.3)});`,
      );
      return {
        html: `<p class="heading big">${escapeHtml(scene.heading)}</p>
          <p class="body">${escapeHtml(scene.body)}</p>
          <svg class="arrow" viewBox="0 0 120 40" aria-hidden="true"><path d="M4 20 H108 M90 6 L110 20 L90 34"/></svg>`,
        js,
      };
    }
  }
}

const STYLE = `
@font-face{font-family:"Bricolage";src:url("fonts/latin-ext.woff2") format("woff2");font-weight:200 800;unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}
@font-face{font-family:"Bricolage";src:url("fonts/latin.woff2") format("woff2");font-weight:200 800;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
*{box-sizing:border-box;margin:0}
body{margin:0;background:#f8f9fa}
#root{position:relative;width:1280px;height:720px;overflow:hidden;font-family:"Bricolage",system-ui,sans-serif;color:rgb(20,35,60);
  background:#f8f9fa repeating-linear-gradient(180deg,transparent 0 47px,rgba(20,35,60,0.06) 47px 48px);}
#margin-line{position:absolute;left:112px;top:0;width:3px;height:720px;background:rgb(255,107,53);transform-origin:50% 0}
#brand{position:absolute;left:144px;top:34px;font-weight:700;font-size:20px;letter-spacing:-0.01em}
#brand span{color:rgb(184,64,16);font-weight:500}
#progress{position:absolute;left:0;bottom:0;height:6px;width:1280px;background:rgb(255,107,53);transform-origin:0 50%}
.clip.scene{position:absolute;left:144px;top:92px;width:1060px;height:580px;display:flex;flex-direction:column;justify-content:center;gap:18px}
.eyebrow,.heading{font-size:22px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:rgb(184,64,16)}
.heading.big{font-size:56px;text-transform:none;letter-spacing:-0.01em;color:rgb(20,35,60)}
.title{font-weight:800;line-height:1.02;letter-spacing:-0.02em}
.subtitle{font-size:34px;line-height:1.3;color:rgba(20,35,60,0.78);max-width:960px}
.sentences p{font-size:36px;line-height:1.38;margin-bottom:18px;max-width:1000px}
.phrase{font-weight:800;line-height:1.08;letter-spacing:-0.02em}
.phrase mark,.word mark{background:linear-gradient(transparent 62%,rgba(255,107,53,0.45) 62%);color:inherit}
.translation,.meaning{font-size:40px;color:rgba(20,35,60,0.82)}
.note{font-size:28px;line-height:1.35;color:rgba(20,35,60,0.7);max-width:960px}
.source{font-size:22px;color:rgba(20,35,60,0.6)}
.listening{position:absolute;right:0;top:0;display:flex;align-items:center;gap:12px;font-size:22px;font-weight:600;opacity:0.35;
  border:2px solid rgba(20,35,60,0.2);border-radius:999px;padding:8px 18px}
.listening .bars{display:flex;gap:4px;align-items:center;height:26px}
.listening .bars i{display:block;width:5px;height:26px;border-radius:3px;background:rgb(255,107,53);transform-origin:50% 50%;transform:scaleY(0.35)}
.dialogue{display:flex;flex-direction:column;gap:14px}
.bubble{max-width:720px;border-radius:22px;padding:14px 22px;background:#fff;border:2px solid rgba(20,35,60,0.12);display:flex;flex-direction:column;gap:2px}
.bubble.right{align-self:flex-end;background:rgba(255,107,53,0.09);border-color:rgba(255,107,53,0.45)}
.bubble .speaker{font-size:18px;font-weight:700;color:rgb(184,64,16)}
.bubble .said{font-size:32px;font-weight:700}
.bubble .gloss,.card .gloss{font-size:21px;color:rgba(20,35,60,0.7)}
.word-layout{display:grid;grid-template-columns:300px 1fr;gap:56px;align-items:center}
.word-layout.no-pictogram{grid-template-columns:1fr}
.pictogram{width:300px;height:300px;fill:none;stroke:rgb(20,35,60);stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round}
.pictogram [data-accent]{fill:rgb(255,107,53);stroke:rgb(184,64,16)}
.word{font-weight:800;line-height:1;letter-spacing:-0.02em}
.facts{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}
.fact{font-size:24px;border-radius:12px;padding:8px 16px;background:rgba(20,35,60,0.05)}
.fact b{font-weight:600;color:rgba(20,35,60,0.62);text-transform:uppercase;font-size:16px;letter-spacing:0.06em}
.word-layout .note{margin-top:18px}
.recap{display:grid;gap:16px}
.card{border:2px solid rgba(20,35,60,0.15);border-radius:18px;padding:16px 22px;background:rgba(255,255,255,0.6);display:flex;flex-direction:column;gap:4px}
.card .said{font-size:30px;font-weight:700}
.recap.single .card{padding:36px 44px;max-width:760px}
.recap.single .said{font-size:88px;font-weight:800;letter-spacing:-0.02em}
.recap.single .gloss{font-size:36px}
.body{font-size:38px;line-height:1.3;max-width:940px}
.arrow{width:180px;height:60px;fill:none;stroke:rgb(255,107,53);stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
`;

/** The complete index.html for one video. `clipSrc` maps a clip path to its file inside the project. */
export function buildComposition(
  script: VideoScript,
  timeline: VideoTimeline,
  options: { locale: string; clipSrc: (clipPath: string) => string },
): string {
  const D = timeline.durationSeconds;
  const scenesHtml: string[] = [];
  const js: string[] = [
    `tl.fromTo("#progress",{scaleX:0},{scaleX:1,duration:${n(D)},ease:"none"},0);`,
  ];

  script.scenes.forEach((scene, index) => {
    const timed = timeline.scenes[index];
    if (!timed) throw new Error("Timeline does not match the script.");
    const lines = timeline.lines.filter((l) => l.sceneIndex === index);
    const built = sceneMarkup(scene, index, lines, script, options.locale);
    scenesHtml.push(
      `<section id="s${String(index)}" class="clip scene" data-start="${n(timed.start)}" data-duration="${n(timed.duration)}" data-track-index="1">${built.html}</section>`,
    );
    js.push(
      `tl.fromTo("#s${String(index)}",{opacity:0},{opacity:1,duration:0.3},${n(timed.start)});`,
      `tl.to("#s${String(index)}",{opacity:0,duration:0.25},${n(timed.start + timed.duration - 0.25)});`,
      ...built.js,
    );
  });

  const audio = timeline.lines
    .map(
      (line, i) =>
        `<audio id="a${String(i)}" src="${escapeHtml(options.clipSrc(line.clipPath))}" data-start="${n(line.start)}" data-duration="${n(line.duration)}" data-track-index="2" data-volume="1"></audio>`,
    )
    .join("\n    ");

  return `<!doctype html>
<html lang="${escapeHtml(script.instructionLanguage)}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${String(WIDTH)}, height=${String(HEIGHT)}" />
    <script src="gsap.min.js"></script>
    <style>${STYLE}</style>
  </head>
  <body>
    <div id="root" data-composition-id="${COMPOSITION_ID}" data-start="0" data-duration="${n(D)}" data-width="${String(WIDTH)}" data-height="${String(HEIGHT)}">
    <div id="margin-line"></div>
    <div id="brand">TFM-BIC <span>· ${escapeHtml(script.level ? script.level.toUpperCase() : "")}</span></div>
    ${scenesHtml.join("\n    ")}
    ${audio}
    <div id="progress"></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      var tl = gsap.timeline({ paused: true });
      ${js.join("\n      ")}
      window.__timelines[${JSON.stringify(COMPOSITION_ID)}] = tl;
    </script>
  </body>
</html>
`;
}

/** WebVTT captions: one cue per spoken line. Text is escaped per the WebVTT cue-text rules. */
export function buildWebVtt(cues: { start: number; end: number; text: string }[]): string {
  const ts = (s: number) => {
    const ms = Math.round(s * 1000);
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const sec = Math.floor((ms % 60_000) / 1000);
    const pad = (v: number, w = 2) => String(v).padStart(w, "0");
    return `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(ms % 1000, 3)}`;
  };
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `WEBVTT\n\n${cues
    .map((c, i) => `${String(i + 1)}\n${ts(c.start)} --> ${ts(c.end)}\n${esc(c.text)}\n`)
    .join("\n")}`;
}
