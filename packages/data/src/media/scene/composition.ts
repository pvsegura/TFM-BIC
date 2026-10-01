import type { TimedLine, VideoTimeline } from "@tfm-bic/application";
import type { Stage, StageAction, VideoScene, VideoScript } from "@tfm-bic/domain";

import { characterMetrics, characterSvg } from "./characters.js";
import { environmentSvg, FLOOR_Y } from "./environments.js";
import { countedProp, propSvg } from "./props.js";

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
export const WIDTH = 1280;
export const HEIGHT = 720;
/** Bump when the template changes: part of every video's source hash. */
export const TEMPLATE_VERSION = 2;

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
const n = (v: number) => v.toFixed(3);
const q = JSON.stringify;

interface ActorState {
  x: number;
  dir: 1 | -1;
  scale: number;
  look: string;
}

/** Collects GSAP calls for one scene, with ids prefixed by the scene. */
class SceneTimeline {
  readonly js: string[] = [];
  constructor(readonly prefix: string) {}
  id(kind: "a" | "p", name: string) {
    return `${this.prefix}-${kind}-${name}`;
  }
  push(code: string) {
    this.js.push(code);
  }
  to(selector: string, vars: string, at: number) {
    this.js.push(`tl.to(${q(selector)},${vars},${n(at)});`);
  }
  set(selector: string, vars: string, at: number) {
    this.js.push(`tl.set(${q(selector)},${vars},${n(at)});`);
  }
}

const rot = (deg: number) => `attr:{transform:"rotate(${deg.toFixed(1)})"}`;

function actorTransform(st: ActorState) {
  return `translate(${st.x.toFixed(1)} ${String(FLOOR_Y)}) scale(${st.scale.toFixed(3)})`;
}

/** Where a prop or actor is, for pointing and handing. */
function targetPoint(
  stage: Stage,
  states: Map<string, ActorState>,
  id: string,
): { x: number; y: number } {
  const prop = stage.props.find((p) => p.id === id);
  if (prop) return { x: prop.x, y: prop.y - 40 * (prop.scale ?? 1) };
  const st = states.get(id);
  if (st) return { x: st.x, y: FLOOR_Y - characterMetrics(st.look).shoulder };
  throw new Error(`Unknown stage target "${id}".`);
}

/** Arm angle (local, arm hanging = 0, forward = -90) pointing from the shoulder towards a point. */
function armAngle(st: ActorState, target: { x: number; y: number }): number {
  const m = characterMetrics(st.look);
  const sx = st.x + 16 * st.scale * st.dir;
  const sy = FLOOR_Y - m.shoulder;
  const lx = (target.x - sx) * st.dir;
  const ly = target.y - sy;
  return (Math.atan2(-lx, ly) * 180) / Math.PI;
}

function handPoint(st: ActorState, angle: number): { x: number; y: number } {
  const m = characterMetrics(st.look);
  const r = (angle * Math.PI) / 180;
  const len = 94 * st.scale;
  return {
    x: st.x + 16 * st.scale * st.dir + -Math.sin(r) * len * st.dir,
    y: FLOOR_Y - m.shoulder + Math.cos(r) * len,
  };
}

/**
 * Emits the tweens for one action starting at `at`. `instant` applies the final state at `at`
 * (retrieval cues are frozen poses). Returns when the action ends.
 */
