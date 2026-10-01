import type { Environment, TimeOfDay } from "@tfm-bic/domain";

/**
 * Places for educational scenes (M22, ADR-032): simple, readable illustrations that establish the
 * situation — a café has a counter, cups, a coffee machine and tables; a station has a platform and a
 * train sign. Flat shapes in the site's palette, no text except an optional validated sign. The
 * floor line is y = 610 on a 1280×720 stage; characters stand on it.
 */

export const FLOOR_Y = 610;
const INK = "#1d2a3f";

function sky(time: TimeOfDay): string {
  switch (time) {
    case "day":
      return `<rect width="1280" height="720" fill="#cfe6f2"/><circle cx="1090" cy="120" r="46" fill="#ffd36b"/>`;
    case "evening":
      return `<defs><linearGradient id="sky-ev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b3f72"/><stop offset="0.6" stop-color="#e98a5c"/><stop offset="1" stop-color="#f6c27a"/></linearGradient></defs>
        <rect width="1280" height="720" fill="url(#sky-ev)"/><circle cx="1050" cy="300" r="40" fill="#ffb15c" opacity="0.9"/>`;
    case "night":
      return `<rect width="1280" height="720" fill="#1c2747"/>
        <g fill="#f7f1d7">${[
          [120, 80],
          [260, 140],
          [420, 60],
          [640, 110],
          [820, 70],
          [980, 150],
          [1180, 90],
          [560, 170],
        ]
          .map(([x, y]) => `<circle cx="${String(x)}" cy="${String(y)}" r="2.4"/>`)
          .join("")}</g>
        <path d="M1110 70 a44 44 0 1 0 40 66 a36 36 0 1 1 -40 -66 z" fill="#f4e7b0"/>`;
  }
}

function windowPane(x: number, y: number, w: number, h: number, time: TimeOfDay): string {
  const glass = time === "day" ? "#bfdfee" : time === "evening" ? "#f2b27a" : "#26345c";
  return `<rect x="${String(x)}" y="${String(y)}" width="${String(w)}" height="${String(h)}" rx="6" fill="${glass}" stroke="#f7f3ec" stroke-width="10"/>
    <path d="M${String(x + w / 2)} ${String(y)} v${String(h)} M${String(x)} ${String(y + h / 2)} h${String(w)}" stroke="#f7f3ec" stroke-width="6"/>`;
}

function building(x: number, w: number, h: number, color: string, time: TimeOfDay): string {
  const lit = time !== "day";
  const wins: string[] = [];
  for (let row = 0; row < Math.floor((h - 60) / 70); row += 1) {
    for (let col = 0; col < Math.floor(w / 70); col += 1) {
      const on = lit && (row + col) % 3 !== 0;
      wins.push(
        `<rect x="${String(x + 22 + col * 70)}" y="${String(FLOOR_Y - 70 - h + 40 + row * 70)}" width="34" height="42" rx="3" fill="${on ? "#ffd98a" : time === "day" ? "#a9cde0" : "#2f3c62"}"/>`,
      );
    }
  }
  return `<rect x="${String(x)}" y="${String(FLOOR_Y - 70 - h)}" width="${String(w)}" height="${String(h)}" fill="${color}"/>${wins.join("")}`;
}

function streetLamp(x: number, time: TimeOfDay): string {
  const on = time !== "day";
  return `<rect x="${String(x - 4)}" y="${String(FLOOR_Y - 250)}" width="8" height="250" fill="#3a4357"/>
    <path d="M${String(x - 22)} ${String(FLOOR_Y - 250)} h44 l-8 -22 h-28 z" fill="#3a4357"/>
    ${on ? `<circle cx="${String(x)}" cy="${String(FLOOR_Y - 240)}" r="60" fill="#ffe7a3" opacity="0.25"/><circle cx="${String(x)}" cy="${String(FLOOR_Y - 246)}" r="9" fill="#ffe08a"/>` : ""}`;
}

function signBoard(text: string, x: number, y: number, w: number): string {
  return `<rect x="${String(x)}" y="${String(y)}" width="${String(w)}" height="54" rx="8" fill="#f7f3ec" stroke="${INK}" stroke-width="3"/>
    <text x="${String(x + w / 2)}" y="${String(y + 38)}" text-anchor="middle" font-family="Bricolage" font-weight="800" font-size="30" fill="${INK}" letter-spacing="2">${text}</text>`;
}

