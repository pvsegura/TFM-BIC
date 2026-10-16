import type { Environment, TimeOfDay } from "@tfm-bic/domain";

import * as ill from "./illustration.js";

/**
 * Places for educational scenes (M22, ADR-032; redrawn in template 4 with the illustration kit):
 * readable illustrations that establish the situation — a café has a counter, cups, a coffee machine
 * and tables; a station has a platform and a clock. Soft cartoon-interior style, no text except an
 * optional validated sign. The floor line is y = 610 on a 1280×720 stage; characters stand on it.
 *
 * Surfaces that plans put props on keep their positions: the café counter top is y = 398 from
 * x = 830, the shop counter top y = 448 from x = 870, the home sofa seat ≈ y = 460 at x 340–710.
 */

export const FLOOR_Y = ill.FLOOR_Y;
const s = String;
const F = FLOOR_Y;

function signBoard(text: string, x: number, y: number, w: number): string {
  return `<rect x="${s(x)}" y="${s(y + 5)}" width="${s(w)}" height="54" rx="14" fill="#2a1546" opacity="0.18"/>
    <rect x="${s(x)}" y="${s(y)}" width="${s(w)}" height="54" rx="14" fill="#ffffff" stroke="#5b3da0" stroke-width="4"/>
    <text x="${s(x + w / 2)}" y="${s(y + 38)}" text-anchor="middle" font-family="Bricolage" font-weight="800" font-size="30" fill="#3b2566" letter-spacing="2">${text}</text>`;
}

/** A wall gradient with its own id. */
function wall(id: string, top: string, bottom: string): string {
  return `<defs><linearGradient id="ill-wall-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
    <rect width="1280" height="720" fill="url(#ill-wall-${id})"/>`;
}

/** Outdoors: sky, clouds, a pale skyline and a hedge line down to just above the ground. */
function outdoors(time: TimeOfDay, horizon = F - 40): string {
  return `${ill.defs(time)}${ill.cityView(0, 1280, 0, horizon, time)}`;
}

/** A building front with framed windows; ground at the floor line minus `base`. */
function facade(
  x: number,
  w: number,
  h: number,
  color: string,
  time: TimeOfDay,
  base = 70,
  roof?: string,
): string {
  const top = F - base - h;
  const sky = ill.SKIES[time];
  const lit = time !== "day";
  const wins: string[] = [];
  const cols = Math.max(1, Math.floor((w - 30) / 74));
  const rows = Math.max(1, Math.floor((h - 70) / 92));
  const gap = (w - cols * 46) / (cols + 1);
  for (let r = 0; r < rows; r += 1)
    for (let c = 0; c < cols; c += 1) {
      const wx = x + gap + c * (46 + gap);
      const wy = top + 40 + r * 92;
      const on = lit && (r + c * 2) % 3 !== 0;
      wins.push(
        `<rect x="${s(wx - 4)}" y="${s(wy - 4)}" width="54" height="70" rx="4" fill="#f6f1ff"/>
        <rect x="${s(wx)}" y="${s(wy)}" width="46" height="62" rx="2" fill="${on ? sky.litWindow : time === "day" ? "#a9c8f0" : sky.window}"/>
        <path d="M${s(wx + 6)} ${s(wy + 58)} L${s(wx + 26)} ${s(wy + 4)} L${s(wx + 34)} ${s(wy + 4)} L${s(wx + 14)} ${s(wy + 58)} Z" fill="#ffffff" opacity="0.3"/>
        <rect x="${s(wx - 6)}" y="${s(wy + 64)}" width="58" height="7" rx="2" fill="#e4dcf5"/>`,
      );
    }
  return `<rect x="${s(x)}" y="${s(top)}" width="${s(w)}" height="${s(h)}" fill="${color}"/>
    <rect x="${s(x)}" y="${s(top)}" width="${s(Math.min(16, w / 8))}" height="${s(h)}" fill="#ffffff" opacity="0.16"/>
    <rect x="${s(x + w - 14)}" y="${s(top)}" width="14" height="${s(h)}" fill="#000" opacity="0.1"/>
    <rect x="${s(x - 6)}" y="${s(top - 14)}" width="${s(w + 12)}" height="16" rx="3" fill="${roof ?? "#6a479f"}"/>
    ${wins.join("")}`;
}

function streetLamp(x: number, time: TimeOfDay): string {
  const on = time !== "day";
  return `<rect x="${s(x - 5)}" y="${s(F - 280)}" width="10" height="280" rx="4" fill="#3b2f5c"/>
    <rect x="${s(x - 12)}" y="${s(F - 18)}" width="24" height="18" rx="4" fill="#3b2f5c"/>
    <path d="M${s(x)} ${s(F - 280)} q0 -28 34 -28" stroke="#3b2f5c" stroke-width="8" fill="none" stroke-linecap="round"/>
    ${on ? `<circle cx="${s(x + 36)}" cy="${s(F - 290)}" r="90" fill="url(#ill-glow)"/>` : ""}
    <path d="M${s(x + 18)} ${s(F - 304)} h34 l-6 16 h-22 z" fill="#4a3d6b"/>
    <ellipse cx="${s(x + 35)}" cy="${s(F - 287)}" rx="9" ry="4" fill="${on ? "#fff4cc" : "#e6def5"}"/>`;
}

