import type { TimedLine } from "@tfm-bic/application";
import type { VideoScene, VideoScript } from "@tfm-bic/domain";

import { emitAction, type ActorState, type SceneTimeline } from "./actions.js";
import { characterMetrics } from "./characters.js";
import { FLOOR_Y } from "./environments.js";
import { escapeHtml, n, WIDTH } from "./markup.js";
import { liveliness, stageMarkup } from "./stage.js";

/** Phrases longer than this wrap onto two lines in a wider card (B2+ sentences). Shorter ones
 * render exactly as before, so existing videos are unchanged. */
const LONG_PHRASE = 24;

function isLong(text: string): boolean {
  return text.length > LONG_PHRASE;
}

/** The card classes for a phrase: wider and wrapped when long, smaller still when very long. */
function cardSize(text: string): string {
  return isLong(text) ? (text.length > 60 ? " long xlong" : " long") : "";
}

function cardPosition(states: Map<string, ActorState>, speaker: string | undefined, text = "") {
  const long = isLong(text);
  const st = speaker ? states.get(speaker) : undefined;
  if (!st) return { left: WIDTH / 2, top: long ? 90 : 120 };
  const head = characterMetrics(st.look).headTop;
  const margin = long ? 330 : 230;
  return {
    left: Math.min(WIDTH - margin, Math.max(margin, st.x)),
    top: Math.max(long ? 70 : 96, FLOOR_Y - head - (long ? 200 : 150)),
  };
}

export function situationScene(
  scene: Extract<VideoScene, { kind: "situation" }>,
  prefix: string,
  lines: TimedLine[],
  start: number,
  end: number,
  script: VideoScript,
  tl: SceneTimeline,
) {
  const { svg, states } = stageMarkup(prefix, scene.stage, script);
  const cards: string[] = [];
  let lastCard: string | undefined;
  scene.beats.forEach((beat, b) => {
    const line = lines[beat.line];
    if (!line) return;
    // Actions with the same timing run in order: each starts when the previous one ends.
    const cursor = {
      lead: line.leadStart + 0.1,
      with: line.start,
      after: line.start + line.duration,
    };
    for (const { when, action } of beat.actions ?? []) {
      cursor[when] = emitAction(tl, scene.stage, states, action, cursor[when]) + 0.05;
    }
    if (beat.card) {
      const id = `${prefix}-card-${String(b)}`;
      const pos = cardPosition(states, line.speaker, beat.card.text);
      cards.push(`<div class="phrase-card${cardSize(beat.card.text)}" id="${id}" style="left:${String(pos.left)}px;top:${String(pos.top)}px">
        <span class="said" lang="${escapeHtml(script.targetLanguage)}">${escapeHtml(beat.card.text)}</span>
        ${beat.card.meaning ? `<span class="gloss">${escapeHtml(beat.card.meaning)}</span>` : ""}</div>`);
      if (lastCard) tl.to(`#${lastCard}`, `{opacity:0,duration:0.2}`, line.start - 0.15);
      tl.push(
        `tl.fromTo("#${id}",{opacity:0,scale:0.85},{opacity:1,scale:1,duration:0.3,ease:"back.out(2)"},${n(line.start - 0.05)});`,
      );
      tl.to(
        `#${id} .gloss`,
        `{opacity:1,duration:0.3}`,
        line.start + Math.min(0.9, line.duration * 0.6),
      );
      lastCard = id;
    }
  });
  liveliness(tl, states, lines, start, end);
  const overlay = scene.overlayTitle
    ? `<div class="overlay-title" id="${prefix}-ot">${escapeHtml(scene.overlayTitle)}</div>`
    : "";
  if (scene.overlayTitle) {
    tl.push(
      `tl.fromTo("#${prefix}-ot",{opacity:0,x:-12},{opacity:1,x:0,duration:0.4},${n(start + 0.2)});`,
    );
    tl.to(`#${prefix}-ot`, `{opacity:0,duration:0.4}`, start + 4);
  }
  return `${svg}${cards.join("")}${overlay}`;
}