function emitAction(
  tl: SceneTimeline,
  stage: Stage,
  states: Map<string, ActorState>,
  action: StageAction,
  at: number,
  instant = false,
): number {
  const d = (v: number) => (instant ? 0 : v);
  const A = (name: string) => `#${tl.id("a", name)}`;
  const P = (name: string) => `#${tl.id("p", name)}`;
  const state = (actor: string) => {
    const st = states.get(actor);
    if (!st) throw new Error(`Action on actor "${actor}" who is not on stage.`);
    return st;
  };
  const face = (actor: string, st: ActorState, dir: 1 | -1) => {
    if (st.dir === dir) return;
    st.dir = dir;
    tl.set(`${A(actor)}-flip`, `{attr:{transform:"scale(${String(dir)} 1)"}}`, at);
  };
  const walkTo = (actor: string, x: number, start: number, speed = 210): number => {
    const st = state(actor);
    const dist = Math.abs(x - st.x);
    if (dist < 1) return start;
    face(actor, st, x > st.x ? 1 : -1);
    const dur = instant ? 0 : Math.max(0.6, dist / speed);
    st.x = x;
    tl.to(
      A(actor),
      `{attr:{transform:${q(actorTransform(st))}},duration:${n(dur)},ease:"none"}`,
      start,
    );
    if (!instant) {
      const steps = Math.max(1, Math.round(dur / 0.28));
      tl.to(
        `${A(actor)}-leg-f`,
        `{attr:{transform:"rotate(22)"},duration:0.14,yoyo:true,repeat:${String(steps * 2 - 1)},ease:"sine.inOut"}`,
        start,
      );
      tl.to(
        `${A(actor)}-leg-b`,
        `{attr:{transform:"rotate(-22)"},duration:0.14,yoyo:true,repeat:${String(steps * 2 - 1)},ease:"sine.inOut"}`,
        start,
      );
      tl.set(`${A(actor)}-leg-f`, `{attr:{transform:"rotate(0)"}}`, start + dur);
      tl.set(`${A(actor)}-leg-b`, `{attr:{transform:"rotate(0)"}}`, start + dur);
    }
    return start + dur;
  };

  switch (action.do) {
    case "enter":
      return walkTo(action.actor, action.to, at);
    case "walk":
      return walkTo(action.actor, action.to, at);
    case "exit": {
      const end = walkTo(action.actor, action.side === "left" ? -160 : WIDTH + 160, at);
      return end;
    }
    case "turn": {
      const st = state(action.actor);
      face(action.actor, st, action.facing === "right" ? 1 : -1);
      return at;
    }
    case "point": {
      const st = state(action.actor);
      const target = targetPoint(stage, states, action.at);
      face(action.actor, st, target.x >= st.x ? 1 : -1);
      const angle = Math.max(-150, Math.min(-35, armAngle(st, target)));
      tl.to(
        `${A(action.actor)}-arm-f`,
        `{${rot(angle)},duration:${n(d(0.45))},ease:"power2.out"}`,
        at,
      );
      // Keep pointing while the word is said (the line usually starts within ~1 s).
      if (!instant) tl.to(`${A(action.actor)}-arm-f`, `{${rot(0)},duration:0.45}`, at + 3.6);
      return at + d(0.45);
    }
    case "raise-hand":
      tl.to(`${A(action.actor)}-arm-f`, `{${rot(-160)},duration:${n(d(0.4))}}`, at);
      if (!instant) tl.to(`${A(action.actor)}-arm-f`, `{${rot(0)},duration:0.4}`, at + 1.8);
      return at + d(0.4);
    case "wave":
      tl.to(`${A(action.actor)}-arm-f`, `{${rot(-160)},duration:${n(d(0.3))}}`, at);
      if (!instant) {
        tl.to(
          `${A(action.actor)}-arm-f`,
          `{${rot(-135)},duration:0.18,yoyo:true,repeat:5}`,
          at + 0.3,
        );
        tl.to(`${A(action.actor)}-arm-f`, `{${rot(0)},duration:0.35}`, at + 1.45);
      }
      return at + d(1.8);
    case "nod":
      if (!instant)
        tl.to(`${A(action.actor)}-head`, `{${rot(9)},duration:0.16,yoyo:true,repeat:3}`, at);
      return at + d(0.7);
    case "shake-head":
      if (!instant) {
        tl.to(`${A(action.actor)}-head`, `{${rot(-8)},duration:0.13}`, at);
        tl.to(`${A(action.actor)}-head`, `{${rot(8)},duration:0.13,yoyo:true,repeat:3}`, at + 0.13);
        tl.to(`${A(action.actor)}-head`, `{${rot(0)},duration:0.13}`, at + 0.66);
      }
      return at + d(0.8);
    case "handshake": {
      for (const who of [action.actor, action.with]) {
        tl.to(`${A(who)}-arm-f`, `{${rot(-62)},duration:${n(d(0.35))}}`, at);
        if (!instant) {
          tl.to(`${A(who)}-arm-f`, `{${rot(-50)},duration:0.15,yoyo:true,repeat:3}`, at + 0.35);
          tl.to(`${A(who)}-arm-f`, `{${rot(0)},duration:0.4}`, at + 1.2);
        }
      }
      return at + d(1.6);
    }
    case "give": {
      const giver = state(action.actor);
      const taker = state(action.to);
      face(action.actor, giver, taker.x >= giver.x ? 1 : -1);
      face(action.to, taker, giver.x >= taker.x ? 1 : -1);
      const angle = -72;
      const from = handPoint(giver, angle);
      const to = handPoint(taker, angle);
      tl.to(`${A(action.actor)}-arm-f`, `{${rot(angle)},duration:${n(d(0.4))}}`, at);
      if (instant) {
        const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
        tl.set(`${A(action.actor)}-arm-f`, `{${rot(angle)}}`, at);
        tl.set(`${A(action.to)}-arm-f`, `{${rot(-40)}}`, at);
        tl.set(
          P(action.prop),
          `{opacity:1,attr:{transform:${q(`translate(${mid.x.toFixed(1)} ${(mid.y + 12).toFixed(1)})`)}}}`,
          at,
        );
        return at;
      }
      tl.set(
        P(action.prop),
        `{opacity:1,attr:{transform:${q(`translate(${from.x.toFixed(1)} ${(from.y + 12).toFixed(1)})`)}}}`,
        at,
      );
      tl.to(`${A(action.to)}-arm-f`, `{${rot(angle)},duration:${n(d(0.4))}}`, at + d(0.4));
      tl.to(
        P(action.prop),
        `{attr:{transform:${q(`translate(${to.x.toFixed(1)} ${(to.y + 12).toFixed(1)})`)}},duration:${n(d(0.8))},ease:"power1.inOut"}`,
        at + d(0.4),
      );
      if (!instant) tl.to(`${A(action.actor)}-arm-f`, `{${rot(0)},duration:0.45}`, at + 1.3);
      return at + d(1.2);
    }
    case "pick-up": {
      const st = state(action.actor);
      const angle = -55;
      const hand = handPoint(st, angle);
      tl.to(`${A(action.actor)}-arm-f`, `{${rot(angle)},duration:${n(d(0.4))}}`, at);
      tl.to(
        P(action.prop),
        `{attr:{transform:${q(`translate(${hand.x.toFixed(1)} ${(hand.y + 12).toFixed(1)})`)}},duration:${n(d(0.6))}}`,
        at + d(0.3),
      );
      return at + d(0.9);
    }
    case "show":
      tl.to(P(action.prop), `{opacity:1,duration:${n(d(0.4))}}`, at);
      return at + d(0.4);
    case "hide":
      tl.to(P(action.prop), `{opacity:0,duration:${n(d(0.3))}}`, at);
      return at + d(0.3);
    case "highlight": {
      const isProp = stage.props.some((p) => p.id === action.target);
      const ring = isProp ? `${P(action.target)}-hl` : `${A(action.target)}-hl`;
      tl.to(ring, `{opacity:1,duration:${n(d(0.35))}}`, at);
      if (!instant)
        tl.to(ring, `{attr:{rx:"+=10",ry:"+=6"},duration:0.4,yoyo:true,repeat:1}`, at + 0.35);
      return at + d(0.35);
    }
    case "sleep": {
      const isProp = stage.props.some((p) => p.id === action.actor);
      const root = isProp ? P(action.actor) : A(action.actor);
      tl.to(`${root} .eye`, `{attr:{ry:0.7},duration:${n(d(0.5))}}`, at);
      tl.to(`#${tl.prefix}-z-${action.actor}`, `{opacity:1,duration:${n(d(0.4))}}`, at);
      if (!instant)
        tl.to(
          `#${tl.prefix}-z-${action.actor}`,
          `{y:-24,duration:1.6,yoyo:true,repeat:3,ease:"sine.inOut"}`,
          at,
        );
      return at + d(0.5);
    }
  }
}

