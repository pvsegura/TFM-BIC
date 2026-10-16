/**
 * Illustrated characters for educational videos (M22, ADR-032; restyled in template 4). Slim,
 * recognisable people in a soft cartoon-illustration style — shaded clothes, rim light, faces with
 * brows, eye whites and a nose — never emoji or icons. Built as SVG with joints the timeline can
 * move: legs and arms rotate about hip and shoulder, the head about the neck; eyes blink; the mouth
 * opens only while that character speaks. Drawn in a 3/4 view facing right, feet at (0, 0); the
 * stage flips and scales them.
 *
 * Every joint is a <g> whose own `transform` is `rotate(angle)` around its local origin, so motion is
 * a plain attribute tween (verified with GSAP 3.14.2 attr tweening under timeline seeking). Each eye
 * is clipped by an ellipse with class `eye`: tweening that ellipse's `ry` closes the whole eye.
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
  /** Short sleeves show the forearm; long sleeves (the default) cover it. */
  shortSleeves?: boolean;
  /** An open jacket over the top, in this colour. */
  jacket?: string;
  /** 1 = adult (≈ 300 px tall at stage scale 1); children ≈ 0.72. */
  height: number;
}

/** Look presets referenced by name from video plans (`cast[].look`). */
export const LOOKS: Record<string, Look> = {
  "woman-a": {
    skin: "#f3c9aa",
    hair: "#6b3b24",
    hairStyle: "long",
    top: "#f4e9e1",
    jacket: "#5b4bb7",
    bottom: "#2c2f5e",
    shoes: "#2b2140",
    height: 0.97,
  },
  "woman-b": {
    skin: "#c98e6b",
    hair: "#24191a",
    hairStyle: "bun",
    top: "#d8455d",
    bottom: "#3b3566",
    shoes: "#2a2320",
    height: 0.95,
    glasses: true,
  },
  "woman-c": {
    skin: "#efbd98",
    hair: "#d0742f",
    hairStyle: "bob",
    top: "#f0a53b",
    bottom: "#6b3fa0",
    shoes: "#3a2a4a",
    dress: true,
    height: 0.96,
  },
  "woman-d": {
    skin: "#8d5a3c",
    hair: "#1d1513",
    hairStyle: "curly",
    top: "#c6e05a",
    bottom: "#7a2c55",
    shoes: "#2a2320",
    height: 0.98,
  },
  "man-a": {
    skin: "#f0c09c",
    hair: "#4a2c1d",
    hairStyle: "short",
    top: "#7d8ee8",
    bottom: "#2f4a8a",
    shoes: "#f2f0f5",
    height: 1.02,
  },
  "man-b": {
    skin: "#b97d58",
    hair: "#17110f",
    hairStyle: "short",
    top: "#2b2a3a",
    bottom: "#5a5f9e",
    shoes: "#1c1a24",
    height: 1.04,
    beard: true,
  },
  "man-c": {
    skin: "#f3cfb1",
    hair: "#8a8584",
    hairStyle: "short",
    top: "#e7e2f2",
    jacket: "#3a3f6e",
    bottom: "#d79a3c",
    shoes: "#8a2f3a",
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
    apron: "#5b4bb7",
    shortSleeves: true,
    height: 1.02,
  },
  shopkeeper: {
    skin: "#f0c3a0",
    hair: "#7a4b2a",
    hairStyle: "bun",
    top: "#f4eee6",
    bottom: "#3a3f58",
    shoes: "#2a2320",
    apron: "#e0703d",
    height: 0.96,
  },
  "girl-a": {
    skin: "#f1c7a5",
    hair: "#c9772f",
    hairStyle: "long",
    top: "#ef6f7a",
    bottom: "#4b6fa5",
    shoes: "#4b2a5a",
    dress: true,
    shortSleeves: true,
    height: 0.7,
  },
  "boy-a": {
    skin: "#e3ab86",
    hair: "#4a3020",
    hairStyle: "short",
    top: "#3fb3a0",
    bottom: "#33415c",
    shoes: "#f2f0f5",
    shortSleeves: true,
    height: 0.72,
  },
};