function tree(x: number, size = 1, base = F): string {
  const r = 80 * size;
  return `<ellipse cx="${s(x + 6)}" cy="${s(base + 2)}" rx="${s(r * 0.7)}" ry="${s(10 * size)}" fill="#000" opacity="0.14"/>
    <path d="M${s(x - 9 * size)} ${s(base)} L${s(x - 6 * size)} ${s(base - 180 * size)} L${s(x + 6 * size)} ${s(base - 180 * size)} L${s(x + 9 * size)} ${s(base)} Z" fill="#7a4e3a"/>
    <circle cx="${s(x)}" cy="${s(base - 220 * size)}" r="${s(r)}" fill="#5d8f2a"/>
    <circle cx="${s(x - r * 0.5)}" cy="${s(base - 190 * size)}" r="${s(r * 0.62)}" fill="#5d8f2a"/>
    <circle cx="${s(x + r * 0.55)}" cy="${s(base - 186 * size)}" r="${s(r * 0.58)}" fill="#4f7f24"/>
    <circle cx="${s(x - r * 0.18)}" cy="${s(base - 238 * size)}" r="${s(r * 0.7)}" fill="#8cc23c"/>
    <circle cx="${s(x - r * 0.42)}" cy="${s(base - 262 * size)}" r="${s(r * 0.2)}" fill="#c6e86a" opacity="0.7"/>`;
}

function bench(x: number, w = 190): string {
  return `<ellipse cx="${s(x + w / 2)}" cy="${s(F + 2)}" rx="${s(w / 2 + 10)}" ry="7" fill="#000" opacity="0.15"/>
    <rect x="${s(x + 14)}" y="${s(F - 60)}" width="10" height="60" fill="#3b2f5c"/><rect x="${s(x + w - 24)}" y="${s(F - 60)}" width="10" height="60" fill="#3b2f5c"/>
    <rect x="${s(x)}" y="${s(F - 70)}" width="${s(w)}" height="14" rx="5" fill="#c98a52"/><rect x="${s(x)}" y="${s(F - 70)}" width="${s(w)}" height="4" rx="2" fill="#e8b47c"/>
    <rect x="${s(x)}" y="${s(F - 112)}" width="${s(w)}" height="12" rx="5" fill="#c98a52"/><rect x="${s(x)}" y="${s(F - 92)}" width="${s(w)}" height="12" rx="5" fill="#b77a45"/>
    <rect x="${s(x + 14)}" y="${s(F - 112)}" width="8" height="46" fill="#3b2f5c"/><rect x="${s(x + w - 22)}" y="${s(F - 112)}" width="8" height="46" fill="#3b2f5c"/>`;
}

function sidewalk(color = "#c9bfe0", road = true): string {
  const tiles: string[] = [];
  for (let x = -40; x < 1300; x += 80)
    tiles.push(
      `<path d="M${s(x)} ${s(F)} L${s(x - 20)} ${s(F + 40)}" stroke="#000" stroke-opacity="0.08" stroke-width="2"/>`,
    );
  return `<rect x="0" y="${s(F - 8)}" width="1280" height="8" fill="#000" opacity="0.1"/>
    <rect x="0" y="${s(F)}" width="1280" height="${s(road ? 40 : 110)}" fill="${color}"/>${tiles.join("")}
    ${
      road
        ? `<rect x="0" y="${s(F + 40)}" width="1280" height="8" fill="#ece6f7"/>
    <rect x="0" y="${s(F + 48)}" width="1280" height="${s(720 - F - 48)}" fill="#5c5480"/>
    <path d="M0 ${s(F + 82)} h1280" stroke="#efe9fb" stroke-width="5" stroke-dasharray="48 36"/>`
        : ""
    }`;
}

function curtain(x: number, y: number, h: number, flip = 1): string {
  return `<path d="M${s(x)} ${s(y)} q${s(flip * 34)} ${s(h * 0.5)} ${s(flip * 8)} ${s(h)} h${s(flip * 44)} q${s(flip * -14)} ${s(-h * 0.55)} ${s(flip * 6)} ${s(-h)} z" fill="#f3e6ff" opacity="0.92"/>
    <path d="M${s(x + flip * 18)} ${s(y + 10)} q${s(flip * 16)} ${s(h * 0.45)} ${s(flip * 4)} ${s(h - 10)}" stroke="#c9b3ea" stroke-width="3" fill="none"/>`;
}

function picture(x: number, y: number, w: number, h: number): string {
  return `<rect x="${s(x)}" y="${s(y)}" width="${s(w)}" height="${s(h)}" rx="4" fill="#fdfbff" stroke="#c98a52" stroke-width="8"/>
    <path d="M${s(x + 10)} ${s(y + h - 10)} l${s(w * 0.3)} ${s(-h * 0.45)} l${s(w * 0.2)} ${s(h * 0.25)} l${s(w * 0.18)} ${s(-h * 0.2)} l${s(w * 0.24)} ${s(h * 0.4)} z" fill="#a8d24a"/>
    <circle cx="${s(x + w * 0.72)}" cy="${s(y + h * 0.3)}" r="${s(h * 0.1)}" fill="#f6b48a"/>`;
}

