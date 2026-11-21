import type { Stage, StageAction } from "@verbysia/domain";

import { characterMetrics } from "./characters.js";
import { FLOOR_Y } from "./environments.js";
import { n, q, WIDTH } from "./markup.js";

export interface ActorState {
  x: number;
  dir: 1 | -1;
  scale: number;
  look: string;
}

/** Collects GSAP calls for one scene, with ids prefixed by the scene. */
export class SceneTimeline {
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

export function actorTransform(st: ActorState) {
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
export function emitAction(
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
        // The inner group floats; the outer one keeps its position transform.
        tl.to(
          `#${tl.prefix}-z-${action.actor} .zz`,
          `{y:-24,duration:1.6,yoyo:true,repeat:3,ease:"sine.inOut"}`,
          at,
        );
      return at + d(0.5);
    }
  }
}