function floor(color: string, top = FLOOR_Y): string {
  return `<rect x="0" y="${String(top)}" width="1280" height="${String(720 - top)}" fill="${color}"/>`;
}

function table(x: number): string {
  return `<rect x="${String(x - 70)}" y="${String(FLOOR_Y - 120)}" width="140" height="14" rx="4" fill="#8a5a3c"/>
    <rect x="${String(x - 6)}" y="${String(FLOOR_Y - 108)}" width="12" height="108" fill="#6b4530"/>
    <rect x="${String(x - 40)}" y="${String(FLOOR_Y - 6)}" width="80" height="6" rx="3" fill="#6b4530"/>`;
}

function chair(x: number, flip = 1): string {
  const back = x + flip * 34;
  return `<rect x="${String(back - 5)}" y="${String(FLOOR_Y - 150)}" width="10" height="150" rx="4" fill="#5c4033"/>
    <rect x="${String(Math.min(x, back) - 6)}" y="${String(FLOOR_Y - 76)}" width="46" height="10" rx="3" fill="#7b5641"/>
    <rect x="${String(x - 2)}" y="${String(FLOOR_Y - 70)}" width="6" height="70" fill="#5c4033"/>`;
}

const ENVIRONMENTS: Record<Environment, (time: TimeOfDay, sign?: string) => string> = {
  street: (time, sign) => `${sky(time)}
    ${building(-20, 300, 330, "#c9a27e", time)}${building(300, 260, 400, "#9fb4c7", time)}
    ${building(580, 330, 300, "#d8b9a0", time)}${building(930, 380, 360, "#a7b59b", time)}
    ${sign ? signBoard(sign, 640, 300, 220) : ""}
    <rect x="690" y="${String(FLOOR_Y - 140)}" width="90" height="140" rx="6" fill="#6b4530"/><circle cx="765" cy="${String(FLOOR_Y - 70)}" r="5" fill="#e2c27a"/>
    ${streetLamp(200, time)}${streetLamp(1120, time)}
    ${floor("#c9c3b8")}<rect x="0" y="${String(FLOOR_Y + 40)}" width="1280" height="70" fill="#5d6470"/>
    <path d="M0 ${String(FLOOR_Y + 76)} h1280" stroke="#e8e2d4" stroke-width="5" stroke-dasharray="44 34"/>`,
  suburb: (time) => `${sky(time)}
    <path d="M0 470 Q300 430 640 455 Q980 480 1280 440 V720 H0 Z" fill="#b9d6a3"/>
    ${[110, 1180].map((x) => `<rect x="${String(x - 10)}" y="${String(FLOOR_Y - 200)}" width="20" height="200" fill="#7a5638"/><circle cx="${String(x)}" cy="${String(FLOOR_Y - 240)}" r="80" fill="#6fa36b"/><circle cx="${String(x + 44)}" cy="${String(FLOOR_Y - 200)}" r="52" fill="#5f9460"/>`).join("")}
    <rect x="0" y="${String(FLOOR_Y - 48)}" width="1280" height="48" fill="#7fae6e"/>
    ${floor("#cdbf9f")}<rect x="0" y="${String(FLOOR_Y + 50)}" width="1280" height="60" fill="#5d6470"/>
    ${time !== "day" ? streetLamp(300, time) : ""}`,
  park: (time) => `${sky(time)}
    <path d="M0 520 Q320 440 640 500 Q960 560 1280 470 V720 H0 Z" fill="#9cc58a"/>
    ${[160, 420, 1050].map((x) => `<rect x="${String(x - 10)}" y="${String(FLOOR_Y - 230)}" width="20" height="230" fill="#7a5638"/><circle cx="${String(x)}" cy="${String(FLOOR_Y - 270)}" r="90" fill="#6fa36b"/><circle cx="${String(x - 50)}" cy="${String(FLOOR_Y - 230)}" r="60" fill="#5f9460"/>`).join("")}
    ${floor("#a8cf92")}<path d="M300 720 Q600 640 980 610 L1080 610 Q760 660 520 720 Z" fill="#e3d6b7"/>
    <rect x="820" y="${String(FLOOR_Y - 70)}" width="190" height="14" rx="4" fill="#7b5641"/><rect x="820" y="${String(FLOOR_Y - 110)}" width="190" height="12" rx="4" fill="#7b5641"/>
    <rect x="836" y="${String(FLOOR_Y - 58)}" width="10" height="58" fill="#4b3a2e"/><rect x="984" y="${String(FLOOR_Y - 58)}" width="10" height="58" fill="#4b3a2e"/>`,
  cafe: (time) => `<rect width="1280" height="720" fill="#f2e3cf"/>
    <rect x="0" y="0" width="1280" height="90" fill="#e6cfb2"/>
    ${windowPane(70, 150, 300, 250, time)}
    <rect x="460" y="130" width="250" height="170" rx="10" fill="#2f3b2f"/>
    <g stroke="#f2ead8" stroke-width="3" fill="none"><path d="M500 180 h40 a10 10 0 0 1 -10 22 h-20 z M540 186 q12 2 8 12"/><path d="M500 245 q20 -22 40 0 z"/><path d="M600 170 h60 M600 200 h70 M600 240 h60 M600 268 h50" stroke-linecap="round"/></g>
    ${[540, 760].map((x) => `<path d="M${String(x)} 0 v60" stroke="#3a3a3a" stroke-width="2"/><path d="M${String(x - 26)} 82 q26 -36 52 0 z" fill="#3d5a80"/><circle cx="${String(x)}" cy="86" r="8" fill="#ffe08a"/>`).join("")}
    ${floor("#b98a62")}
    <!--FRONT-->
    <rect x="830" y="${String(FLOOR_Y - 200)}" width="460" height="200" fill="#7a4e33"/>
    <rect x="815" y="${String(FLOOR_Y - 212)}" width="480" height="18" rx="4" fill="#5b3a26"/>
    <!--/FRONT-->
    <rect x="1080" y="${String(FLOOR_Y - 330)}" width="130" height="118" rx="12" fill="#56606b"/>
    <rect x="1098" y="${String(FLOOR_Y - 310)}" width="94" height="40" rx="6" fill="#2f363e"/><circle cx="1145" cy="${String(FLOOR_Y - 248)}" r="10" fill="#c9d1d9"/>
    <path d="M1130 ${String(FLOOR_Y - 236)} v14 M1160 ${String(FLOOR_Y - 236)} v14" stroke="#2f363e" stroke-width="6"/>
    <rect x="880" y="${String(FLOOR_Y - 250)}" width="70" height="38" rx="6" fill="#d9c7a8"/>
    ${table(300)}${chair(220, -1)}${chair(380)}`,
  home: (time) => `<rect width="1280" height="720" fill="#e9e0d3"/>
    ${windowPane(840, 150, 280, 230, time)}
    <rect x="80" y="170" width="200" height="140" rx="6" fill="#f7f3ec" stroke="#7a5a44" stroke-width="10"/><path d="M110 280 l50 -60 l40 40 l30 -30 l40 50 z" fill="#9cc58a"/>
    <rect x="360" y="140" width="190" height="14" fill="#8a5a3c"/>${["#c0563b", "#3d5a80", "#e2a33b", "#6a8f4e"].map((c, i) => `<rect x="${String(372 + i * 26)}" y="96" width="22" height="44" fill="${c}"/>`).join("")}
    ${floor("#c4a483")}<ellipse cx="560" cy="${String(FLOOR_Y + 40)}" rx="320" ry="40" fill="#b07d64" opacity="0.6"/>
    <rect x="360" y="${String(FLOOR_Y - 150)}" width="330" height="110" rx="26" fill="#6a8fb0"/><rect x="340" y="${String(FLOOR_Y - 200)}" width="370" height="80" rx="30" fill="#5b7fa0"/>
    <rect x="370" y="${String(FLOOR_Y - 40)}" width="14" height="40" fill="#3a2f2a"/><rect x="666" y="${String(FLOOR_Y - 40)}" width="14" height="40" fill="#3a2f2a"/>
    <rect x="760" y="${String(FLOOR_Y - 230)}" width="8" height="230" fill="#3a3a3a"/><path d="M730 ${String(FLOOR_Y - 230)} h68 l-14 -48 h-40 z" fill="#f2c96b"/>`,
  kitchen: (time) => `<rect width="1280" height="720" fill="#e7ece4"/>
    ${windowPane(520, 130, 260, 200, time)}
    <rect x="0" y="${String(FLOOR_Y - 200)}" width="1280" height="200" fill="#dfe6dc"/>
    <rect x="0" y="${String(FLOOR_Y - 220)}" width="1280" height="22" fill="#9a7b5f"/>
    ${[60, 260, 860, 1060].map((x) => `<rect x="${String(x)}" y="${String(FLOOR_Y - 190)}" width="180" height="180" rx="6" fill="#b8c9b0" stroke="#9fb39a" stroke-width="4"/><rect x="${String(x + 80)}" y="${String(FLOOR_Y - 120)}" width="20" height="6" rx="3" fill="#6b6b6b"/>`).join("")}
    <rect x="1120" y="${String(FLOOR_Y - 380)}" width="140" height="380" rx="10" fill="#f4f6f7" stroke="#c8d0d4" stroke-width="4"/>
    ${floor("#c9b79c")}${table(640)}`,
  bedroom: (time) => `<rect width="1280" height="720" fill="#d9d4e8"/>
    ${windowPane(120, 140, 240, 220, time)}
    ${floor("#a9927a")}
    <rect x="520" y="${String(FLOOR_Y - 190)}" width="30" height="190" rx="8" fill="#6b4a3a"/>
    <rect x="530" y="${String(FLOOR_Y - 110)}" width="520" height="70" rx="12" fill="#f4efe6"/><rect x="560" y="${String(FLOOR_Y - 120)}" width="140" height="40" rx="18" fill="#ffffff"/>
    <rect x="700" y="${String(FLOOR_Y - 104)}" width="360" height="74" rx="14" fill="#7a8fc7"/>
    <rect x="530" y="${String(FLOOR_Y - 40)}" width="20" height="40" fill="#6b4a3a"/><rect x="1030" y="${String(FLOOR_Y - 40)}" width="20" height="40" fill="#6b4a3a"/>
    <rect x="1090" y="${String(FLOOR_Y - 100)}" width="90" height="100" rx="6" fill="#8a6a54"/><path d="M1110 ${String(FLOOR_Y - 100)} l10 -60 h30 l10 60 z" fill="#f2c96b"/>`,
  shop: () => `<rect width="1280" height="720" fill="#efe9de"/>
    ${[60, 420].map((x) => `<rect x="${String(x)}" y="150" width="320" height="${String(FLOOR_Y - 150)}" fill="#d7c3a5"/>${[230, 330, 430].map((y) => `<rect x="${String(x)}" y="${String(y)}" width="320" height="12" fill="#a3825f"/>`).join("")}`).join("")}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${String(80 + i * 48)}" y="190" width="36" height="40" rx="4" fill="${["#e2a33b", "#c0563b", "#3d5a80", "#6a8f4e", "#f2efe9", "#e57a5a"][i] ?? "#ccc"}"/>`).join("")}
    ${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${String(460 + i * 60)}" cy="312" rx="26" ry="16" fill="#d9a35b"/>`).join("")}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${String(445 + i * 50)}" y="380" width="30" height="50" rx="6" fill="#8fc3d9"/>`).join("")}
    ${floor("#d1c6b5")}
    <!--FRONT--><rect x="880" y="${String(FLOOR_Y - 150)}" width="360" height="150" fill="#5b7fa0"/><rect x="870" y="${String(FLOOR_Y - 162)}" width="380" height="16" rx="4" fill="#3f5f7c"/><!--/FRONT-->
    <rect x="1120" y="${String(FLOOR_Y - 230)}" width="90" height="68" rx="8" fill="#3a4357"/><rect x="1132" y="${String(FLOOR_Y - 222)}" width="66" height="26" rx="4" fill="#9fd3b0"/>`,
  station: (time) => `${sky(time)}
    <rect x="0" y="120" width="1280" height="40" fill="#5d6470"/>${[100, 500, 900].map((x) => `<rect x="${String(x)}" y="160" width="16" height="${String(FLOOR_Y - 160)}" fill="#5d6470"/>`).join("")}
    <rect x="560" y="200" width="220" height="70" rx="8" fill="#1f2a3a"/><circle cx="670" cy="235" r="26" fill="#f7f3ec"/><path d="M670 235 v-16 M670 235 h12" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    ${floor("#b7b1a6")}<rect x="0" y="${String(FLOOR_Y)}" width="1280" height="14" fill="#f2c94c"/>
    <rect x="0" y="${String(FLOOR_Y + 60)}" width="1280" height="60" fill="#6e6a64"/>
    <rect x="1050" y="${String(FLOOR_Y - 190)}" width="110" height="190" rx="10" fill="#3d5a80"/><rect x="1068" y="${String(FLOOR_Y - 170)}" width="74" height="54" rx="4" fill="#9fd3e0"/><rect x="1080" y="${String(FLOOR_Y - 90)}" width="50" height="8" rx="3" fill="#1f2a3a"/>`,
  office: (time) => `<rect width="1280" height="720" fill="#e4e8ec"/>
    ${windowPane(80, 140, 360, 240, time)}
    ${floor("#a9b2bb")}
    <rect x="620" y="${String(FLOOR_Y - 150)}" width="380" height="16" rx="4" fill="#8a6a54"/><rect x="640" y="${String(FLOOR_Y - 134)}" width="12" height="134" fill="#6b5240"/><rect x="968" y="${String(FLOOR_Y - 134)}" width="12" height="134" fill="#6b5240"/>
    <rect x="740" y="${String(FLOOR_Y - 280)}" width="170" height="110" rx="8" fill="#2b3340"/><rect x="752" y="${String(FLOOR_Y - 270)}" width="146" height="88" rx="4" fill="#7fb2d6"/><rect x="815" y="${String(FLOOR_Y - 170)}" width="20" height="20" fill="#2b3340"/>
    <rect x="1080" y="${String(FLOOR_Y - 220)}" width="130" height="220" rx="6" fill="#b4bcc5"/><path d="M1080 ${String(FLOOR_Y - 150)} h130 M1080 ${String(FLOOR_Y - 80)} h130" stroke="#8d96a0" stroke-width="4"/>`,
  school: (time, sign) => `${sky(time)}
    <rect x="300" y="190" width="700" height="${String(FLOOR_Y - 190)}" fill="#d8a882"/><path d="M280 200 L650 90 L1020 200 Z" fill="#a85a42"/>
    ${[360, 480, 820, 940].map((x) => `<rect x="${String(x)}" y="300" width="80" height="100" rx="4" fill="${time === "day" ? "#bfdfee" : "#ffd98a"}" stroke="#f7f3ec" stroke-width="6"/>`).join("")}
    ${sign ? signBoard(sign, 540, 210, 220) : ""}
    <rect x="600" y="${String(FLOOR_Y - 170)}" width="100" height="170" rx="6" fill="#6b4530"/>
    ${floor("#c9c3b8")}<rect x="560" y="${String(FLOOR_Y - 8)}" width="180" height="8" fill="#a39b8d"/>
    <rect x="1120" y="${String(FLOOR_Y - 200)}" width="18" height="200" fill="#7a5638"/><circle cx="1129" cy="${String(FLOOR_Y - 240)}" r="80" fill="#6fa36b"/>`,
  airport: (time) => `<rect width="1280" height="720" fill="#e8ecef"/>
    <rect x="60" y="120" width="1160" height="320" rx="12" fill="${time === "day" ? "#bcdcef" : "#2a3760"}"/>
    <path d="M140 400 h1000" stroke="#9aa4ad" stroke-width="6"/>
    <g transform="translate(560 270)"><path d="M-220 0 q20 -26 80 -26 h320 q40 0 50 26 q-10 20 -50 20 h-320 q-60 0 -80 -20 z" fill="#f7f7f7"/><path d="M0 -10 l-80 -90 h40 l110 90 z M0 10 l-60 70 h40 l90 -70 z" fill="#d9dee3"/><path d="M200 -20 l40 -60 h24 l-14 70 z" fill="#c0563b"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${String(-130 + i * 45)}" cy="-8" r="6" fill="#7fb2d6"/>`).join("")}</g>
    ${[120, 360, 600].map((x) => `<path d="M120 120 V440" stroke="#d7dde2" stroke-width="10" transform="translate(${String(x)} 0)"/>`).join("")}
    ${floor("#c5ccd2")}${[160, 260, 360].map((x) => `<rect x="${String(x)}" y="${String(FLOOR_Y - 80)}" width="86" height="16" rx="6" fill="#3d5a80"/><rect x="${String(x)}" y="${String(FLOOR_Y - 130)}" width="16" height="64" rx="6" fill="#3d5a80"/>`).join("")}`,
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
