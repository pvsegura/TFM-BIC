import type { TimeOfDay } from "@tfm-bic/domain";

/**
 * The illustration kit for scenes (template 4): the soft cartoon-interior look — lavender and
 * purple rooms, tall windows onto a pale city skyline, pendant lamps that glow, potted plants,
 * rounded furniture with a rim of light, sun rays across the floor and a gentle vignette.
 *
 * Gradients and filters live in <defs> whose ids carry the time of day, so two scenes of one video
 * (each its own <svg>) never pick up each other's colours; identical duplicates are harmless.
 * Floor line y = 610 on a 1280×720 stage.
 */

export const FLOOR_Y = 610;
const s = String;

interface Sky {
  top: string;
  bottom: string;
  cloud: string;
  cloudOpacity: number;
  far: string;
  near: string;
  window: string;
  litWindow: string;
  bush: string;
  bushDark: string;
}

export const SKIES: Record<TimeOfDay, Sky> = {
  day: {
    top: "#6fb2ef",
    bottom: "#d6ecfb",
    cloud: "#ffffff",
    cloudOpacity: 0.75,
    far: "#c9d3f2",
    near: "#e6ebfa",
    window: "#b4c4ec",
    litWindow: "#b4c4ec",
    bush: "#a8d24a",
    bushDark: "#6f9e2e",
  },
  evening: {
    top: "#5b4aa6",
    bottom: "#f6b48a",
    cloud: "#f7c3c9",
    cloudOpacity: 0.55,
    far: "#8f7cc0",
    near: "#b49ad0",
    window: "#7e6bb0",
    litWindow: "#ffd58a",
    bush: "#6f8f4a",
    bushDark: "#4b6a3a",
  },
  night: {
    top: "#161b44",
    bottom: "#3b3f86",
    cloud: "#5a5f9e",
    cloudOpacity: 0.35,
    far: "#2c2f63",
    near: "#3b3e7a",
    window: "#2a2d5c",
    litWindow: "#ffd98a",
    bush: "#2f4a3a",
    bushDark: "#20352a",
  },
};

/** Shared gradients for a time of day. */
export function defs(time: TimeOfDay): string {
  const k = SKIES[time];
  return `<defs>
    <linearGradient id="ill-sky-${time}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${k.top}"/><stop offset="1" stop-color="${k.bottom}"/></linearGradient>
    <radialGradient id="ill-glow"><stop offset="0" stop-color="#fff6d6" stop-opacity="0.95"/><stop offset="0.35" stop-color="#ffe7a8" stop-opacity="0.45"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>
    <radialGradient id="ill-bokeh"><stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="0.7" stop-color="#ffffff" stop-opacity="0.18"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <linearGradient id="ill-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="${time === "night" ? "0.05" : "0.3"}"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
    <radialGradient id="ill-vignette-${time}" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#2a1150" stop-opacity="0"/><stop offset="1" stop-color="#2a1150" stop-opacity="${time === "night" ? "0.45" : "0.28"}"/></radialGradient>
    <linearGradient id="ill-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4" stop-opacity="${time === "day" ? "0.22" : "0.4"}"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></linearGradient>
  </defs>`;
}

