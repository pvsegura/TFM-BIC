import type { TimedLine } from "@verbysia/application";
import type { Stage, VideoScript } from "@verbysia/domain";

import { actorTransform, type ActorState, type SceneTimeline } from "./actions.js";
import { MOUTH, characterMetrics, characterSvg } from "./characters.js";
import { environmentSvg, FLOOR_Y } from "./environments.js";
import { escapeHtml, HEIGHT, n, scopeIds, WIDTH } from "./markup.js";
import { countedProp, propSvg } from "./props.js";

export function stageMarkup(
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
        <g id="${prefix}-p-${p.id}" transform="translate(${n(p.x)} ${n(p.y)}) scale(${n(scale)})" opacity="${p.hidden ? "0" : "1"}"><ellipse id="${prefix}-p-${p.id}-hl" cx="0" cy="${big ? "-110" : "-30"}" rx="${n((big ? 150 : 52) + (p.count ? p.count * 32 : 0))}" ry="${big ? "140" : "48"}" fill="#e2559b" fill-opacity="0.16" stroke="#e2559b" stroke-width="${n(5 / scale)}" opacity="0"/>${inner}</g>
        <g id="${prefix}-z-${p.id}" opacity="0" transform="translate(${n(p.x + 40 * scale)} ${n(p.y - 90 * scale)})"><g class="zz">${propSvg("sleep-z")}</g></g></g>`;
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
      return `<ellipse id="${prefix}-a-${a.id}-hl" cx="${n(a.x)}" cy="${n(FLOOR_Y - m.headTop / 2)}" rx="${n(80 * m.scale)}" ry="${n(m.headTop / 2 + 20)}" fill="#e2559b" fill-opacity="0.12" stroke="#e2559b" stroke-width="5" opacity="0"/>
        <g id="${prefix}-a-${a.id}" transform="${actorTransform(st)}"><g id="${prefix}-a-${a.id}-flip" transform="scale(${String(dir)} 1)">${characterSvg(`${prefix}-a-${a.id}`, member.look)}</g></g>
        <g id="${prefix}-z-${a.id}" opacity="0" transform="translate(${n(a.x + 40)} ${n(FLOOR_Y - m.headTop - 10)})"><g class="zz">${propSvg("sleep-z")}</g></g>`;
    })
    .join("");
  const env = environmentSvg(
    stage.environment,
    stage.time ?? "day",
    stage.sign ? escapeHtml(stage.sign.toLocaleUpperCase(script.targetLanguage)) : undefined,
  );
  return {
    svg: `<svg class="stage" viewBox="0 0 ${String(WIDTH)} ${String(HEIGHT)}" width="${String(WIDTH)}" height="${String(HEIGHT)}">${scopeIds(env.back, prefix)}${propMarkup(false)}${actors}${scopeIds(env.front, prefix)}${propMarkup(true)}</svg>`,
    states,
  };
}

/** Mouth movement while a character speaks; deterministic blinks for everyone on stage. */
export function liveliness(
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
      `{attr:{ry:${String(MOUTH.open)}},duration:0.13,yoyo:true,repeat:${String(reps)},ease:"sine.inOut"}`,
      line.start,
    );
    tl.set(mouth, `{attr:{ry:${String(MOUTH.rest)}}}`, line.start + line.duration + 0.02);
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
