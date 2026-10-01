/**
 * Illustrated characters for educational videos (M22, ADR-032). Simplified, recognisable people —
 * never emoji or icons — built as SVG with joints the timeline can move: legs and arms rotate about
 * hip and shoulder, the head about the neck; eyes blink; the mouth opens only while that character
 * speaks. Drawn in a 3/4 view facing right, feet at (0, 0); the stage flips and scales them.
 *
 * Every joint is a <g> whose own `transform` is `rotate(angle)` around its local origin, so motion is
 * a plain attribute tween (verified with GSAP 3.14.2 attr tweening under timeline seeking).
 */

export interface Look {
  skin: string;
  hair: string;
  hairStyle: "short" | "long" | "bun" | "curly" | "bob" | "none";
  top: string;
  bottom: string;
  shoes: string;
  /** Dress instead of trousers. */
  dress?: boolean;
  apron?: string;
  glasses?: boolean;
  beard?: boolean;
  /** 1 = adult (≈ 300 px tall at stage scale 1); children ≈ 0.72. */
  height: number;
}

/** Look presets referenced by name from video plans (`cast[].look`). */
export const LOOKS: Record<string, Look> = {
  "woman-a": {
    skin: "#f1c7a5",
    hair: "#5b3a29",
    hairStyle: "long",
    top: "#2f6f8f",
    bottom: "#24324a",
    shoes: "#3b2a22",
    height: 0.97,
  },
  "woman-b": {
    skin: "#c98e6b",
    hair: "#1f1a17",
    hairStyle: "bun",
    top: "#c0563b",
    bottom: "#3a3f58",
    shoes: "#2a2320",
    height: 0.95,
    glasses: true,
  },
  "woman-c": {
    skin: "#e8b48f",
    hair: "#c58a3a",
    hairStyle: "bob",
    top: "#6a8f4e",
    bottom: "#4b3b5c",
    shoes: "#2e2a26",
    dress: true,
    height: 0.96,
  },
  "woman-d": {
    skin: "#8d5a3c",
    hair: "#191412",
    hairStyle: "curly",
    top: "#e2a33b",
    bottom: "#2a3550",
    shoes: "#2a2320",
    height: 0.98,
  },
  "man-a": {
    skin: "#efc09e",
    hair: "#3b2a1f",
    hairStyle: "short",
    top: "#3d5a80",
    bottom: "#2b2f3a",
    shoes: "#2a2320",
    height: 1.02,
  },
  "man-b": {
    skin: "#b97d58",
    hair: "#14110f",
    hairStyle: "short",
    top: "#7a4e8a",
    bottom: "#33363f",
    shoes: "#2a2320",
    height: 1.04,
    beard: true,
  },
  "man-c": {
    skin: "#f3cfb1",
    hair: "#8a8a8a",
    hairStyle: "short",
    top: "#55606e",
    bottom: "#2b2f3a",
    shoes: "#2a2320",
    height: 1.0,
    glasses: true,
  },
  barista: {
    skin: "#d9a07b",
    hair: "#2a1f1a",
    hairStyle: "short",
    top: "#f2efe9",
    bottom: "#2b2f3a",
    shoes: "#2a2320",
    apron: "#3d5a80",
    height: 1.02,
  },
  shopkeeper: {
    skin: "#f0c3a0",
    hair: "#7a4b2a",
    hairStyle: "bun",
    top: "#e9e4dc",
    bottom: "#3a3f58",
    shoes: "#2a2320",
    apron: "#6a8f4e",
    height: 0.96,
  },
  "girl-a": {
    skin: "#f1c7a5",
    hair: "#c58a3a",
    hairStyle: "long",
    top: "#e57a5a",
    bottom: "#4b6fa5",
    shoes: "#3b2a22",
    dress: true,
    height: 0.7,
  },
  "boy-a": {
    skin: "#e3ab86",
    hair: "#4a3020",
    hairStyle: "short",
    top: "#4f9a7a",
    bottom: "#33415c",
    shoes: "#2a2320",
    height: 0.72,
  },
};

const INK = "#1d2a3f";

function hairShape(style: Look["hairStyle"], color: string): { back: string; front: string } {
  switch (style) {
    case "long":
      return {
        back: `<path d="M-36 -292 Q-40 -242 -30 -206 L28 -206 Q40 -250 32 -292 Q0 -322 -36 -292 Z" fill="${color}"/>`,
        front: `<path d="M-34 -286 Q-30 -318 2 -316 Q34 -314 36 -282 Q14 -300 -6 -296 Q-22 -294 -34 -286 Z" fill="${color}"/>`,
      };
    case "bun":
      return {
        back: `<circle cx="-22" cy="-312" r="15" fill="${color}"/>`,
        front: `<path d="M-35 -280 Q-34 -318 2 -317 Q36 -316 36 -284 Q20 -298 0 -298 Q-20 -296 -35 -280 Z" fill="${color}"/>`,
      };
    case "bob":
      return {
        back: `<path d="M-38 -292 Q-42 -258 -34 -244 L30 -244 Q40 -262 34 -292 Q0 -320 -38 -292 Z" fill="${color}"/>`,
        front: `<path d="M-36 -282 Q-32 -318 2 -317 Q36 -315 37 -280 Q20 -292 4 -294 Q-18 -294 -36 -282 Z" fill="${color}"/>`,
      };
    case "curly":
      return {
        back: `<path d="M-40 -280 Q-48 -318 -14 -326 Q8 -338 30 -322 Q50 -306 40 -276 Q44 -250 30 -240 L-30 -240 Q-46 -254 -40 -280 Z" fill="${color}"/>`,
        front: `<path d="M-34 -282 Q-36 -312 -10 -316 Q4 -326 22 -316 Q40 -306 36 -282 Q20 -296 0 -294 Q-18 -294 -34 -282 Z" fill="${color}"/>`,
      };
    case "short":
      return {
        back: "",
        front: `<path d="M-35 -276 Q-36 -314 0 -316 Q34 -316 36 -284 Q32 -296 14 -298 Q-10 -300 -24 -290 Q-30 -284 -35 -276 Z" fill="${color}"/>`,
      };
    case "none":
      return { back: "", front: "" };
  }
}