export function retrievalScene(
  scene: Extract<VideoScene, { kind: "retrieval" }>,
  prefix: string,
  lines: TimedLine[],
  start: number,
  end: number,
  script: VideoScript,
  tl: SceneTimeline,
) {
  const { svg, states } = stageMarkup(prefix, scene.stage, script);
  for (const action of scene.setup) emitAction(tl, scene.stage, states, action, start, true);
  const [prompt, answer, check] = lines;
  const pos = cardPosition(states, scene.answerBy, scene.answer.text);
  if (prompt && answer) {
    const pause = Math.max(0.5, answer.start - (prompt.start + prompt.duration) - 0.2);
    tl.push(
      `tl.fromTo("#${prefix}-prompt",{opacity:0,y:-14},{opacity:1,y:0,duration:0.35},${n(prompt.start - 0.1)});`,
    );
    tl.push(
      `tl.fromTo("#${prefix}-ring",{attr:{"stroke-dashoffset":0}},{attr:{"stroke-dashoffset":163},duration:${n(pause)},ease:"none"},${n(prompt.start + prompt.duration)});`,
    );
    tl.to(`#${prefix}-timer`, `{opacity:1,duration:0.2}`, prompt.start + prompt.duration);
    tl.to(`#${prefix}-timer`, `{opacity:0,duration:0.2}`, answer.start - 0.2);
    tl.push(
      `tl.fromTo("#${prefix}-answer",{opacity:0,scale:0.8},{opacity:1,scale:1,duration:0.3,ease:"back.out(2)"},${n(answer.start - 0.05)});`,
    );
    tl.to(`#${prefix}-dim`, `{opacity:0,duration:0.4}`, answer.start);
    // The question has done its job once the answer appears; it would cover the answer card.
    tl.to(`#${prefix}-prompt`, `{opacity:0,duration:0.25}`, answer.start - 0.1);
  }
  if (check) tl.to(`#${prefix}-check`, `{opacity:1,duration:0.3}`, check.start - 0.05);
  liveliness(tl, states, lines, start, end);
  return `${svg}
    <div class="dim" id="${prefix}-dim"></div>
    <div class="prompt" id="${prefix}-prompt"><span class="tag">${escapeHtml(script.labels?.yourTurn ?? "Your turn")}</span>${escapeHtml(prompt ? (scene.narration[0]?.text ?? "") : "")}</div>
    <svg class="timer" id="${prefix}-timer" viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" stroke="#e4daf7" stroke-width="6" fill="#ffffff"/><circle id="${prefix}-ring" cx="30" cy="30" r="26" stroke="#7c4dd6" stroke-width="6" fill="none" stroke-dasharray="163" transform="rotate(-90 30 30)"/></svg>
    <div class="phrase-card answer${cardSize(scene.answer.text)}" id="${prefix}-answer" style="left:${String(pos.left)}px;top:${String(pos.top)}px"><span class="ok">✓</span><span class="said" lang="${escapeHtml(script.targetLanguage)}">${escapeHtml(scene.answer.text)}</span>${scene.answer.meaning ? `<span class="gloss" style="opacity:1">${escapeHtml(scene.answer.meaning)}</span>` : ""}</div>
    <div class="check" id="${prefix}-check">${escapeHtml(scene.narration[2]?.text ?? "")}</div>`;
}