function stageMarkup(
  prefix: string,
  stage: Stage,
  script: VideoScript,
): { svg: string; states: Map<string, ActorState> } {
  const states = new Map<string, ActorState>();
  const BIG = new Set(["house", "house-small", "train", "plane"]);
  const propMarkup = (front: boolean) =>
    stage.props
      .filter((p) => BIG.has(p.type) !== front)
      .map((p) => {
        const scale = p.scale ?? 1;
        const inner = p.count ? countedProp(p.type, p.count) : propSvg(p.type);
        const big = BIG.has(p.type);
        return `<g id="${prefix}-p-${p.id}-wrap">
        <g id="${prefix}-p-${p.id}" transform="translate(${n(p.x)} ${n(p.y)}) scale(${n(scale)})" opacity="${p.hidden ? "0" : "1"}"><ellipse id="${prefix}-p-${p.id}-hl" cx="0" cy="${big ? "-110" : "-30"}" rx="${n((big ? 150 : 52) + (p.count ? p.count * 32 : 0))}" ry="${big ? "140" : "48"}" fill="#ff6b35" fill-opacity="0.18" stroke="#ff6b35" stroke-width="${n(5 / scale)}" opacity="0"/>${inner}</g>
        <g id="${prefix}-z-${p.id}" opacity="0" transform="translate(${n(p.x + 40 * scale)} ${n(p.y - 90 * scale)})">${propSvg("sleep-z")}</g></g>`;
      })
      .join("");
  const actors = stage.actors
    .map((a) => {
      const member = script.cast.find((c) => c.id === a.id);
      if (!member) throw new Error(`Actor "${a.id}" is not in the cast.`);
      const m = characterMetrics(member.look);
      const dir: 1 | -1 = a.facing === "right" ? 1 : -1;
      // Someone facing right walks in from the left, and vice versa.
      const x = a.offstage ? (a.facing === "right" ? -160 : WIDTH + 160) : a.x;
      const st: ActorState = { x, dir, scale: m.scale, look: member.look };
      states.set(a.id, st);
      return `<ellipse id="${prefix}-a-${a.id}-hl" cx="${n(a.x)}" cy="${n(FLOOR_Y - m.headTop / 2)}" rx="${n(80 * m.scale)}" ry="${n(m.headTop / 2 + 20)}" fill="#ff6b35" fill-opacity="0.12" stroke="#ff6b35" stroke-width="5" opacity="0"/>
        <g id="${prefix}-a-${a.id}" transform="${actorTransform(st)}"><g id="${prefix}-a-${a.id}-flip" transform="scale(${String(dir)} 1)">${characterSvg(`${prefix}-a-${a.id}`, member.look)}</g></g>
        <g id="${prefix}-z-${a.id}" opacity="0" transform="translate(${n(a.x + 40)} ${n(FLOOR_Y - m.headTop - 10)})">${propSvg("sleep-z")}</g>`;
    })
    .join("");
  const env = environmentSvg(
    stage.environment,
    stage.time ?? "day",
    stage.sign ? escapeHtml(stage.sign.toLocaleUpperCase(script.targetLanguage)) : undefined,
  );
  return {
    svg: `<svg class="stage" viewBox="0 0 ${String(WIDTH)} ${String(HEIGHT)}" width="${String(WIDTH)}" height="${String(HEIGHT)}">${env.back}${propMarkup(false)}${actors}${env.front}${propMarkup(true)}</svg>`,
    states,
  };
}