const INK = "#2a1d3d";

/** Mix a colour towards black (f < 1) — shadows, back sleeves, folds. */
function shade(hex: string, f = 0.8): string {
  return mix(hex, 0x000000, 1 - f);
}

/** Mix a colour towards white — highlights. */
function tint(hex: string, f = 0.3): string {
  return mix(hex, 0xffffff, f);
}

function mix(hex: string, other: number, f: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const a = (n >> shift) & 255;
    const b = (other >> shift) & 255;
    return Math.max(0, Math.min(255, Math.round(a + (b - a) * f)));
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/** Hair behind the head (drawn first) and over it (drawn after the face). Head centre ≈ (3, -281). */
function hairShape(style: Look["hairStyle"], color: string): { back: string; front: string } {
  const hl = tint(color, 0.22);
  const dk = shade(color, 0.75);
  switch (style) {
    case "long":
      return {
        back: `<path d="M-22 -296 Q-32 -262 -28 -214 Q-14 -206 4 -212 Q10 -236 12 -262 Z" fill="${dk}"/>
          <path d="M-24 -298 Q-30 -268 -24 -222 Q-12 -216 -2 -222 Q-2 -250 2 -272 Z" fill="${color}"/>`,
        front: `<path d="M-23 -284 Q-28 -312 0 -315 Q26 -316 30 -290 Q24 -300 12 -301 Q16 -294 14 -288 Q4 -300 -8 -296 Q-16 -292 -18 -278 Q-22 -270 -21 -258 Q-27 -268 -23 -284 Z" fill="${color}"/>
          <path d="M-12 -306 Q4 -312 18 -306" stroke="${hl}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      };
    case "bun":
      return {
        back: `<circle cx="-14" cy="-310" r="11" fill="${color}"/><path d="M-20 -316 q6 -6 12 -2" stroke="${hl}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
        front: `<path d="M-22 -280 Q-26 -312 2 -313 Q28 -313 29 -290 Q18 -302 4 -300 Q-10 -298 -16 -286 Q-19 -280 -22 -280 Z" fill="${color}"/>
          <path d="M-10 -306 Q4 -310 16 -305" stroke="${hl}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      };
    case "bob":
      return {
        back: `<path d="M-26 -292 Q-30 -260 -24 -250 Q-10 -246 0 -250 L6 -290 Z" fill="${dk}"/>`,
        front: `<path d="M-24 -282 Q-26 -314 2 -315 Q28 -315 31 -290 Q32 -276 28 -268 Q22 -288 8 -298 Q-2 -294 -14 -290 Q-14 -272 -12 -254 Q-22 -250 -27 -256 Q-28 -270 -24 -282 Z" fill="${color}"/>
          <path d="M-14 -306 Q2 -312 18 -306" stroke="${hl}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      };
    case "curly":
      return {
        back: `<g fill="${dk}"><circle cx="-20" cy="-276" r="12"/><circle cx="-18" cy="-258" r="10"/><circle cx="-6" cy="-252" r="8"/></g>`,
        front: `<g fill="${color}"><circle cx="-16" cy="-298" r="12"/><circle cx="-2" cy="-308" r="12"/><circle cx="14" cy="-308" r="11"/><circle cx="26" cy="-298" r="9"/><circle cx="-22" cy="-282" r="10"/><circle cx="-16" cy="-268" r="8"/></g>
          <g fill="${hl}" opacity="0.6"><circle cx="-4" cy="-314" r="3"/><circle cx="12" cy="-314" r="2.6"/></g>`,
      };
    case "short":
      return {
        back: "",
        front: `<path d="M-22 -270 Q-28 -304 -6 -313 Q14 -320 28 -306 Q34 -298 30 -290 Q20 -296 8 -296 Q-6 -296 -12 -286 Q-15 -276 -14 -268 Q-18 -264 -22 -270 Z" fill="${color}"/>
          <path d="M-12 -308 Q6 -316 22 -306" stroke="${hl}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      };
    case "none":
      return { back: "", front: "" };
  }
}

/**
 * One character's SVG, ids prefixed with `id`. Joint groups: `${id}-leg-f`, `${id}-leg-b`,
 * `${id}-arm-f`, `${id}-arm-b`, `${id}-head`; animatable shapes: `${id}-mouth`, `.eye`.
 */
export function characterSvg(id: string, lookKey: string): string {
  const look = LOOKS[lookKey];
  if (!look) throw new Error(`Unknown character look "${lookKey}".`);
  const hair = hairShape(look.hairStyle, look.hair);
  const skinDk = shade(look.skin, 0.84);
  const legsLen = look.dress ? 120 : 126;

  const leg = (cls: string, back: boolean) => {
    const fill = look.dress ? look.skin : look.bottom;
    const legFill = back ? shade(fill, 0.86) : fill;
    const shoe = back ? shade(look.shoes, 0.88) : look.shoes;
    const w = look.dress ? 6.5 : 10;
    return `
    <g id="${id}-${cls}" transform="rotate(0)">
      <path d="M${String(-w)} 0 L${String(w)} 0 L${String(w - 2)} ${String(legsLen - 6)} L${String(-w + 2)} ${String(legsLen - 6)} Z" fill="${legFill}"/>
      ${look.dress ? "" : `<path d="M${String(w - 3)} 6 L${String(w - 4)} ${String(legsLen - 8)}" stroke="${shade(fill, 0.78)}" stroke-width="3" opacity="0.6"/>`}
      <path d="M-8 ${String(legsLen - 8)} L8 ${String(legsLen - 8)} Q22 ${String(legsLen - 6)} 24 ${String(legsLen + 2)} L24 ${String(legsLen + 6)} L-9 ${String(legsLen + 6)} Z" fill="${shoe}"/>
      <rect x="-9" y="${String(legsLen + 5)}" width="34" height="3.5" rx="1.5" fill="${look.shoes === "#f2f0f5" ? "#c9c3d8" : "#f1edf7"}" opacity="0.9"/>
    </g>`;
  };

  const arm = (cls: string, back: boolean) => {
    const sleeve = look.jacket ?? look.top;
    const sl = back ? shade(sleeve, 0.8) : sleeve;
    const skin = back ? skinDk : look.skin;
    const forearm = look.shortSleeves ? skin : sl;
    return `
    <g id="${id}-${cls}" transform="rotate(0)">
      <rect x="-8.5" y="-6" width="17" height="${look.shortSleeves ? "30" : "52"}" rx="8.5" fill="${sl}" stroke="${shade(sl, 0.72)}" stroke-width="1.4"/>
      ${look.shortSleeves ? `<rect x="-6" y="18" width="12" height="34" rx="6" fill="${skin}"/>` : ""}
      <rect x="-7" y="40" width="14" height="44" rx="7" fill="${forearm}" stroke="${shade(forearm, 0.72)}" stroke-width="1.4"/>
      ${look.shortSleeves ? "" : `<rect x="-6.8" y="78" width="13.6" height="6" rx="3" fill="${shade(sl, 0.85)}"/>`}
      <ellipse cx="1" cy="91" rx="6.6" ry="8.4" fill="${skin}"/>
      <ellipse cx="6" cy="86" rx="2.6" ry="5" fill="${skin}" transform="rotate(-20 6 86)"/>
      ${back ? "" : `<path d="M5 -2 Q7 24 6 48" stroke="#ffffff" stroke-width="2.4" opacity="0.28" fill="none" stroke-linecap="round"/>`}
    </g>`;
  };

  const torso = look.dress
    ? `<path d="M-23 -234 Q0 -242 22 -234 L23 -186 Q22 -164 20 -150 L34 -112 Q0 -104 -36 -112 L-22 -150 Q-24 -170 -23 -186 Z" fill="${look.top}"/>
       <path d="M-23 -234 Q-14 -238 -8 -236 L-10 -150 L-24 -112 Q-30 -111 -36 -112 L-22 -150 Q-24 -170 -23 -186 Z" fill="#000" opacity="0.14"/>
       <path d="M-20 -150 Q0 -144 20 -150" stroke="${shade(look.top, 0.75)}" stroke-width="3" fill="none"/>
       <path d="M4 -144 L10 -114 M16 -146 L26 -114" stroke="${shade(look.top, 0.8)}" stroke-width="2" opacity="0.6"/>`
    : `<path d="M-23 -234 Q0 -242 22 -234 L24 -186 Q22 -150 20 -132 L-21 -132 Q-24 -160 -24 -186 Z" fill="${look.top}"/>
       <path d="M-23 -234 Q-14 -238 -8 -236 L-10 -132 L-21 -132 Q-24 -160 -24 -186 Z" fill="#000" opacity="0.13"/>
       <path d="M-22 -136 L21 -136 L23 -116 L-23 -116 Z" fill="${look.bottom}"/>
       <path d="M-22 -134 L21 -134" stroke="${shade(look.bottom, 0.7)}" stroke-width="3"/>`;
  const collar = `<path d="M-7 -238 L2 -224 L10 -238 Z" fill="${look.skin}"/><path d="M-7 -238 L2 -224 L10 -238" stroke="${shade(look.top, 0.82)}" stroke-width="2" fill="none"/>`;
  const jacket = look.jacket
    ? `<path d="M-24 -236 Q-12 -241 -4 -238 L2 -220 L-2 -128 L-22 -128 Q-25 -160 -25 -186 Z" fill="${look.jacket}"/>
       <path d="M12 -238 Q18 -238 23 -234 L25 -186 Q24 -152 21 -128 L10 -128 L8 -218 Z" fill="${look.jacket}"/>
       <path d="M-24 -236 Q-14 -240 -8 -238 L-10 -128 L-22 -128 Q-25 -160 -25 -186 Z" fill="#000" opacity="0.15"/>
       <path d="M-4 -238 L4 -214 M12 -238 L6 -216" stroke="${shade(look.jacket, 0.7)}" stroke-width="2.5"/>
       <path d="M22 -230 Q24 -190 21 -134" stroke="#ffffff" stroke-width="2" opacity="0.3" fill="none"/>`
    : `<path d="M20 -230 Q23 -190 20 -136" stroke="#ffffff" stroke-width="2" opacity="0.3" fill="none"/>`;
  const apron = look.apron
    ? `<path d="M-14 -210 L18 -210 L24 -112 L-20 -112 Z" fill="${look.apron}"/><path d="M-14 -210 Q2 -240 18 -210" stroke="${look.apron}" stroke-width="3" fill="none"/><rect x="-6" y="-176" width="20" height="16" rx="3" fill="${shade(look.apron, 0.8)}"/>`
    : "";

  const eye = (n: 1 | 2, cx: number, rx: number) => `
      <clipPath id="${id}-ec${String(n)}"><ellipse class="eye" id="${id}-eye${String(n)}" cx="${String(cx)}" cy="-283" rx="${String(rx)}" ry="3.4"/></clipPath>
      <g clip-path="url(#${id}-ec${String(n)})">
        <rect x="${String(cx - 6)}" y="-290" width="12" height="14" fill="#ffffff"/>
        <circle cx="${String(cx + 0.8)}" cy="-282.6" r="2.7" fill="#4a2f22"/>
        <circle cx="${String(cx + 0.9)}" cy="-282.6" r="1.4" fill="#120c10"/>
        <circle cx="${String(cx + 1.8)}" cy="-283.8" r="0.8" fill="#ffffff"/>
      </g>
      <path d="M${String(cx - rx - 0.6)} -283.4 Q${String(cx)} -288.4 ${String(cx + rx + 0.6)} -283.8" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;

  return `
  <g class="character" id="${id}-body">
    <ellipse cx="4" cy="2" rx="${String(Math.round(40 * look.height))}" ry="7" fill="#2a1546" opacity="0.18"/>
    <g transform="translate(0 ${String(-legsLen - 8)})">
      <g transform="translate(-8 0)">${leg("leg-b", true)}</g>
      <g transform="translate(9 0)">${leg("leg-f", false)}</g>
    </g>
    <g transform="translate(-17 -226) rotate(7)">${arm("arm-b", true)}</g>
    <path d="M-6 -256 L9 -256 L8 -232 L-6 -232 Z" fill="${skinDk}"/>
    <g transform="scale(1.14 1)">${torso}${collar}${jacket}${apron}</g>
    <g transform="translate(0 -235)"><g id="${id}-head" transform="rotate(0)"><g transform="scale(1.12) translate(0 240)">
      ${hair.back}
      <path d="M-20 -290 C-22 -306 -4 -310 8 -309 C22 -308 28 -296 27 -282 C27 -272 25 -262 20 -256 C15 -250 7 -248 0 -250 C-10 -252 -18 -260 -21 -272 Z" fill="${look.skin}"/>
      <path d="M-20 -290 C-22 -300 -14 -306 -6 -308 C-12 -296 -12 -268 0 -250 C-10 -252 -18 -260 -21 -272 Z" fill="#000" opacity="0.08"/>
      <ellipse cx="-12" cy="-277" rx="4.2" ry="6.4" fill="${look.skin}"/><path d="M-13 -280 q3 2 0 6" stroke="${skinDk}" stroke-width="1.6" fill="none"/>
      ${hair.front}
      ${look.beard ? `<path d="M-14 -268 Q-10 -250 4 -246 Q18 -246 24 -258 Q26 -266 26 -270 Q20 -262 14 -262 Q6 -262 -2 -266 Q-8 -266 -14 -268 Z" fill="${look.hair}"/>` : ""}
      <path d="M3 -290 q5 -3.4 10 -1.2 M17 -291 q4 -2 8.6 0" stroke="${look.hairStyle === "none" ? INK : shade(look.hair, 0.9)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      ${eye(1, 8.5, 3.8)}
      ${eye(2, 21, 3.1)}
      ${look.glasses ? `<g stroke="${INK}" stroke-width="1.7" fill="#ffffff" fill-opacity="0.12"><rect x="2.5" y="-288.5" width="12" height="10" rx="4"/><rect x="16.5" y="-288.5" width="10" height="10" rx="4"/><path d="M14.5 -284 h2 M2.5 -285 l-13 -2" fill="none"/></g>` : ""}
      <path d="M24.6 -282 Q29 -274 25 -271 Q23 -270 21 -271" stroke="${skinDk}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="7" cy="-271" rx="4.2" ry="2.6" fill="#f07a7a" opacity="0.28"/>
      <ellipse id="${id}-mouth" cx="16" cy="-262.5" rx="4.6" ry="1.3" fill="#7a2a3a"/>
      <path d="M11.6 -262.8 Q16 -261 20.6 -263" stroke="${shade(look.skin, 0.66)}" stroke-width="1" fill="none" opacity="0.6"/>
    </g></g></g>
    <g transform="translate(16 -226) rotate(-5)">${arm("arm-f", false)}</g>
  </g>`;
}

/** Mouth heights (the ellipse's ry) at rest and fully open, for the talking tween. */
export const MOUTH = { rest: 1.3, open: 3.6 };

/** Heights used for placing cards and computing hand positions (stage units, before scale). */
export function characterMetrics(lookKey: string) {
  const look = LOOKS[lookKey];
  if (!look) throw new Error(`Unknown character look "${lookKey}".`);
  // Characters are drawn ~12% larger than the 300 px design size so faces and gestures read at 720p.
  const scale = look.height * 1.12;
  return { scale, headTop: 320 * scale, shoulder: 226 * scale, handReach: 95 * scale };
}