/** A pale skyline seen through glass, between x0 and x1, from y0 down to y1. */
export function cityView(x0: number, x1: number, y0: number, y1: number, time: TimeOfDay): string {
  const k = SKIES[time];
  // Proportions are designed for a 444 px tall view and scale with the window.
  const scale = Math.min(1.25, (y1 - y0) / 444);
  const clip = `ill-clip-${s(Math.round(x0))}-${s(Math.round(y0))}-${s(Math.round(x1))}-${s(Math.round(y1))}`;
  const parts: string[] = [
    `<rect x="${s(x0)}" y="${s(y0)}" width="${s(x1 - x0)}" height="${s(y1 - y0)}" fill="url(#ill-sky-${time})"/>`,
  ];
  if (time === "night") {
    for (const [x, y] of [
      [0.08, 0.1],
      [0.22, 0.2],
      [0.4, 0.08],
      [0.57, 0.16],
      [0.72, 0.06],
      [0.9, 0.18],
    ] as const)
      parts.push(
        `<circle cx="${s(x0 + (x1 - x0) * x)}" cy="${s(y0 + (y1 - y0) * y)}" r="1.8" fill="#fff6d6"/>`,
      );
  } else {
    const sunX = x0 + (x1 - x0) * (time === "day" ? 0.82 : 0.6);
    const sunY = y0 + (y1 - y0) * (time === "day" ? 0.12 : 0.5);
    parts.push(
      `<circle cx="${s(sunX)}" cy="${s(sunY)}" r="120" fill="url(#ill-glow)" opacity="0.7"/>`,
    );
  }
  // Big soft clouds.
  const cloud = (cx: number, cy: number, w: number) =>
    `<g fill="${k.cloud}" opacity="${s(k.cloudOpacity)}"><ellipse cx="${s(cx)}" cy="${s(cy)}" rx="${s(w)}" ry="${s(w * 0.32)}"/><ellipse cx="${s(cx - w * 0.35)}" cy="${s(cy - w * 0.12)}" rx="${s(w * 0.42)}" ry="${s(w * 0.3)}"/><ellipse cx="${s(cx + w * 0.2)}" cy="${s(cy - w * 0.22)}" rx="${s(w * 0.45)}" ry="${s(w * 0.38)}"/></g>`;
  const w = x1 - x0;
  parts.push(
    cloud(x0 + w * 0.18, y0 + 90 * scale, 120 * scale),
    cloud(x0 + w * 0.55, y0 + 60 * scale, 160 * scale),
    cloud(x0 + w * 0.88, y0 + 120 * scale, 110 * scale),
  );
  // Far towers, then nearer blocks with window grids.
  const tower = (x: number, tw: number, th: number, color: string, win: string, lit: string) => {
    const top = y1 - th;
    const wins: string[] = [];
    for (let r = 0; r < Math.floor((th - 30) / 26); r += 1)
      for (let c = 0; c < Math.floor((tw - 12) / 18); c += 1)
        wins.push(
          `<rect x="${s(x + 8 + c * 18)}" y="${s(top + 14 + r * 26)}" width="10" height="14" fill="${time !== "day" && (r * 3 + c) % 4 !== 0 ? lit : win}"/>`,
        );
    return `<rect x="${s(x)}" y="${s(top)}" width="${s(tw)}" height="${s(th)}" fill="${color}"/><rect x="${s(x)}" y="${s(top)}" width="${s(Math.min(10, tw / 6))}" height="${s(th)}" fill="#ffffff" opacity="0.18"/>${wins.join("")}`;
  };
  const span = x1 - x0;
  const far = [0.02, 0.14, 0.31, 0.47, 0.6, 0.76, 0.9];
  far.forEach((f, i) => {
    parts.push(
      tower(
        x0 + span * f,
        60 + (i % 3) * 18,
        scale * (200 + ((i * 37) % 120)),
        k.far,
        k.window,
        k.litWindow,
      ),
    );
  });
  const near = [0.06, 0.24, 0.42, 0.66, 0.84];
  near.forEach((f, i) => {
    parts.push(
      tower(
        x0 + span * f,
        84 + (i % 2) * 22,
        scale * (150 + ((i * 53) % 90)),
        k.near,
        k.window,
        k.litWindow,
      ),
    );
  });
  // A line of rounded bushes at the bottom.
  const bushes: string[] = [];
  for (let x = x0 - 20; x < x1 + 20; x += 70) {
    const r = (34 + ((x * 7) % 18)) * Math.max(0.6, scale);
    bushes.push(
      `<ellipse cx="${s(x)}" cy="${s(y1 - 8)}" rx="${s(r + 8)}" ry="${s(r)}" fill="${k.bushDark}"/><ellipse cx="${s(x - 6)}" cy="${s(y1 - 14)}" rx="${s(r)}" ry="${s(r - 6)}" fill="${k.bush}"/>`,
    );
  }
  parts.push(bushes.join(""));
  return `<clipPath id="${clip}"><rect x="${s(x0)}" y="${s(y0)}" width="${s(x1 - x0)}" height="${s(y1 - y0)}"/></clipPath><g clip-path="url(#${clip})">${parts.join("")}</g>`;
}