/** Mouth movement while a character speaks; deterministic blinks for everyone on stage. */
function liveliness(
  tl: SceneTimeline,
  states: Map<string, ActorState>,
  lines: TimedLine[],
  start: number,
  end: number,
) {
  for (const line of lines) {
    if (!line.speaker || !states.has(line.speaker)) continue;
    const mouth = `#${tl.id("a", line.speaker)}-mouth`;
    const reps = Math.max(1, Math.floor(line.duration / 0.13)) | 1;
    tl.to(
      mouth,
      `{attr:{ry:5.5},duration:0.13,yoyo:true,repeat:${String(reps)},ease:"sine.inOut"}`,
      line.start,
    );
    tl.set(mouth, `{attr:{ry:1.6}}`, line.start + line.duration + 0.02);
  }
  let k = 0;
  for (const name of states.keys()) {
    for (let t = start + 1.2 + k * 0.7; t < end - 0.4; t += 3.4) {
      tl.to(
        `#${tl.id("a", name)}-body .eye`,
        `{attr:{ry:0.5},duration:0.07,yoyo:true,repeat:1}`,
        t,
      );
    }
    k += 1;
  }
}

function cardPosition(states: Map<string, ActorState>, speaker: string | undefined) {
  const st = speaker ? states.get(speaker) : undefined;
  if (!st) return { left: WIDTH / 2, top: 120 };
  const head = characterMetrics(st.look).headTop;
  return {
    left: Math.min(WIDTH - 230, Math.max(230, st.x)),
    top: Math.max(96, FLOOR_Y - head - 150),
  };
}