export function focusScene(
  scene: Extract<VideoScene, { kind: "focus" }>,
  prefix: string,
  lines: TimedLine[],
  start: number,
  script: VideoScript,
  tl: SceneTimeline,
) {
  const phrase = escapeHtml(scene.phrase);
  let shown = phrase;
  if (scene.highlight) {
    const i = scene.phrase
      .toLocaleLowerCase(script.targetLanguage)
      .indexOf(scene.highlight.toLocaleLowerCase(script.targetLanguage));
    if (i >= 0) {
      const a = scene.phrase.slice(0, i),
        b = scene.phrase.slice(i, i + scene.highlight.length),
        c = scene.phrase.slice(i + scene.highlight.length);
      shown = `${escapeHtml(a)}<mark id="${prefix}-mark">${escapeHtml(b)}</mark>${escapeHtml(c)}`;
    }
  }
  tl.push(
    `tl.fromTo("#${prefix} .focus-phrase",{opacity:0,y:20},{opacity:1,y:0,duration:0.45},${n(start + 0.2)});`,
  );
  if (scene.meaning)
    tl.to(
      `#${prefix} .focus-meaning`,
      `{opacity:1,duration:0.4}`,
      (lines[0]?.start ?? start) + (lines[0]?.duration ?? 0),
    );
  if (scene.highlight)
    tl.push(
      `tl.fromTo("#${prefix}-mark",{backgroundSize:"0% 40%"},{backgroundSize:"100% 40%",duration:0.5},${n((lines[0]?.start ?? start) + 0.2)});`,
    );
  if (scene.respelling)
    tl.to(`#${prefix} .respell`, `{opacity:1,duration:0.4}`, (lines[1]?.start ?? start + 1) - 0.1);
  (scene.panels ?? []).forEach((_, i) => {
    tl.to(
      `#${prefix}-panel-${String(i)}`,
      `{opacity:1,y:0,duration:0.35}`,
      (lines[i + 1]?.start ?? start + 1.5 + i) - 0.1,
    );
  });
  const respell = scene.respelling
    ? `<div class="respell">${escapeHtml(script.labels?.roughly ?? "Roughly:")} ${escapeHtml(scene.respelling).replace(/([A-ZĄĆĘŁŃÓŚŹŻ]{2,})/g, "<b>$1</b>")}</div>`
    : "";
  return `<div class="board">
    <p class="heading">${escapeHtml(scene.heading)}</p>
    <p class="focus-phrase${isLong(scene.phrase) ? " long" : ""}" lang="${escapeHtml(script.targetLanguage)}">${shown}</p>
    ${scene.meaning ? `<p class="focus-meaning">${escapeHtml(scene.meaning)}</p>` : ""}
    ${respell}
    ${scene.panels ? `<div class="panels">${scene.panels.map((p, i) => `<div class="panel" id="${prefix}-panel-${String(i)}"><span class="cap">${escapeHtml(p.caption)}</span><span class="said" lang="${escapeHtml(script.targetLanguage)}">${escapeHtml(p.text)}</span></div>`).join("")}</div>` : ""}
  </div>`;
}

/**
 * Simplified side view of the mouth (facing left), drawn from the phonetics content's own
 * descriptions: for sz "the tongue tip curls further back"; for ś "the tongue body raised toward the
 * hard palate". A listening guide, not an articulatory measurement.
 */