function table(x: number, top = F - 120): string {
  return `<ellipse cx="${s(x)}" cy="${s(F + 2)}" rx="80" ry="8" fill="#000" opacity="0.14"/>
    <rect x="${s(x - 6)}" y="${s(top + 12)}" width="12" height="${s(F - top - 12)}" fill="#3b2f5c"/>
    <ellipse cx="${s(x)}" cy="${s(F - 3)}" rx="42" ry="6" fill="#3b2f5c"/>
    <rect x="${s(x - 76)}" y="${s(top)}" width="152" height="14" rx="6" fill="#c98a52"/><rect x="${s(x - 76)}" y="${s(top)}" width="152" height="5" rx="2.5" fill="#e8b47c"/>`;
}

function cafeChair(x: number, flip = 1, color = "#e2559b"): string {
  const back = x + flip * 30;
  return `<path d="M${s(x - 18)} ${s(F)} L${s(x - 14)} ${s(F - 70)} M${s(x + 18)} ${s(F)} L${s(x + 14)} ${s(F - 70)}" stroke="#3b2f5c" stroke-width="5" stroke-linecap="round"/>
    <path d="M${s(back)} ${s(F - 70)} L${s(back + flip * 4)} ${s(F - 150)}" stroke="#3b2f5c" stroke-width="5" stroke-linecap="round"/>
    <rect x="${s(Math.min(back, back + flip * 4) - 14)}" y="${s(F - 160)}" width="30" height="50" rx="10" fill="${color}"/>
    <rect x="${s(x - 26)}" y="${s(F - 80)}" width="52" height="12" rx="6" fill="${color}"/>`;
}

function shelfWithItems(x: number, y: number, w: number, items: string[]): string {
  const gap = w / (items.length + 1);
  return `<rect x="${s(x)}" y="${s(y)}" width="${s(w)}" height="10" rx="3" fill="#c98a52"/><rect x="${s(x)}" y="${s(y + 10)}" width="${s(w)}" height="4" fill="#000" opacity="0.12"/>
    ${items.map((c, i) => `<rect x="${s(x + gap * (i + 1) - 13)}" y="${s(y - 34)}" width="26" height="34" rx="5" fill="${c}"/><rect x="${s(x + gap * (i + 1) - 9)}" y="${s(y - 30)}" width="6" height="26" rx="3" fill="#ffffff" opacity="0.3"/>`).join("")}`;
}