/** Tall window bays onto the city: one continuous view, divided by wall pillars and white frames. */
export function windowWall(
  x0: number,
  x1: number,
  top: number,
  bottom: number,
  bays: number,
  wall: string,
  time: TimeOfDay,
  frame = "#e9e2fb",
): string {
  const pillar = 30;
  const bayW = (x1 - x0 - pillar * (bays - 1)) / bays;
  const out = [cityView(x0, x1, top, bottom, time)];
  for (let i = 1; i < bays; i += 1) {
    const px = x0 + i * bayW + (i - 1) * pillar;
    out.push(
      `<rect x="${s(px)}" y="${s(top - 10)}" width="${s(pillar)}" height="${s(bottom - top + 20)}" fill="${wall}"/><rect x="${s(px + pillar - 6)}" y="${s(top - 10)}" width="6" height="${s(bottom - top + 20)}" fill="#000" opacity="0.08"/>`,
    );
  }
  for (let i = 0; i < bays; i += 1) {
    const bx = x0 + i * (bayW + pillar);
    out.push(
      `<rect x="${s(bx)}" y="${s(top)}" width="${s(bayW)}" height="${s(bottom - top)}" fill="none" stroke="${frame}" stroke-width="12"/>`,
      `<rect x="${s(bx + 6)}" y="${s(top + 6)}" width="${s(bayW - 12)}" height="${s(bottom - top - 12)}" fill="none" stroke="#000" stroke-opacity="0.07" stroke-width="3"/>`,
      // Diagonal glass glints.
      `<path d="M${s(bx + bayW * 0.12)} ${s(bottom - 6)} L${s(bx + bayW * 0.5)} ${s(top + 6)} L${s(bx + bayW * 0.62)} ${s(top + 6)} L${s(bx + bayW * 0.24)} ${s(bottom - 6)} Z" fill="#ffffff" opacity="${time === "night" ? "0.04" : "0.12"}"/>`,
      `<path d="M${s(bx + bayW * 0.7)} ${s(bottom - 6)} L${s(bx + bayW * 0.94)} ${s(top + 160)} L${s(bx + bayW * 0.98)} ${s(top + 180)} L${s(bx + bayW * 0.76)} ${s(bottom - 6)} Z" fill="#ffffff" opacity="${time === "night" ? "0.03" : "0.1"}"/>`,
    );
  }
  out.push(
    `<rect x="${s(x0 - 14)}" y="${s(bottom)}" width="${s(x1 - x0 + 28)}" height="12" rx="4" fill="${frame}"/><rect x="${s(x0 - 14)}" y="${s(bottom + 9)}" width="${s(x1 - x0 + 28)}" height="4" fill="#000" opacity="0.1"/>`,
  );
  return out.join("");
}

/** A pendant lamp hanging from the ceiling at x, its shade at y; glows when it is not day. */
export function pendantLamp(x: number, ceiling: number, y: number, time: TimeOfDay): string {
  return `<path d="M${s(x)} ${s(ceiling)} V${s(y - 20)}" stroke="#2c2340" stroke-width="2"/>
    <path d="M${s(x - 70)} ${s(y + 14)} L${s(x - 140)} ${s(FLOOR_Y)} L${s(x + 140)} ${s(FLOOR_Y)} L${s(x + 70)} ${s(y + 14)} Z" fill="url(#ill-cone)"/>
    <circle cx="${s(x)}" cy="${s(y + 14)}" r="${time === "day" ? "70" : "110"}" fill="url(#ill-glow)"/>
    <path d="M${s(x - 8)} ${s(y - 22)} h16 v8 h-16 z" fill="#3a2f55"/>
    <path d="M${s(x - 62)} ${s(y + 14)} Q${s(x - 52)} ${s(y - 18)} ${s(x)} ${s(y - 18)} Q${s(x + 52)} ${s(y - 18)} ${s(x + 62)} ${s(y + 14)} Z" fill="#4a3d6b"/>
    <path d="M${s(x - 54)} ${s(y + 4)} Q${s(x - 40)} ${s(y - 12)} ${s(x - 6)} ${s(y - 15)}" stroke="#9f8fd0" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="${s(x)}" cy="${s(y + 14)}" rx="62" ry="5" fill="#2c2340"/>
    <ellipse cx="${s(x)}" cy="${s(y + 16)}" rx="16" ry="7" fill="#fff4cc"/>`;
}