function situationScene(
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
      const pos = cardPosition(states, line.speaker);
      cards.push(`<div class="phrase-card" id="${id}" style="left:${String(pos.left)}px;top:${String(pos.top)}px">
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

function retrievalScene(
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
  const pos = cardPosition(states, scene.answerBy);
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
  }
  if (check) tl.to(`#${prefix}-check`, `{opacity:1,duration:0.3}`, check.start - 0.05);
  liveliness(tl, states, lines, start, end);
  return `${svg}
    <div class="dim" id="${prefix}-dim"></div>
    <div class="prompt" id="${prefix}-prompt"><span class="tag">Your turn</span>${escapeHtml(prompt ? (scene.narration[0]?.text ?? "") : "")}</div>
    <svg class="timer" id="${prefix}-timer" viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" stroke="#e8dccb" stroke-width="6" fill="#fffaf2"/><circle id="${prefix}-ring" cx="30" cy="30" r="26" stroke="#ff6b35" stroke-width="6" fill="none" stroke-dasharray="163" transform="rotate(-90 30 30)"/></svg>
    <div class="phrase-card answer" id="${prefix}-answer" style="left:${String(pos.left)}px;top:${String(pos.top)}px"><span class="ok">✓</span><span class="said" lang="${escapeHtml(script.targetLanguage)}">${escapeHtml(scene.answer.text)}</span>${scene.answer.meaning ? `<span class="gloss" style="opacity:1">${escapeHtml(scene.answer.meaning)}</span>` : ""}</div>
    <div class="check" id="${prefix}-check">${escapeHtml(scene.narration[2]?.text ?? "")}</div>`;
}

function focusScene(
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
    ? `<div class="respell">Roughly: ${escapeHtml(scene.respelling).replace(/([A-ZĄĆĘŁŃÓŚŹŻ]{2,})/g, "<b>$1</b>")}</div>`
    : "";
  return `<div class="board">
    <p class="heading">${escapeHtml(scene.heading)}</p>
    <p class="focus-phrase" lang="${escapeHtml(script.targetLanguage)}">${shown}</p>
    ${scene.meaning ? `<p class="focus-meaning">${escapeHtml(scene.meaning)}</p>` : ""}
    ${respell}
    ${scene.panels ? `<div class="panels">${scene.panels.map((p, i) => `<div class="panel" id="${prefix}-panel-${String(i)}"><span class="cap">${escapeHtml(p.caption)}</span><span class="said" lang="${escapeHtml(script.targetLanguage)}">${escapeHtml(p.text)}</span></div>`).join("")}</div>` : ""}
  </div>`;
}

/** Simplified side view (facing left): lips, teeth, palate and a tongue shape per articulation. */
function mouthDiagram(articulation: "retroflex" | "alveolo-palatal" | "plain"): string {
  const tongue =
    articulation === "retroflex"
      ? "M70 150 Q90 120 118 104 Q132 96 128 84 Q122 78 112 86 Q100 100 96 118 Q120 140 190 150 Q230 170 240 210 L70 210 Z"
      : articulation === "alveolo-palatal"
        ? "M70 150 Q78 132 96 126 Q120 96 160 92 Q200 92 220 118 Q240 150 240 210 L70 210 Z"
        : "M70 150 Q90 136 130 132 Q190 128 220 150 Q240 170 240 210 L70 210 Z";
  return `<svg viewBox="0 0 260 220" class="mouth">
    <path d="M20 40 Q60 30 110 64 Q160 50 250 70 L250 0 L20 0 Z" fill="#f1c7a5"/>
    <path d="M40 66 Q120 50 150 64 Q200 60 250 86" stroke="#c98e6b" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M54 66 v14 M62 66 v12" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
    <path d="M54 186 v-16 M62 186 v-14" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
    <path d="M10 92 Q30 84 44 90 M10 166 Q30 174 44 168" stroke="#c0563b" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="${tongue}" fill="#e57a7a" stroke="#b5515a" stroke-width="3"/>
    ${articulation === "alveolo-palatal" ? `<path d="M150 70 q10 18 18 22" stroke="#ff6b35" stroke-width="3" fill="none"/>` : ""}
    ${articulation === "retroflex" ? `<path d="M140 70 q-10 6 -14 18" stroke="#ff6b35" stroke-width="3" fill="none"/>` : ""}
  </svg>`;
}

function contrastScene(
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
      `{borderColor:"rgb(255,107,53)",duration:0.2}`,
      line.start,
    );
    tl.to(
      `#${prefix}-col-${String(i)}`,
      `{borderColor:"rgba(29,42,63,0.15)",duration:0.3}`,
      line.start + line.duration + 0.3,
    );
  });
  return `<div class="board"><p class="heading">${escapeHtml(scene.heading)}</p><div class="contrast">${scene.items
    .map(
      (item, i) => `<div class="col" id="${prefix}-col-${String(i)}" style="opacity:0.25">
        <p class="spell" lang="${escapeHtml(script.targetLanguage)}">${escapeHtml(item.spelling)}</p>
        ${mouthDiagram(item.articulation)}
        <p class="word" lang="${escapeHtml(script.targetLanguage)}">${escapeHtml(item.word)}</p>
        <p class="gloss">${escapeHtml(item.meaning)} · /${escapeHtml(item.ipa)}/</p></div>`,
    )
    .join(
      "",
    )}</div><p class="note-small">Simplified side view of the mouth — a guide for listening, not a measurement.</p></div>`;
}