const ENVIRONMENTS: Record<Environment, (time: TimeOfDay, sign?: string) => string> = {
  street: (time, sign) => `${outdoors(time)}
    ${facade(-20, 310, 340, "#c7a7e8", time)}${facade(300, 270, 420, "#f2b9a6", time, 70, "#8a4f9f")}
    ${facade(580, 340, 300, "#e9d0f5", time)}${facade(930, 380, 370, "#a99be0", time, 70, "#5b3da0")}
    <path d="M660 ${s(F - 200)} h150 l14 34 h-178 z" fill="#e2559b"/><path d="M660 ${s(F - 200)} h150 l14 34 h-178 z" fill="url(#ill-ray)" opacity="0.5"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${s(646 + i * 30)} ${s(F - 166)} q15 12 30 0" fill="#ffffff" opacity="0.85"/>`).join("")}
    <rect x="690" y="${s(F - 160)}" width="90" height="160" rx="8" fill="#5b3da0"/><rect x="700" y="${s(F - 150)}" width="70" height="80" rx="4" fill="#a9c8f0" opacity="0.8"/><circle cx="765" cy="${s(F - 66)}" r="5" fill="#f2c94c"/>
    ${sign ? signBoard(sign, 640, 300, 220) : ""}
    ${ill.plant(620, F, 0.85, "bush", "#6a479f")}${ill.plant(860, F, 0.85, "bush", "#6a479f")}
    ${streetLamp(190, time)}${streetLamp(1110, time)}
    ${sidewalk()}
    ${ill.bokeh([
      [1180, 90, 30],
      [90, 140, 18],
    ])}
    <!--FRONT-->${ill.vignette(time)}<!--/FRONT-->`,
  suburb: (time) => `${outdoors(time, F - 90)}
    <path d="M0 ${s(F - 120)} Q320 ${s(F - 170)} 640 ${s(F - 130)} Q980 ${s(F - 90)} 1280 ${s(F - 150)} V720 H0 Z" fill="#9fc85a"/>
    <path d="M0 ${s(F - 80)} Q400 ${s(F - 120)} 820 ${s(F - 84)} Q1060 ${s(F - 64)} 1280 ${s(F - 96)} V720 H0 Z" fill="#86b84a"/>
    ${[
      [380, "#f2b9a6", "#8a4f9f"],
      [760, "#e9d0f5", "#5b3da0"],
    ]
      .map(
        ([x, wallC, roofC]) => `<g transform="translate(${s(x)} ${s(F - 48)})">
      <rect x="-110" y="-150" width="220" height="150" fill="${wallC}"/><rect x="-110" y="-150" width="18" height="150" fill="#ffffff" opacity="0.18"/>
      <path d="M-134 -144 L0 -246 L134 -144 Z" fill="${roofC}"/><path d="M-134 -144 L0 -246 L20 -230 L-104 -136 Z" fill="#ffffff" opacity="0.12"/>
      <rect x="-26" y="-84" width="52" height="84" rx="4" fill="#6a479f"/><circle cx="16" cy="-42" r="4" fill="#f2c94c"/>
      <rect x="-90" y="-120" width="48" height="44" rx="3" fill="${time === "day" ? "#a9c8f0" : "#ffd58a"}" stroke="#f6f1ff" stroke-width="6"/>
      <rect x="42" y="-120" width="48" height="44" rx="3" fill="${time === "day" ? "#a9c8f0" : "#ffd58a"}" stroke="#f6f1ff" stroke-width="6"/></g>`,
      )
      .join("")}
    ${tree(110, 0.95, F - 40)}${tree(1170, 1.05, F - 40)}
    ${[...Array(32).keys()].map((i) => `<rect x="${s(i * 40 + 4)}" y="${s(F - 70)}" width="14" height="52" rx="6" fill="#f6f1ff"/>`).join("")}
    <rect x="0" y="${s(F - 56)}" width="1280" height="8" rx="3" fill="#f6f1ff"/><rect x="0" y="${s(F - 34)}" width="1280" height="8" rx="3" fill="#f6f1ff"/>
    ${time !== "day" ? streetLamp(560, time) : ""}
    ${sidewalk("#d9cfe8")}
    <!--FRONT-->${ill.vignette(time)}<!--/FRONT-->`,
  park: (time) => `${outdoors(time, F - 120)}
    <path d="M0 ${s(F - 100)} Q320 ${s(F - 180)} 640 ${s(F - 120)} Q960 ${s(F - 60)} 1280 ${s(F - 150)} V720 H0 Z" fill="#9fc85a"/>
    ${tree(160, 1.0)}${tree(420, 0.82)}${tree(1060, 1.08)}
    ${ill.plant(300, F, 1, "bush", "#4f7f24")}${ill.plant(1210, F, 1.1, "bush", "#4f7f24")}
    <rect x="0" y="${s(F)}" width="1280" height="${s(720 - F)}" fill="#8cc23c"/>
    <path d="M260 720 Q560 ${s(F + 40)} 940 ${s(F)} L1090 ${s(F)} Q760 ${s(F + 50)} 520 720 Z" fill="#efdcc0"/>
    <path d="M300 720 Q580 ${s(F + 46)} 960 ${s(F + 6)}" stroke="#ffffff" stroke-width="3" opacity="0.4" fill="none"/>
    ${bench(820)}
    ${[
      [90, 660],
      [210, 690],
      [1150, 650],
      [1240, 690],
      [700, 700],
    ]
      .map(([x = 0, y = 0]) => [x, y] as const)
      .map(
        ([x, y]) =>
          `<circle cx="${s(x)}" cy="${s(y)}" r="5" fill="#f48fb1"/><circle cx="${s(x + 14)}" cy="${s(y + 6)}" r="4" fill="#f7d84a"/><circle cx="${s(x - 12)}" cy="${s(y + 8)}" r="4" fill="#ffffff"/>`,
      )
      .join("")}
    ${time !== "day" ? streetLamp(620, time) : ""}
    ${ill.bokeh([
      [1100, 80, 34],
      [240, 60, 20],
    ])}
    <!--FRONT-->${ill.vignette(time)}<!--/FRONT-->`,
  cafe: (time) => `${ill.defs(time)}${wall("cafe", "#f0b9b8", "#f8d9cf")}
    <rect x="0" y="${s(F - 220)}" width="1280" height="220" fill="#e7a7a8"/><rect x="0" y="${s(F - 226)}" width="1280" height="8" fill="#c98a52"/>
    ${ill.windowWall(60, 380, 140, 400, 1, "#f0b9b8", time)}
    ${curtain(46, 128, 300)}${curtain(394, 128, 300, -1)}
    <rect x="460" y="128" width="250" height="170" rx="12" fill="#3b2f4a" stroke="#c98a52" stroke-width="8"/>
    <g stroke="#fdf6ea" stroke-width="3" fill="none" stroke-linecap="round"><path d="M500 178 h36 a9 9 0 0 1 -9 20 h-18 z M536 184 q10 2 7 11"/><path d="M500 245 q18 -20 36 0 z"/><path d="M590 170 h70 M590 198 h80 M590 238 h66 M590 266 h50"/></g>
    ${shelfWithItems(760, 210, 300, ["#f6f1ea", "#e2559b", "#f6f1ea", "#7c4dd6", "#f6f1ea"])}
    ${ill.ceiling(70, "#7a4a9f")}
    ${[560, 860].map((x) => ill.pendantLamp(x, 70, 150, time)).join("")}
    ${ill.woodFloor("#b9784f")}
    ${ill.sunRays(time, [180])}
    ${table(300)}${cafeChair(214, -1)}${cafeChair(386, 1)}
    ${ill.plant(40, F, 1.1, "leafy", "#a8432c")}
    <rect x="1080" y="${s(F - 330)}" width="130" height="118" rx="14" fill="#6a5a8a"/><rect x="1080" y="${s(F - 330)}" width="18" height="118" rx="8" fill="#ffffff" opacity="0.15"/>
    <rect x="1098" y="${s(F - 310)}" width="94" height="40" rx="8" fill="#2f2640"/><circle cx="1145" cy="${s(F - 250)}" r="10" fill="#d9d3ea"/>
    <path d="M1130 ${s(F - 238)} v14 M1160 ${s(F - 238)} v14" stroke="#2f2640" stroke-width="6"/>
    <rect x="880" y="${s(F - 250)}" width="70" height="38" rx="8" fill="#f6e3c8"/><path d="M890 ${s(F - 250)} q25 -16 50 0" fill="#e8b47c"/>
    <!--FRONT-->
    <rect x="830" y="${s(F - 200)}" width="460" height="200" fill="#5b3d7a"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${s(850 + i * 110)}" y="${s(F - 176)}" width="94" height="150" rx="8" fill="#6c4a8f"/>`).join("")}
    <rect x="830" y="${s(F - 200)}" width="460" height="10" fill="#000" opacity="0.15"/>
    <rect x="815" y="${s(F - 212)}" width="480" height="18" rx="5" fill="#c98a52"/><rect x="815" y="${s(F - 212)}" width="480" height="6" rx="3" fill="#e8b47c"/>
    ${ill.vignette(time)}
    <!--/FRONT-->`,
  home: (time) => `${ill.defs(time)}${wall("home", "#c7b2ea", "#e6d6f3")}
    ${ill.windowWall(850, 1130, 140, 390, 1, "#c7b2ea", time)}
    ${curtain(836, 126, 290)}${curtain(1144, 126, 290, -1)}
    <rect x="820" y="118" width="340" height="10" rx="5" fill="#8a6aa8"/>
    ${picture(90, 160, 190, 140)}
    ${shelfWithItems(360, 150, 190, ["#e2559b", "#7c4dd6", "#f0a53b", "#3fb3a0", "#f6f1ea"])}
    ${ill.woodFloor("#c48b62")}
    ${ill.sunRays(time, [940])}
    <ellipse cx="540" cy="${s(F + 44)}" rx="330" ry="40" fill="#e2559b" opacity="0.35"/><ellipse cx="540" cy="${s(F + 44)}" rx="280" ry="30" fill="#f7c3d9" opacity="0.35"/>
    <ellipse cx="525" cy="${s(F + 2)}" rx="200" ry="10" fill="#000" opacity="0.15"/>
    <rect x="340" y="${s(F - 220)}" width="370" height="110" rx="34" fill="#d98a2e"/>
    <path d="M362 ${s(F - 206)} q160 -14 326 0" stroke="#f7c46a" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/>
    <rect x="360" y="${s(F - 150)}" width="330" height="100" rx="26" fill="#f0a53b"/>
    <path d="M374 ${s(F - 142)} h302" stroke="#f7c46a" stroke-width="5" stroke-linecap="round"/>
    <rect x="320" y="${s(F - 170)}" width="54" height="130" rx="22" fill="#d98a2e"/><rect x="676" y="${s(F - 170)}" width="54" height="130" rx="22" fill="#c47a22"/>
    <rect x="370" y="${s(F - 40)}" width="14" height="40" rx="4" fill="#3b2f5c"/><rect x="666" y="${s(F - 40)}" width="14" height="40" rx="4" fill="#3b2f5c"/>
    <rect x="400" y="${s(F - 196)}" width="70" height="56" rx="18" fill="#7c4dd6" transform="rotate(-8 435 ${s(F - 168)})"/>
    <rect x="768" y="${s(F - 260)}" width="8" height="260" fill="#3b2f5c"/><ellipse cx="772" cy="${s(F - 2)}" rx="30" ry="6" fill="#3b2f5c"/>
    ${time !== "day" ? `<circle cx="772" cy="${s(F - 268)}" r="90" fill="url(#ill-glow)"/>` : ""}
    <path d="M736 ${s(F - 262)} h72 l-14 -50 h-44 z" fill="#f7d38a"/>
    ${ill.plant(1210, F, 1.2, "leafy", "#a8432c")}
    <!--FRONT-->${ill.vignette(time)}<!--/FRONT-->`,
  kitchen: (time) => `${ill.defs(time)}${wall("kitchen", "#b8a6e6", "#dcd0f2")}
    ${ill.windowWall(520, 780, 120, 330, 1, "#b8a6e6", time)}
    ${[60, 260, 860, 1060].map((x) => `<rect x="${s(x)}" y="110" width="180" height="140" rx="8" fill="#efe8fb"/><rect x="${s(x + 8)}" y="118" width="164" height="124" rx="6" fill="#f8f4ff" stroke="#d9cdee" stroke-width="3"/><rect x="${s(x + 80)}" y="226" width="20" height="6" rx="3" fill="#8a6aa8"/>`).join("")}
    <rect x="0" y="${s(F - 260)}" width="1280" height="40" fill="#e7def7"/>
    ${[...Array(16).keys()].map((i) => `<path d="M${s(i * 80)} ${s(F - 260)} v40" stroke="#d2c4ee" stroke-width="2"/>`).join("")}
    <rect x="0" y="${s(F - 200)}" width="1280" height="200" fill="#7c5bb8"/>
    ${[60, 260, 860].map((x) => `<rect x="${s(x)}" y="${s(F - 186)}" width="180" height="176" rx="8" fill="#8f6cc8"/><rect x="${s(x + 80)}" y="${s(F - 120)}" width="20" height="6" rx="3" fill="#efe8fb"/>`).join("")}
    <rect x="0" y="${s(F - 220)}" width="1280" height="22" fill="#f6efe3"/><rect x="0" y="${s(F - 202)}" width="1280" height="4" fill="#000" opacity="0.12"/>
    <rect x="110" y="${s(F - 250)}" width="40" height="30" rx="6" fill="#e2559b"/><rect x="300" y="${s(F - 262)}" width="24" height="42" rx="5" fill="#3fb3a0"/>
    ${ill.plant(900, F - 220, 0.55, "bush", "#e2559b")}
    <rect x="1110" y="${s(F - 390)}" width="150" height="390" rx="14" fill="#eef0fb"/><rect x="1110" y="${s(F - 390)}" width="20" height="390" rx="10" fill="#ffffff" opacity="0.6"/>
    <path d="M1110 ${s(F - 250)} h150" stroke="#c9cbe0" stroke-width="4"/><rect x="1128" y="${s(F - 330)}" width="8" height="50" rx="4" fill="#9a9cc0"/><rect x="1128" y="${s(F - 220)}" width="8" height="60" rx="4" fill="#9a9cc0"/>
    ${ill.ceiling(64, "#6a479f")}
    ${ill.pendantLamp(640, 64, 190, time)}
    ${ill.tiledFloor("#d9cdee", "#c2b2e3")}
    ${table(640)}
    <!--FRONT-->${ill.vignette(time)}<!--/FRONT-->`,
  bedroom: (
    time,
  ) => `${ill.defs(time)}${wall("bedroom", time === "day" ? "#b9a6e6" : "#4a3f86", time === "day" ? "#d9cdf2" : "#6a5aa8")}
    ${ill.windowWall(120, 360, 140, 370, 1, time === "day" ? "#b9a6e6" : "#4a3f86", time)}
    ${curtain(106, 126, 280)}${curtain(374, 126, 280, -1)}
    ${picture(640, 170, 220, 140)}
    ${ill.woodFloor(time === "day" ? "#b98a6a" : "#7a5a6a")}
    <ellipse cx="790" cy="${s(F + 40)}" rx="300" ry="34" fill="#e2559b" opacity="0.3"/>
    <ellipse cx="790" cy="${s(F + 2)}" rx="290" ry="10" fill="#000" opacity="0.18"/>
    <rect x="520" y="${s(F - 220)}" width="34" height="220" rx="10" fill="#5b3d7a"/>
    <rect x="530" y="${s(F - 112)}" width="530" height="72" rx="14" fill="#f6f1ff"/>
    <rect x="560" y="${s(F - 136)}" width="150" height="44" rx="20" fill="#ffffff"/><path d="M574 ${s(F - 126)} q60 -10 120 0" stroke="#e4daf7" stroke-width="4" fill="none"/>
    <path d="M700 ${s(F - 108)} Q880 ${s(F - 130)} 1066 ${s(F - 108)} L1066 ${s(F - 30)} L700 ${s(F - 30)} Z" fill="#7c4dd6"/>
    <path d="M716 ${s(F - 100)} Q880 ${s(F - 118)} 1050 ${s(F - 100)}" stroke="#a98ae8" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect x="530" y="${s(F - 40)}" width="22" height="40" rx="4" fill="#5b3d7a"/><rect x="1036" y="${s(F - 40)}" width="22" height="40" rx="4" fill="#5b3d7a"/>
    <rect x="1090" y="${s(F - 110)}" width="100" height="110" rx="8" fill="#c98a52"/><rect x="1102" y="${s(F - 80)}" width="76" height="30" rx="4" fill="#e8b47c"/>
    ${time !== "day" ? `<circle cx="1140" cy="${s(F - 150)}" r="110" fill="url(#ill-glow)"/>` : ""}
    <path d="M1110 ${s(F - 110)} l10 -64 h40 l10 64 z" fill="#f7d38a"/>
    ${ill.plant(440, F, 0.9, "spiky", "#7c4dd6")}
    <!--FRONT-->${ill.vignette(time)}<!--/FRONT-->`,
  shop: (time) => `${ill.defs(time)}${wall("shop", "#efe0f5", "#f7eef8")}
    ${[60, 420].map((x) => `<rect x="${s(x)}" y="140" width="320" height="${s(F - 140)}" rx="6" fill="#d9c3ec"/><rect x="${s(x)}" y="140" width="18" height="${s(F - 140)}" fill="#ffffff" opacity="0.3"/>${[230, 330, 430, 530].map((y) => `<rect x="${s(x)}" y="${s(y)}" width="320" height="12" fill="#c98a52"/><rect x="${s(x)}" y="${s(y + 12)}" width="320" height="4" fill="#000" opacity="0.1"/>`).join("")}`).join("")}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${s(80 + i * 48)}" y="188" width="36" height="42" rx="5" fill="${["#f0a53b", "#e2559b", "#7c4dd6", "#8cc23c", "#f6f1ea", "#3fb3a0"][i] ?? "#ccc"}"/><rect x="${s(84 + i * 48)}" y="192" width="8" height="34" rx="3" fill="#ffffff" opacity="0.3"/>`).join("")}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${s(80 + i * 48)}" y="290" width="36" height="40" rx="18" fill="${["#3fb3a0", "#f6f1ea", "#f0a53b", "#e2559b", "#7c4dd6", "#8cc23c"][i] ?? "#ccc"}"/>`).join("")}
    ${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${s(460 + i * 60)}" cy="312" rx="26" ry="17" fill="#e0a35b"/><path d="M${s(446 + i * 60)} 306 l8 8 M${s(462 + i * 60)} 304 l8 8" stroke="#b77a3a" stroke-width="3" stroke-linecap="round"/>`).join("")}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${s(445 + i * 50)}" y="380" width="30" height="50" rx="8" fill="#9fc3f0"/><rect x="${s(449 + i * 50)}" y="372" width="22" height="10" rx="3" fill="#5b3da0"/>`).join("")}
    ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${s(100 + i * 60)}" cy="${s(510)}" r="18" fill="${i % 2 ? "#e2559b" : "#f0a53b"}"/>`).join("")}
    ${ill.ceiling(80, "#7a4a9f")}
    ${[230, 590, 1000].map((x) => ill.pendantLamp(x, 80, 120, time)).join("")}
    ${ill.tiledFloor("#d9cdee", "#c2b2e3")}
    ${ill.plant(810, F, 1, "leafy", "#a8432c")}
    <rect x="1120" y="${s(F - 232)}" width="96" height="70" rx="10" fill="#4a3d6b"/><rect x="1132" y="${s(F - 222)}" width="72" height="28" rx="5" fill="#9fe0c0"/><rect x="1132" y="${s(F - 186)}" width="72" height="14" rx="4" fill="#6a5a8a"/>
    <!--FRONT--><rect x="880" y="${s(F - 150)}" width="360" height="150" fill="#7c5bb8"/>${[0, 1, 2].map((i) => `<rect x="${s(898 + i * 112)}" y="${s(F - 130)}" width="100" height="112" rx="8" fill="#8f6cc8"/>`).join("")}<rect x="870" y="${s(F - 162)}" width="380" height="16" rx="5" fill="#c98a52"/><rect x="870" y="${s(F - 162)}" width="380" height="5" rx="2.5" fill="#e8b47c"/>${ill.vignette(time)}<!--/FRONT-->`,
  station: (time) => `${outdoors(time, F - 30)}
    <path d="M0 96 L1280 96 L1280 132 L0 132 Z" fill="#5b3da0"/><path d="M0 132 L1280 132 L1280 144 L0 144 Z" fill="#000" opacity="0.18"/>
    <path d="M0 60 L1280 60 L1280 96 L0 96 Z" fill="#7c5bb8"/><path d="M0 60 L1280 60 L1280 68 L0 68 Z" fill="#ffffff" opacity="0.2"/>
    ${[100, 500, 900].map((x) => `<rect x="${s(x)}" y="144" width="22" height="${s(F - 144)}" fill="#6a479f"/><rect x="${s(x)}" y="144" width="6" height="${s(F - 144)}" fill="#ffffff" opacity="0.2"/>`).join("")}
    <rect x="560" y="196" width="220" height="76" rx="12" fill="#2f2640"/><circle cx="670" cy="234" r="27" fill="#fdfbff"/><path d="M670 234 v-17 M670 234 h13" stroke="#3b2566" stroke-width="4" stroke-linecap="round"/>
    <path d="M670 144 v52" stroke="#2f2640" stroke-width="4"/>
    <rect x="0" y="${s(F)}" width="1280" height="${s(60)}" fill="#c9bfe0"/><rect x="0" y="${s(F)}" width="1280" height="14" fill="#f2c94c"/>
    ${[...Array(20).keys()].map((i) => `<rect x="${s(i * 70)}" y="${s(F + 2)}" width="30" height="10" fill="#3b2f4a" opacity="0.35"/>`).join("")}
    <rect x="0" y="${s(F - 8)}" width="1280" height="8" fill="#000" opacity="0.1"/>
    <rect x="0" y="${s(F + 60)}" width="1280" height="${s(720 - F - 60)}" fill="#5c5480"/>
    <path d="M0 ${s(F + 82)} h1280 M0 ${s(F + 100)} h1280" stroke="#b9b0d6" stroke-width="5"/>
    ${[...Array(26).keys()].map((i) => `<rect x="${s(i * 50)}" y="${s(F + 76)}" width="10" height="34" fill="#7a5a4a"/>`).join("")}
    <rect x="1050" y="${s(F - 190)}" width="110" height="190" rx="12" fill="#7c4dd6"/><rect x="1050" y="${s(F - 190)}" width="16" height="190" rx="8" fill="#ffffff" opacity="0.18"/>
    <rect x="1068" y="${s(F - 170)}" width="74" height="54" rx="5" fill="#9fe0f0"/><rect x="1080" y="${s(F - 90)}" width="50" height="8" rx="3" fill="#2f2640"/>
    ${bench(200, 170)}
    ${streetLamp(1220, time)}
    <!--FRONT-->${ill.vignette(time)}<!--/FRONT-->`,
  office: (time) => `${ill.defs(time)}
    ${wall("office", "#9c86d6", "#c4b2ea")}
    ${ill.windowWall(120, 1160, 112, 556, 3, "#a993dc", time)}
    ${ill.ceiling(76)}
    ${ill.tiledFloor("#8f82c8", "#7a6db8", [300, 640, 980])}
    ${ill.sunRays(time)}
    ${[293, 640, 987].map((x) => ill.pendantLamp(x, 76, 182, time)).join("")}
    ${ill.waterCooler(52)}
    ${ill.armchair(214, "#f0a53b", 1, 0.92)}
    ${ill.plant(330, F, 0.9, "spiky", "#c2563a")}
    ${ill.desk(1010, 300, true, time)}
    ${ill.plant(1228, F, 1.25, "leafy", "#a8432c")}
    ${ill.bokeh([
      [1060, 150, 38],
      [1150, 96, 18],
      [560, 128, 26],
      [180, 240, 16],
    ])}
    <!--FRONT-->${ill.vignette(time)}<!--/FRONT-->`,
  school: (time, sign) => `${outdoors(time)}
    <rect x="300" y="190" width="700" height="${s(F - 190)}" fill="#f2b9a6"/><rect x="300" y="190" width="24" height="${s(F - 190)}" fill="#ffffff" opacity="0.18"/><rect x="976" y="190" width="24" height="${s(F - 190)}" fill="#000" opacity="0.08"/>
    <path d="M276 204 L650 86 L1024 204 Z" fill="#7c4dd6"/><path d="M276 204 L650 86 L680 96 L320 204 Z" fill="#ffffff" opacity="0.14"/>
    <circle cx="650" cy="150" r="22" fill="#fdfbff" stroke="#5b3da0" stroke-width="4"/><path d="M650 150 v-12 M650 150 h9" stroke="#3b2566" stroke-width="3" stroke-linecap="round"/>
    ${[360, 480, 820, 940].map((x) => `<rect x="${s(x - 4)}" y="296" width="88" height="108" rx="6" fill="#f6f1ff"/><rect x="${s(x)}" y="300" width="80" height="100" rx="3" fill="${time === "day" ? "#a9c8f0" : "#ffd58a"}"/><path d="M${s(x + 40)} 300 v100 M${s(x)} 350 h80" stroke="#f6f1ff" stroke-width="5"/><path d="M${s(x + 8)} 392 L${s(x + 40)} 306 L${s(x + 50)} 306 L${s(x + 18)} 392 Z" fill="#ffffff" opacity="0.3"/>`).join("")}
    ${sign ? signBoard(sign, 540, 210, 220) : ""}
    <rect x="594" y="${s(F - 176)}" width="112" height="176" rx="8" fill="#5b3da0"/><rect x="604" y="${s(F - 166)}" width="44" height="166" rx="4" fill="#6c4a8f"/><rect x="652" y="${s(F - 166)}" width="44" height="166" rx="4" fill="#6c4a8f"/>
    ${ill.plant(560, F, 0.8, "bush", "#6a479f")}${ill.plant(740, F, 0.8, "bush", "#6a479f")}
    ${tree(1140, 1)}${tree(150, 0.85)}
    ${sidewalk("#d9cfe8", false)}
    <!--FRONT-->${ill.vignette(time)}<!--/FRONT-->`,
  airport: (time) => `${ill.defs(time)}${wall("airport", "#b9a6e6", "#e2d8f5")}
    ${ill.windowWall(60, 1220, 120, 440, 4, "#b9a6e6", time)}
    <g transform="translate(560 260)"><path d="M-220 0 q20 -26 80 -26 h320 q40 0 50 26 q-10 20 -50 20 h-320 q-60 0 -80 -20 z" fill="#fdfbff"/><path d="M0 -10 l-80 -90 h40 l110 90 z M0 10 l-60 70 h40 l90 -70 z" fill="#d9d3ea"/><path d="M200 -20 l40 -60 h24 l-14 70 z" fill="#7c4dd6"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${s(-130 + i * 45)}" cy="-8" r="6" fill="#9fc3f0"/>`).join("")}</g>
    ${ill.ceiling(70, "#6a479f")}
    ${ill.tiledFloor("#cfc3ea", "#b8a8de", [360, 920])}
    ${ill.sunRays(time, [360, 920])}
    ${[160, 260, 360].map((x) => `<rect x="${s(x)}" y="${s(F - 80)}" width="86" height="18" rx="7" fill="#7c4dd6"/><rect x="${s(x)}" y="${s(F - 132)}" width="18" height="66" rx="7" fill="#7c4dd6"/><rect x="${s(x + 40)}" y="${s(F - 62)}" width="6" height="62" fill="#3b2f5c"/>`).join("")}
    ${ill.plant(1180, F, 1.1, "leafy", "#a8432c")}
    <!--FRONT-->${ill.vignette(time)}<!--/FRONT-->`,
};

/**
 * The place, split into what is behind the characters and what is in front of them (a counter a
 * barista stands behind). Foreground parts are marked <!--FRONT-->…<!--/FRONT--> in the drawings.
 */
export function environmentSvg(
  environment: Environment,
  time: TimeOfDay = "day",
  sign?: string,
): { back: string; front: string } {
  const all = ENVIRONMENTS[environment](time, sign);
  const front: string[] = [];
  const back = all.replace(/<!--FRONT-->([\s\S]*?)<!--\/FRONT-->/g, (_m, part: string) => {
    front.push(part);
    return "";
  });
  return { back, front: front.join("") };
}