/** Purple ceiling with a lighter recessed panel and round downlights. */
export function ceiling(height: number, color = "#6a479f"): string {
  return `<rect x="0" y="0" width="1280" height="${s(height)}" fill="${color}"/>
    <path d="M140 0 H1140 L1080 ${s(height - 22)} H200 Z" fill="#ffffff" opacity="0.1"/>
    <rect x="0" y="${s(height - 6)}" width="1280" height="6" fill="#000" opacity="0.18"/>
    ${[380, 900].map((x) => `<ellipse cx="${s(x)}" cy="${s(height - 34)}" rx="22" ry="5" fill="#fff8e1"/><ellipse cx="${s(x)}" cy="${s(height - 30)}" rx="60" ry="14" fill="#fff8e1" opacity="0.12"/>`).join("")}`;
}

/** A tiled, softly lit floor from the floor line down, with window reflections. */
export function tiledFloor(color: string, lines: string, reflections: number[] = []): string {
  const rows = [628, 652, 684].map(
    (y) => `<path d="M0 ${s(y)} H1280" stroke="${lines}" stroke-width="2" opacity="0.5"/>`,
  );
  const cols: string[] = [];
  for (let i = -6; i <= 6; i += 1) {
    const top = 640 + i * 120;
    const bottom = 640 + i * 230;
    cols.push(
      `<path d="M${s(top)} ${s(FLOOR_Y)} L${s(bottom)} 720" stroke="${lines}" stroke-width="2" opacity="0.5"/>`,
    );
  }
  return `<rect x="0" y="${s(FLOOR_Y)}" width="1280" height="${s(720 - FLOOR_Y)}" fill="${color}"/>
    ${rows.join("")}${cols.join("")}
    ${reflections.map((x) => `<path d="M${s(x - 120)} ${s(FLOOR_Y)} L${s(x + 120)} ${s(FLOOR_Y)} L${s(x + 260)} 720 L${s(x - 40)} 720 Z" fill="#ffffff" opacity="0.13"/>`).join("")}
    <rect x="0" y="${s(FLOOR_Y - 8)}" width="1280" height="8" fill="#000" opacity="0.12"/>`;
}

/** A wooden warm floor (cafés, homes). */
export function woodFloor(color: string): string {
  const planks: string[] = [];
  for (let y = FLOOR_Y + 18; y < 720; y += 24)
    planks.push(
      `<path d="M0 ${s(y)} H1280" stroke="#000" stroke-opacity="0.08" stroke-width="2"/>`,
    );
  return `<rect x="0" y="${s(FLOOR_Y)}" width="1280" height="${s(720 - FLOOR_Y)}" fill="${color}"/>${planks.join("")}
    <path d="M0 ${s(FLOOR_Y + 40)} Q640 ${s(FLOOR_Y + 10)} 1280 ${s(FLOOR_Y + 60)} L1280 720 L0 720 Z" fill="#ffffff" opacity="0.06"/>
    <rect x="0" y="${s(FLOOR_Y - 8)}" width="1280" height="8" fill="#000" opacity="0.14"/>`;
}

/** Diagonal sun rays falling from the windows across the room. */
export function sunRays(time: TimeOfDay, from: number[] = [300, 640, 980]): string {
  if (time === "night") return "";
  return from
    .map(
      (x) =>
        `<path d="M${s(x - 90)} 100 L${s(x + 40)} 100 L${s(x + 300)} ${s(FLOOR_Y + 110)} L${s(x + 60)} ${s(FLOOR_Y + 110)} Z" fill="url(#ill-ray)" opacity="0.7"/>`,
    )
    .join("");
}

/** A few soft out-of-focus light spots — the lens-flare sparkle of the references. */
export function bokeh(points: [number, number, number][]): string {
  return points
    .map(
      ([x, y, r]) =>
        `<circle cx="${s(x)}" cy="${s(y)}" r="${s(r)}" fill="url(#ill-bokeh)"/><circle cx="${s(x)}" cy="${s(y)}" r="${s(r * 0.12)}" fill="#ffffff" opacity="0.7"/>`,
    )
    .join("");
}