const STYLE = `
@font-face{font-family:"Bricolage";src:url("fonts/latin-ext.woff2") format("woff2");font-weight:200 800;unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}
@font-face{font-family:"Bricolage";src:url("fonts/latin.woff2") format("woff2");font-weight:200 800;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
*{box-sizing:border-box;margin:0}
body{margin:0;background:#f8f9fa}
#root{position:relative;width:1280px;height:720px;overflow:hidden;font-family:"Bricolage",system-ui,sans-serif;color:#1d2a3f;background:#f8f9fa}
.clip.scene{position:absolute;inset:0}
.stage{position:absolute;inset:0}
#level{position:absolute;left:28px;top:24px;z-index:20;font-weight:800;font-size:22px;letter-spacing:0.04em;background:#fffaf2;border:3px solid #1d2a3f;border-radius:12px;padding:4px 12px}
#progress{position:absolute;left:0;bottom:0;height:6px;width:1280px;background:#ff6b35;transform-origin:0 50%;z-index:20}
.overlay-title{position:absolute;left:100px;top:26px;font-size:24px;font-weight:700;background:rgba(255,250,242,0.92);border-radius:10px;padding:5px 14px;opacity:0}
.phrase-card{position:absolute;transform:translateX(-50%);min-width:180px;max-width:440px;background:#fffaf2;border:3px solid #1d2a3f;border-radius:18px;padding:12px 22px;text-align:center;opacity:0;box-shadow:0 8px 0 rgba(29,42,63,0.12)}
.phrase-card::after{content:"";position:absolute;left:50%;bottom:-14px;margin-left:-12px;border:12px solid transparent;border-top-color:#1d2a3f;border-bottom:0}
.phrase-card .said{display:block;font-size:40px;font-weight:800;line-height:1.1}
.phrase-card .gloss{display:block;margin-top:4px;font-size:22px;color:rgba(29,42,63,0.72);opacity:0}
.phrase-card.answer{border-color:#1f7a4d}
.phrase-card .ok{position:absolute;left:-18px;top:-18px;width:36px;height:36px;border-radius:50%;background:#1f7a4d;color:#fff;font-size:22px;line-height:36px;text-align:center}
.dim{position:absolute;inset:0;background:rgba(255,250,242,0.35)}
.prompt{position:absolute;left:50%;top:64px;transform:translateX(-50%);background:#1d2a3f;color:#fffaf2;font-size:30px;font-weight:700;border-radius:16px;padding:14px 26px;opacity:0;width:max-content;max-width:1000px;text-align:center}
.prompt .tag{display:block;font-size:16px;letter-spacing:0.12em;text-transform:uppercase;color:#ffb38f;margin-bottom:4px}
.timer{position:absolute;left:50%;top:236px;margin-left:-30px;width:60px;height:60px;opacity:0}
.check{position:absolute;left:50%;bottom:46px;transform:translateX(-50%);font-size:26px;font-weight:600;background:rgba(255,250,242,0.95);border-radius:12px;padding:8px 18px;opacity:0;white-space:nowrap}
.board{position:absolute;inset:0;padding:120px 120px 60px;background:#fbf8f2 repeating-linear-gradient(180deg,transparent 0 47px,rgba(29,42,63,0.06) 47px 48px);display:flex;flex-direction:column;justify-content:center;gap:16px}
.board::before{content:"";position:absolute;left:92px;top:0;bottom:0;width:3px;background:#ff6b35}
.heading{font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#b84010}
.focus-phrase{font-size:110px;font-weight:800;line-height:1;letter-spacing:-0.02em}
.focus-phrase mark{background:linear-gradient(transparent 60%,rgba(255,107,53,0.55) 60%) no-repeat;background-size:0% 40%;background-position:0 100%;color:inherit}
.focus-meaning{font-size:40px;color:rgba(29,42,63,0.8);opacity:0}
.respell{font-size:34px;opacity:0}.respell b{color:#b84010}
.panels{display:flex;gap:18px;margin-top:10px}
.panel{background:#fffaf2;border:2px solid rgba(29,42,63,0.18);border-radius:16px;padding:14px 20px;opacity:0;transform:translateY(12px)}
.panel .cap{display:block;font-size:18px;color:rgba(29,42,63,0.65)}.panel .said{font-size:34px;font-weight:800}
.contrast{display:flex;gap:40px}
.col{flex:1;border:3px solid rgba(29,42,63,0.15);border-radius:20px;padding:16px 24px;background:#fffaf2;text-align:center}
.col .spell{font-size:72px;font-weight:800;line-height:1}.col .mouth{width:220px;height:186px}
.col .word{font-size:40px;font-weight:800}.col .gloss{font-size:22px;color:rgba(29,42,63,0.72)}
.note-small{font-size:18px;color:rgba(29,42,63,0.6)}
.body{font-size:40px;line-height:1.3;max-width:900px}
.arrow{width:180px;height:60px;fill:none;stroke:#ff6b35;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
`;

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

  script.scenes.forEach((scene, index) => {
    const timed = timeline.scenes[index];
    if (!timed) throw new Error("Timeline does not match the script.");
    const prefix = `s${String(index)}`;
    const lines = timeline.lines.filter((l) => l.sceneIndex === index);
    const tl = new SceneTimeline(prefix);
    const start = timed.start;
    const end = timed.start + timed.duration;
    let html = "";
    switch (scene.kind) {
      case "situation":
        html = situationScene(scene, prefix, lines, start, end, script, tl);
        break;
      case "retrieval":
        html = retrievalScene(scene, prefix, lines, start, end, script, tl);
        break;
      case "focus":
        html = focusScene(scene, prefix, lines, start, script, tl);
        break;
      case "contrast":
        html = contrastScene(scene, prefix, lines, script, tl);
        break;
      case "next-step":
        tl.push(
          `tl.fromTo("#${prefix} .heading-big",{opacity:0,y:16},{opacity:1,y:0,duration:0.4},${n(start + 0.2)});`,
        );
        tl.push(
          `tl.fromTo("#${prefix} .arrow",{x:-12,opacity:0},{x:0,opacity:1,duration:0.5},${n(start + 0.6)});`,
        );
        html = `<div class="board"><p class="focus-phrase heading-big" style="font-size:64px">${escapeHtml(scene.heading)}</p><p class="body">${escapeHtml(scene.body)}</p><svg class="arrow" viewBox="0 0 120 40"><path d="M4 20 H108 M90 6 L110 20 L90 34"/></svg></div>`;
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