/**
 * One character's SVG, ids prefixed with `id`. Joint groups: `${id}-leg-f`, `${id}-leg-b`,
 * `${id}-arm-f`, `${id}-arm-b`, `${id}-head`; animatable shapes: `${id}-mouth`, `${id}-eye`.
 */
export function characterSvg(id: string, lookKey: string): string {
  const look = LOOKS[lookKey];
  if (!look) throw new Error(`Unknown character look "${lookKey}".`);
  const hair = hairShape(look.hairStyle, look.hair);
  const leg = (cls: string) => `
    <g id="${id}-${cls}" transform="rotate(0)">
      <rect x="-9" y="0" width="18" height="${look.dress ? 120 : 126}" rx="8" fill="${look.dress ? look.skin : look.bottom}"/>
      <path d="M-11 ${look.dress ? 116 : 120} h30 a8 8 0 0 1 0 14 h-30 z" fill="${look.shoes}"/>
    </g>`;
  const arm = (cls: string, sleeve: string) => `
    <g id="${id}-${cls}" transform="rotate(0)">
      <rect x="-9" y="-4" width="18" height="58" rx="9" fill="${sleeve}"/>
      <rect x="-7" y="44" width="14" height="46" rx="7" fill="${look.skin}"/>
      <circle cx="0" cy="94" r="9" fill="${look.skin}"/>
    </g>`;
  const torso = look.dress
    ? `<path d="M-34 -236 Q0 -246 34 -236 L46 -112 Q0 -100 -46 -112 Z" fill="${look.top}"/>`
    : `<path d="M-33 -236 Q0 -246 33 -236 L36 -128 Q0 -120 -36 -128 Z" fill="${look.top}"/>
       <path d="M-36 -130 Q0 -122 36 -130 L36 -112 L-36 -112 Z" fill="${look.bottom}"/>`;
  const apron = look.apron
    ? `<path d="M-24 -206 L24 -206 L30 -112 L-30 -112 Z" fill="${look.apron}"/><path d="M-24 -206 Q0 -236 24 -206" stroke="${look.apron}" stroke-width="4" fill="none"/>`
    : "";
  const legsLen = look.dress ? 120 : 126;
  return `
  <g class="character" id="${id}-body">
    <g transform="translate(0 ${String(-legsLen - 8)})">
      <g transform="translate(-10 0)">${leg("leg-b")}</g>
      <g transform="translate(12 0)">${leg("leg-f")}</g>
    </g>
    <g transform="translate(-18 -226)">${arm("arm-b", shade(look.top))}</g>
    ${torso}
    ${apron}
    <g transform="translate(0 -240)"><g id="${id}-head" transform="rotate(0)"><g transform="translate(0 240)">
      ${hair.back}
      <rect x="-8" y="-252" width="16" height="16" rx="4" fill="${look.skin}"/>
      <circle cx="0" cy="-276" r="35" fill="${look.skin}"/>
      <ellipse cx="-30" cy="-274" rx="6" ry="9" fill="${look.skin}"/>
      ${hair.front}
      ${look.beard ? `<path d="M-14 -262 Q8 -232 34 -258 Q30 -244 14 -238 Q-6 -238 -14 -262 Z" fill="${look.hair}"/>` : ""}
      <path d="M2 -292 q7 -4 13 0 M22 -292 q6 -3 11 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <ellipse class="eye" id="${id}-eye1" cx="9" cy="-280" rx="3.4" ry="4.2" fill="${INK}"/>
      <ellipse class="eye" id="${id}-eye2" cx="27" cy="-280" rx="3.2" ry="4" fill="${INK}"/>
      ${look.glasses ? `<g stroke="${INK}" stroke-width="2" fill="none"><circle cx="9" cy="-280" r="8"/><circle cx="27" cy="-280" r="7.5"/><path d="M17 -281 h2 M1 -282 l-14 -3"/></g>` : ""}
      <path d="M20 -272 q3 6 -2 7" stroke="${shade(look.skin)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <circle cx="4" cy="-264" r="5" fill="#e98b7a" opacity="0.35"/>
      <ellipse id="${id}-mouth" cx="19" cy="-257" rx="6" ry="1.6" fill="#7a2f2f"/>
    </g></g></g>
    <g transform="translate(16 -226)">${arm("arm-f", look.top)}</g>
  </g>`;
}

/** A slightly darker shade for depth (back sleeve, nose line). */
function shade(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.round(v * 0.82));
  const r = f(n >> 16),
    g = f((n >> 8) & 255),
    b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Heights used for placing cards and computing hand positions (stage units, before scale). */
export function characterMetrics(lookKey: string) {
  const look = LOOKS[lookKey];
  if (!look) throw new Error(`Unknown character look "${lookKey}".`);
  // Characters are drawn ~12% larger than the 300 px design size so faces and gestures read at 720p.
  const scale = look.height * 1.12;
  return { scale, headTop: 320 * scale, shoulder: 226 * scale, handReach: 95 * scale };
}