/** A potted plant: leafy (tall, spiky leaves) or bushy; base centre (x, floor y). */
export function plant(
  x: number,
  y: number,
  size = 1,
  kind: "leafy" | "spiky" | "bush" = "leafy",
  pot = "#b4452f",
): string {
  const potW = 46 * size;
  const potH = 52 * size;
  const potSvg = `<path d="M${s(x - potW / 2)} ${s(y - potH)} h${s(potW)} l${s(-6 * size)} ${s(potH)} h${s(-potW + 12 * size)} z" fill="${pot}"/>
    <path d="M${s(x - potW / 2)} ${s(y - potH)} h${s(potW * 0.3)} l${s(-4 * size)} ${s(potH)} h${s(-potW * 0.3 + 8 * size)} z" fill="#000" opacity="0.15"/>
    <rect x="${s(x - potW / 2 - 3)}" y="${s(y - potH - 6 * size)}" width="${s(potW + 6)}" height="${s(9 * size)}" rx="3" fill="${pot}"/>
    <path d="M${s(x + potW / 2 - 8 * size)} ${s(y - potH + 6)} v${s(potH - 14)}" stroke="#ffffff" stroke-width="3" opacity="0.25"/>`;
  const base = y - potH - 4 * size;
  const leaves: string[] = [];
  if (kind === "bush") {
    leaves.push(
      `<ellipse cx="${s(x)}" cy="${s(base - 26 * size)}" rx="${s(38 * size)}" ry="${s(32 * size)}" fill="#5d8f2a"/><ellipse cx="${s(x - 8 * size)}" cy="${s(base - 32 * size)}" rx="${s(28 * size)}" ry="${s(24 * size)}" fill="#8cc23c"/><ellipse cx="${s(x - 16 * size)}" cy="${s(base - 42 * size)}" rx="${s(10 * size)}" ry="${s(7 * size)}" fill="#c6e86a" opacity="0.7"/>`,
    );
  } else {
    const angles =
      kind === "spiky"
        ? [-38, -22, -8, 6, 20, 34, -50, 46]
        : [-60, -40, -18, 0, 20, 42, 62, -78, 80];
    angles.forEach((a, i) => {
      const len = (kind === "spiky" ? 110 : 90) * size * (0.75 + ((i * 37) % 30) / 100);
      const wid = (kind === "spiky" ? 9 : 20) * size;
      const dark = i % 2 === 0;
      leaves.push(
        `<g transform="translate(${s(x)} ${s(base)}) rotate(${s(a)})"><path d="M0 0 Q${s(-wid)} ${s(-len * 0.5)} 0 ${s(-len)} Q${s(wid)} ${s(-len * 0.5)} 0 0 Z" fill="${dark ? "#4f8a2a" : "#7cbf3a"}"/><path d="M0 0 Q${s(wid * 0.3)} ${s(-len * 0.5)} 0 ${s(-len * 0.95)}" stroke="#c6e86a" stroke-width="${s(1.6 * size)}" fill="none" opacity="0.7"/></g>`,
      );
    });
  }
  return `<ellipse cx="${s(x + 4)}" cy="${s(y)}" rx="${s(potW * 0.7)}" ry="${s(6 * size)}" fill="#000" opacity="0.15"/>${leaves.join("")}${potSvg}`;
}

/** A plump lounge armchair seen from the front-side; x = centre, colour = upholstery. */
export function armchair(x: number, color: string, facing: 1 | -1 = 1, size = 1): string {
  const dk = darken(color, 0.78);
  const lt = lighten(color, 0.25);
  return `<g transform="translate(${s(x)} ${s(FLOOR_Y)}) scale(${s(facing * size)} ${s(size)})">
    <ellipse cx="0" cy="2" rx="96" ry="10" fill="#000" opacity="0.15"/>
    <path d="M-70 -10 L-74 0 M70 -10 L74 0 M-40 -10 L-42 0 M40 -10 L42 0" stroke="#3a2a4a" stroke-width="6" stroke-linecap="round"/>
    <path d="M-80 -150 Q-82 -186 -40 -188 L50 -188 Q86 -186 84 -150 L84 -60 L-80 -60 Z" fill="${dk}"/>
    <path d="M-72 -150 Q-72 -176 -36 -178 L46 -178 Q74 -176 74 -150 L74 -80 L-72 -80 Z" fill="${color}"/>
    <path d="M-64 -168 Q-30 -176 30 -174" stroke="${lt}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M-92 -100 Q-96 -120 -76 -122 L-62 -122 Q-50 -120 -50 -100 L-50 -14 L-92 -14 Z" fill="${color}"/>
    <path d="M50 -100 Q50 -120 64 -122 L78 -122 Q96 -120 94 -100 L94 -14 L50 -14 Z" fill="${dk}"/>
    <path d="M-60 -78 Q0 -90 60 -78 L60 -40 L-60 -40 Z" fill="${lt}"/>
    <path d="M-94 -40 H96 V-12 Q96 -6 88 -6 H-86 Q-94 -6 -94 -12 Z" fill="${dk}"/>
    <path d="M-86 -110 Q-86 -116 -80 -117" stroke="#ffffff" stroke-width="3" opacity="0.5" fill="none" stroke-linecap="round"/>
  </g>`;
}