function mouthDiagram(
  articulation: "retroflex" | "alveolo-palatal" | "close-front" | "near-close-front" | "plain",
  palate: string,
): string {
  // Vowels: the tongue body is high and front for /iː/ (close to the palate, tense) and a little
  // lower and more relaxed for /ɪ/ — the difference the content describes.
  const tongue =
    articulation === "retroflex"
      ? "M70 178 C70 150 84 136 104 118 C114 108 116 96 108 92 C98 90 96 104 100 116 C108 132 150 132 196 138 C228 142 246 160 250 196 L70 196 Z"
      : articulation === "alveolo-palatal"
        ? "M64 168 C64 150 76 142 92 134 C112 104 148 86 182 90 C220 96 244 126 250 196 L64 196 Z"
        : articulation === "close-front"
          ? "M64 166 C70 140 88 100 124 86 C160 78 214 92 240 130 C248 150 250 170 250 196 L64 196 Z"
          : articulation === "near-close-front"
            ? "M64 170 C72 150 92 120 126 110 C162 102 212 114 238 144 C248 160 250 176 250 196 L64 196 Z"
            : "M64 170 C80 150 120 142 170 142 C214 142 244 160 250 196 L64 196 Z";
  const label =
    articulation === "retroflex"
      ? `<path d="M150 40 C134 52 118 70 108 88" stroke="#ff6b35" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M104 80 l4 12 l10 -7" stroke="#ff6b35" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="154" y="38" font-size="18" font-weight="700" fill="#b84010">tip curls back</text>`
      : articulation === "alveolo-palatal"
        ? `<path d="M168 24 C164 44 160 62 158 80" stroke="#ff6b35" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M151 72 l7 12 l8 -10" stroke="#ff6b35" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="174" y="24" font-size="18" font-weight="700" fill="#b84010">body rises</text>`
        : "";
  return `<svg viewBox="0 0 270 210" class="mouth" role="img" aria-label="Simplified side view of the mouth">
    <path d="M24 30 C30 60 26 90 14 104 C22 112 30 118 26 132 C30 160 34 196 60 204 L270 204 L270 30 Z" fill="#f6dccb"/>
    <path d="M58 64 C80 52 100 50 116 58 C150 40 200 40 248 62 L248 74 C200 58 150 60 118 72 C100 64 82 66 62 76 Z" fill="#e8b8a0"/>
    <path d="M40 70 Q56 64 66 72 L62 92 Q50 88 40 92 Z" fill="#ffffff" stroke="#c9b7a7" stroke-width="2"/>
    <path d="M42 176 Q56 182 66 174 L62 156 Q50 160 42 158 Z" fill="#ffffff" stroke="#c9b7a7" stroke-width="2"/>
    <path d="M18 96 Q34 88 46 94 M18 140 Q34 148 46 142" stroke="#c0563b" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="${tongue}" fill="#e57a7a" stroke="#b5515a" stroke-width="3"/>
    <text x="196" y="58" font-size="15" fill="#8a6a5a">${escapeHtml(palate)}</text>
    ${label}
  </svg>`;
}

export function contrastScene(
  scene: Extract<VideoScene, { kind: "contrast" }>,
  prefix: string,
  lines: TimedLine[],
  script: VideoScript,
  tl: SceneTimeline,
) {
  scene.itemLines.forEach((lineIndex, i) => {
    const line = lines[lineIndex];
    if (!line) return;
    tl.push(
      `tl.fromTo("#${prefix}-col-${String(i)}",{opacity:0.25},{opacity:1,duration:0.3},${n(line.start - 0.1)});`,
    );
    tl.to(
      `#${prefix}-col-${String(i)}`,
      `{borderColor:"rgb(124,77,214)",duration:0.2}`,
      line.start,
    );
    tl.to(
      `#${prefix}-col-${String(i)}`,
      `{borderColor:"rgba(91,61,160,0.18)",duration:0.3}`,
      line.start + line.duration + 0.3,
    );
  });
  return `<div class="board"><p class="heading">${escapeHtml(scene.heading)}</p><div class="contrast">${scene.items
    .map(
      (item, i) => `<div class="col" id="${prefix}-col-${String(i)}" style="opacity:0.25">
        <p class="spell" lang="${escapeHtml(script.targetLanguage)}">${escapeHtml(item.spelling)}</p>
        ${mouthDiagram(item.articulation, script.labels?.palate ?? "palate")}
        <p class="word" lang="${escapeHtml(script.targetLanguage)}">${escapeHtml(item.word)}</p>
        <p class="gloss">${escapeHtml(item.meaning)} · /${escapeHtml(item.ipa)}/</p></div>`,
    )
    .join(
      "",
    )}</div><p class="note-small">${escapeHtml(script.labels?.diagramNote ?? "Simplified side view of the mouth — a guide for listening, not a measurement.")}</p></div>`;
}
