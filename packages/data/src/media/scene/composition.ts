import type { VideoTimeline } from "@tfm-bic/application";
import type { Stage, VideoScript } from "@tfm-bic/domain";

import { SceneTimeline } from "./actions.js";
import { environmentSvg } from "./environments.js";
import { escapeHtml, HEIGHT, n, q, scopeIds, WIDTH } from "./markup.js";
import { contrastScene, focusScene, retrievalScene, situationScene } from "./scenes.js";
import { STYLE } from "./styles.js";

export { escapeHtml, HEIGHT, WIDTH } from "./markup.js";

/**
 * Pedagogical video composition (M22, ADR-032) for Hyperframes — same verified contract as M21
 * (sized root with data-composition-id, timed .clip scenes, <audio> clips, one paused GSAP timeline
 * registered on window.__timelines), now with real places, illustrated characters and timed actions:
 *
 * - situation  → environment + props + characters; actions start with the line they belong to
 *                ("lead" = during the silence before it), the speaker's mouth moves while they talk,
 *                the target phrase appears near the speaker with its meaning (one card at a time);
 * - focus      → the form noticed: phrase, highlighted part, the content's respelling, panels;
 * - contrast   → two sounds with a simplified side-view articulation diagram each;
 * - retrieval  → the cue frozen with the target highlighted, a prompt, a silent countdown, the
 *                answer near its speaker, a self-check;
 * - next-step  → the hand-off.
 *
 * Only the CEFR level is shown as branding-free context. All text is HTML-escaped.
 */

export const COMPOSITION_ID = "main";
/** Bump when the template changes: part of every video's source hash. */
export const TEMPLATE_VERSION = 5;

export function buildComposition(
  script: VideoScript,
  timeline: VideoTimeline,
  options: { clipSrc: (clipPath: string) => string },
): string {
  const D = timeline.durationSeconds;
  const scenes: string[] = [];
  const js: string[] = [
    `tl.fromTo("#progress",{scaleX:0},{scaleX:1,duration:${n(D)},ease:"none"},0);`,
  ];

  // Board scenes sit over the last place seen, blurred, so the video keeps one visual world.
  let lastPlace: Stage | undefined = script.scenes.find((s) => "stage" in s)?.stage;
  const backdrop = (prefix: string) =>
    lastPlace
      ? `<svg class="stage backdrop" viewBox="0 0 ${String(WIDTH)} ${String(HEIGHT)}" width="${String(WIDTH)}" height="${String(HEIGHT)}">${scopeIds(environmentSvg(lastPlace.environment, lastPlace.time ?? "day").back, `${prefix}-bd`)}</svg>`
      : "";

  script.scenes.forEach((scene, index) => {
    const timed = timeline.scenes[index];
    if (!timed) throw new Error("Timeline does not match the script.");
    const prefix = `s${String(index)}`;
    const lines = timeline.lines.filter((l) => l.sceneIndex === index);
    const tl = new SceneTimeline(prefix);
    const start = timed.start;
    const end = timed.start + timed.duration;
    let html = "";
    if ("stage" in scene) lastPlace = scene.stage;
    switch (scene.kind) {
      case "situation":
        html = situationScene(scene, prefix, lines, start, end, script, tl);
        break;
      case "retrieval":
        html = retrievalScene(scene, prefix, lines, start, end, script, tl);
        break;
      case "focus":
        html = backdrop(prefix) + focusScene(scene, prefix, lines, start, script, tl);
        break;
      case "contrast":
        html = backdrop(prefix) + contrastScene(scene, prefix, lines, script, tl);
        break;
      case "next-step":
        tl.push(
          `tl.fromTo("#${prefix} .heading-big",{opacity:0,y:16},{opacity:1,y:0,duration:0.4},${n(start + 0.2)});`,
        );
        tl.push(
          `tl.fromTo("#${prefix} .arrow",{x:-12,opacity:0},{x:0,opacity:1,duration:0.5},${n(start + 0.6)});`,
        );
        html = `${backdrop(prefix)}<div class="board"><p class="focus-phrase heading-big" style="font-size:64px">${escapeHtml(scene.heading)}</p><p class="body">${escapeHtml(scene.body)}</p><svg class="arrow" viewBox="0 0 120 40"><path d="M4 20 H108 M90 6 L110 20 L90 34"/></svg></div>`;
        break;
    }
    scenes.push(
      `<section id="${prefix}" class="clip scene" data-start="${n(start)}" data-duration="${n(timed.duration)}" data-track-index="1">${html}</section>`,
    );
    js.push(
      `tl.fromTo("#${prefix}",{opacity:0},{opacity:1,duration:0.3},${n(start)});`,
      `tl.to("#${prefix}",{opacity:0,duration:0.25},${n(end - 0.25)});`,
      ...tl.js,
    );
  });

  const audio = timeline.lines
    .map(
      (line, i) =>
        `<audio id="au${String(i)}" src="${escapeHtml(options.clipSrc(line.clipPath))}" data-start="${n(line.start)}" data-duration="${n(line.duration)}" data-track-index="2" data-volume="1"></audio>`,
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
    ${script.level ? `<div id="level">${escapeHtml(script.level.toUpperCase())}</div>` : ""}
    ${scenes.join("\n    ")}
    ${audio}
    <div id="progress"></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      var tl = gsap.timeline({ paused: true });
      ${js.join("\n      ")}
      window.__timelines[${q(COMPOSITION_ID)}] = tl;
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