/** A light wooden desk with drawers and a monitor; x = centre. */
export function desk(x: number, width = 300, monitor = true, time: TimeOfDay = "day"): string {
  const top = FLOOR_Y - 150;
  const h = width / 2;
  return `<ellipse cx="${s(x)}" cy="${s(FLOOR_Y + 2)}" rx="${s(h + 20)}" ry="9" fill="#000" opacity="0.13"/>
    <rect x="${s(x - h + 6)}" y="${s(top + 14)}" width="96" height="${s(FLOOR_Y - top - 14)}" fill="#efd9b8"/>
    <rect x="${s(x - h + 6)}" y="${s(top + 14)}" width="14" height="${s(FLOOR_Y - top - 14)}" fill="#000" opacity="0.07"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${s(x - h + 14)}" y="${s(top + 22 + i * 32)}" width="80" height="26" rx="3" fill="#f7e6c9" stroke="#d4b994" stroke-width="2"/><rect x="${s(x - h + 44)}" y="${s(top + 32 + i * 32)}" width="20" height="4" rx="2" fill="#8a6a4f"/>`).join("")}
    <path d="M${s(x + h - 30)} ${s(top + 14)} L${s(x + h - 18)} ${s(FLOOR_Y)}" stroke="#5a4a6e" stroke-width="8" stroke-linecap="round"/>
    <rect x="${s(x - h)}" y="${s(top)}" width="${s(width)}" height="16" rx="4" fill="#c98a52"/>
    <rect x="${s(x - h)}" y="${s(top)}" width="${s(width)}" height="5" rx="2.5" fill="#e8b47c"/>
    ${
      monitor
        ? `<rect x="${s(x + 10)}" y="${s(top - 26)}" width="14" height="26" fill="#cfc8e2"/><rect x="${s(x - 14)}" y="${s(top - 6)}" width="62" height="6" rx="3" fill="#bdb4d8"/>
    <rect x="${s(x - 48)}" y="${s(top - 118)}" width="130" height="94" rx="8" fill="#ddd6f0"/>
    <rect x="${s(x - 41)}" y="${s(top - 111)}" width="116" height="80" rx="4" fill="${time === "night" ? "#8fb6ff" : "#f4f2fb"}"/>
    <path d="M${s(x - 36)} ${s(top - 106)} L${s(x + 10)} ${s(top - 106)} L${s(x - 20)} ${s(top - 36)} L${s(x - 36)} ${s(top - 36)} Z" fill="#ffffff" opacity="0.5"/>
    <rect x="${s(x - 100)}" y="${s(top - 22)}" width="42" height="22" rx="2" fill="#e04f6a"/><rect x="${s(x - 104)}" y="${s(top - 30)}" width="50" height="9" rx="2" fill="#f2c94c"/>
    <rect x="${s(x + 96)}" y="${s(top - 28)}" width="18" height="28" rx="3" fill="#f6f1ea"/><path d="M${s(x + 114)} ${s(top - 22)} q8 2 0 12" stroke="#f6f1ea" stroke-width="3" fill="none"/>`
        : ""
    }`;
}

/** A swivel office chair seen from behind; x = centre. */
export function officeChair(x: number, color = "#3b3570"): string {
  const y = FLOOR_Y;
  return `<ellipse cx="${s(x)}" cy="${s(y + 2)}" rx="56" ry="7" fill="#000" opacity="0.15"/>
    <path d="M${s(x - 44)} ${s(y - 8)} L${s(x)} ${s(y - 22)} L${s(x + 44)} ${s(y - 8)}" stroke="#bdb6d4" stroke-width="7" fill="none" stroke-linecap="round"/>
    ${[-44, 0, 44].map((d) => `<circle cx="${s(x + d)}" cy="${s(y - 5)}" r="6" fill="#2c2340"/>`).join("")}
    <rect x="${s(x - 5)}" y="${s(y - 90)}" width="10" height="70" fill="#cfc8e2"/>
    <path d="M${s(x - 48)} ${s(y - 100)} Q${s(x)} ${s(y - 112)} ${s(x + 48)} ${s(y - 100)} L${s(x + 44)} ${s(y - 84)} L${s(x - 44)} ${s(y - 84)} Z" fill="${darken(color, 0.8)}"/>
    <path d="M${s(x - 46)} ${s(y - 210)} Q${s(x)} ${s(y - 230)} ${s(x + 46)} ${s(y - 210)} L${s(x + 40)} ${s(y - 100)} Q${s(x)} ${s(y - 94)} ${s(x - 40)} ${s(y - 100)} Z" fill="${color}"/>
    <path d="M${s(x - 36)} ${s(y - 206)} Q${s(x - 10)} ${s(y - 220)} ${s(x + 20)} ${s(y - 214)}" stroke="#ffffff" stroke-width="3" opacity="0.35" fill="none" stroke-linecap="round"/>
    <path d="M${s(x)} ${s(y - 214)} V${s(y - 104)}" stroke="#000" stroke-opacity="0.12" stroke-width="2"/>`;
}

/** A water cooler; x = centre. */
export function waterCooler(x: number): string {
  const y = FLOOR_Y;
  return `<ellipse cx="${s(x)}" cy="${s(y + 2)}" rx="44" ry="6" fill="#000" opacity="0.15"/>
    <rect x="${s(x - 34)}" y="${s(y - 150)}" width="68" height="150" rx="8" fill="#d9d3ea"/>
    <rect x="${s(x - 34)}" y="${s(y - 150)}" width="14" height="150" rx="6" fill="#000" opacity="0.06"/>
    <rect x="${s(x - 22)}" y="${s(y - 126)}" width="44" height="22" rx="4" fill="#bcb4d4"/>
    <circle cx="${s(x - 8)}" cy="${s(y - 115)}" r="4" fill="#3d6ee0"/><circle cx="${s(x + 8)}" cy="${s(y - 115)}" r="4" fill="#e04f4f"/>
    <path d="M${s(x - 30)} ${s(y - 150)} Q${s(x - 40)} ${s(y - 236)} ${s(x)} ${s(y - 240)} Q${s(x + 40)} ${s(y - 236)} ${s(x + 30)} ${s(y - 150)} Z" fill="#8fa8f0" opacity="0.85"/>
    <path d="M${s(x - 30)} ${s(y - 190)} Q${s(x)} ${s(y - 184)} ${s(x + 30)} ${s(y - 190)} L${s(x + 30)} ${s(y - 150)} L${s(x - 30)} ${s(y - 150)} Z" fill="#5f7fe0" opacity="0.6"/>
    <path d="M${s(x - 20)} ${s(y - 226)} Q${s(x - 26)} ${s(y - 200)} ${s(x - 20)} ${s(y - 162)}" stroke="#ffffff" stroke-width="5" opacity="0.5" fill="none" stroke-linecap="round"/>`;
}

/** A board on the wall with sticky notes. */
export function noteBoard(x: number, y: number, w: number, h: number): string {
  const notes = [
    ["#f7d84a", 0.12, 0.2],
    ["#f48fb1", 0.38, 0.3],
    ["#a5d86a", 0.62, 0.18],
    ["#f7d84a", 0.8, 0.5],
    ["#90caf9", 0.22, 0.6],
  ] as const;
  return `<rect x="${s(x)}" y="${s(y)}" width="${s(w)}" height="${s(h)}" rx="6" fill="#fdfbff" stroke="#d9d0ef" stroke-width="8"/>
    ${notes.map(([c, fx, fy], i) => `<rect x="${s(x + w * fx)}" y="${s(y + h * fy)}" width="34" height="32" fill="${c}" transform="rotate(${s(i % 2 ? 4 : -3)} ${s(x + w * fx + 17)} ${s(y + h * fy + 16)})"/>`).join("")}`;
}

/** Overall colour wash over the whole picture, placed in front of the characters. */
export function vignette(time: TimeOfDay): string {
  return `<rect width="1280" height="720" fill="url(#ill-vignette-${time})" pointer-events="none"/>`;
}

function darken(hex: string, f: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * f);
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, "0")}`;
}

function lighten(hex: string, f: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v + (255 - v) * f);
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, "0")}`;
}
