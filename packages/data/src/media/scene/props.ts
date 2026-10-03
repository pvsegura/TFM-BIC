/**
 * Props for educational scenes (M22): objects that carry meaning — the cup that is handed over, the
 * house someone points at, the apples that are counted. Filled illustrations in the scene style,
 * drawn around (0, 0) = the prop's base centre so they sit on a table, a counter or the floor.
 * Language-independent: plans refer to them by key.
 */

const P: Record<string, string> = {
  cup: `<path d="M-22 -40 h44 l-6 40 h-32 z" fill="#f7f3ec" stroke="#1d2a3f" stroke-width="2"/><path d="M22 -32 q16 2 10 16 q-4 8 -14 6" fill="none" stroke="#1d2a3f" stroke-width="3"/><ellipse cx="0" cy="-40" rx="22" ry="5" fill="#6b3f26"/><path d="M-6 -52 q6 -10 0 -18 M6 -52 q6 -10 0 -18" stroke="#b8a99a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  "milk-jug": `<path d="M-16 -50 h32 l4 50 h-40 z" fill="#e4e8ec" stroke="#1d2a3f" stroke-width="2"/><path d="M-16 -50 l-8 -6 h12" fill="#e4e8ec" stroke="#1d2a3f" stroke-width="2"/>`,
  sugar: `<path d="M-22 -26 q22 -10 44 0 l-4 26 h-36 z" fill="#f2efe9" stroke="#1d2a3f" stroke-width="2"/><ellipse cx="0" cy="-27" rx="22" ry="6" fill="#ffffff" stroke="#1d2a3f" stroke-width="2"/>`,
  cake: `<path d="M-30 0 v-30 l40 -14 l20 14 v30 z" fill="#f2d9b8" stroke="#1d2a3f" stroke-width="2"/><path d="M-30 -30 l40 -14 l20 14" fill="#e57a5a"/><circle cx="2" cy="-48" r="5" fill="#c0392b"/>`,
  house: `<path d="M-90 0 v-110 l90 -70 l90 70 v110 z" fill="#f2d9b8" stroke="#1d2a3f" stroke-width="3"/><path d="M-104 -104 l104 -86 l104 86" fill="none" stroke="#a85a42" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><rect x="-24" y="-70" width="48" height="70" rx="4" fill="#6b4530"/><rect x="38" y="-96" width="36" height="34" fill="#bfdfee" stroke="#f7f3ec" stroke-width="4"/><rect x="-74" y="-96" width="36" height="34" fill="#bfdfee" stroke="#f7f3ec" stroke-width="4"/>`,
  "house-small": `<g transform="scale(0.7)"><path d="M-90 0 v-110 l90 -70 l90 70 v110 z" fill="#d9e6c8" stroke="#1d2a3f" stroke-width="3"/><path d="M-104 -104 l104 -86 l104 86" fill="none" stroke="#6a8f4e" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><rect x="-24" y="-70" width="48" height="70" rx="4" fill="#6b4530"/></g>`,
  cat: `<g><path d="M-40 0 q-6 -40 30 -44 q34 -2 40 30 q2 14 -6 14 z" fill="#8a8f99"/><circle cx="34" cy="-50" r="22" fill="#8a8f99"/><path d="M18 -66 l4 -20 l12 14 z M38 -70 l10 -18 l6 20 z" fill="#8a8f99"/><path d="M-40 -6 q-34 -10 -26 -44" stroke="#8a8f99" stroke-width="9" fill="none" stroke-linecap="round" class="tail"/><ellipse class="eye" cx="30" cy="-52" rx="3" ry="4" fill="#1d2a3f"/><ellipse class="eye" cx="44" cy="-52" rx="3" ry="4" fill="#1d2a3f"/><path d="M36 -44 l-3 3 h6 z" fill="#e98b7a"/></g>`,
  dog: `<g><path d="M-56 0 v-26 q0 -24 30 -26 h50 q26 0 26 24 v28 h-14 v-22 h-62 v22 z" fill="#c58a3a"/><circle cx="40" cy="-62" r="26" fill="#c58a3a"/><path d="M22 -78 q-18 4 -16 30 q12 -4 16 -14 z" fill="#8a5a2a"/><ellipse class="eye" cx="44" cy="-66" rx="3.4" ry="4.4" fill="#1d2a3f"/><circle cx="64" cy="-56" r="5" fill="#1d2a3f"/><path d="M-56 -40 q-24 -16 -18 -34" stroke="#c58a3a" stroke-width="9" fill="none" stroke-linecap="round" class="tail"/></g>`,
  book: `<path d="M-36 0 v-50 h66 q8 0 8 8 v42 z" fill="#c0563b"/><rect x="-36" y="-50" width="10" height="50" fill="#8e3b27"/><rect x="-24" y="-8" width="60" height="6" fill="#f7f3ec"/>`,
  briefcase: `<rect x="-40" y="-56" width="80" height="56" rx="8" fill="#6b4530"/><path d="M-14 -56 v-12 h28 v12" fill="none" stroke="#4b3020" stroke-width="6"/><rect x="-6" y="-34" width="12" height="10" rx="2" fill="#e2c27a"/>`,
  bread: `<path d="M-46 0 q-6 -40 46 -42 q52 2 46 42 z" fill="#d49a52"/><path d="M-20 -30 l8 14 M0 -34 l8 14 M20 -30 l8 14" stroke="#a46a2a" stroke-width="4" stroke-linecap="round"/>`,
  water: `<path d="M-18 0 v-70 q0 -10 8 -14 v-14 h20 v14 q8 4 8 14 v70 z" fill="#9fd3e8" stroke="#1d2a3f" stroke-width="2"/><rect x="-12" y="-104" width="24" height="10" rx="2" fill="#3d5a80"/><rect x="-18" y="-50" width="36" height="20" fill="#3d5a80" opacity="0.6"/>`,
  milk: `<path d="M-24 0 v-74 l12 -16 h24 l12 16 v74 z" fill="#f7f7f7" stroke="#1d2a3f" stroke-width="2"/><path d="M-24 -74 h48" stroke="#1d2a3f" stroke-width="2"/><rect x="-24" y="-50" width="48" height="26" fill="#5b7fa0"/>`,
  apple: `<path d="M0 -40 q-26 -12 -30 14 q-2 26 30 26 q32 0 30 -26 q-4 -26 -30 -14 z" fill="#c0392b"/><path d="M0 -40 q0 -12 6 -18" stroke="#5b3a26" stroke-width="3" fill="none"/><path d="M6 -50 q14 -8 20 2 q-12 6 -20 -2 z" fill="#6a8f4e"/>`,
  cheese: `<path d="M-44 0 v-30 l70 -26 q16 10 18 26 v30 z" fill="#f2c94c" stroke="#c9a12e" stroke-width="2"/><circle cx="-18" cy="-14" r="6" fill="#d9ad2e"/><circle cx="18" cy="-20" r="8" fill="#d9ad2e"/>`,
  ticket: `<path d="M-50 0 v-40 h100 v40 z" fill="#f2d9b8" stroke="#1d2a3f" stroke-width="2"/><path d="M20 -40 v40" stroke="#1d2a3f" stroke-width="2" stroke-dasharray="4 4"/><rect x="-40" y="-30" width="50" height="8" rx="2" fill="#3d5a80"/><rect x="-40" y="-16" width="34" height="6" rx="2" fill="#9aa4ad"/>`,
  suitcase: `<rect x="-40" y="-90" width="80" height="90" rx="10" fill="#3d5a80"/><path d="M-14 -90 v-14 h28 v14" fill="none" stroke="#1d2a3f" stroke-width="5"/><path d="M-20 -86 v80 M20 -86 v80" stroke="#2c4462" stroke-width="5"/><circle cx="-26" cy="4" r="6" fill="#1d2a3f"/><circle cx="26" cy="4" r="6" fill="#1d2a3f"/>`,
  train: `<path d="M-300 0 v-150 q0 -40 40 -40 h520 q40 0 40 40 v150 z" fill="#c0563b"/><rect x="-280" y="-160" width="560" height="60" rx="8" fill="#bfdfee"/>${[-250, -150, -50, 50, 150].map((x) => `<path d="M${String(x)} -160 v60" stroke="#c0563b" stroke-width="8"/>`).join("")}<rect x="-300" y="-40" width="600" height="14" fill="#f2efe9"/>${[-220, -120, 120, 220].map((x) => `<circle cx="${String(x)}" cy="2" r="14" fill="#1d2a3f"/>`).join("")}`,
  plane: `<g transform="scale(0.6)"><path d="M-160 0 q20 -26 80 -26 h200 q40 0 50 26 q-10 20 -50 20 h-200 q-60 0 -80 -20 z" fill="#f7f7f7" stroke="#9aa4ad" stroke-width="3"/><path d="M0 -10 l-60 -80 h34 l90 80 z" fill="#d9dee3"/><path d="M150 -20 l34 -50 h20 l-12 60 z" fill="#c0563b"/></g>`,
  clock: `<circle cx="0" cy="-40" r="40" fill="#f7f3ec" stroke="#1d2a3f" stroke-width="6"/><path d="M0 -40 v-26 M0 -40 h18" stroke="#1d2a3f" stroke-width="5" stroke-linecap="round"/>`,
  "flag-pl": `<rect x="-2" y="-140" width="5" height="140" fill="#5d6470"/><rect x="3" y="-140" width="90" height="30" fill="#ffffff" stroke="#c9c9c9"/><rect x="3" y="-110" width="90" height="30" fill="#dc143c"/>`,
  "flag-es": `<rect x="-2" y="-140" width="5" height="140" fill="#5d6470"/><rect x="3" y="-140" width="90" height="15" fill="#aa151b"/><rect x="3" y="-125" width="90" height="30" fill="#f1bf00"/><rect x="3" y="-95" width="90" height="15" fill="#aa151b"/>`,
  "flag-en": `<rect x="-2" y="-140" width="5" height="140" fill="#5d6470"/><rect x="3" y="-140" width="90" height="60" fill="#ffffff" stroke="#c9c9c9"/><rect x="41" y="-140" width="14" height="60" fill="#ce1124"/><rect x="3" y="-117" width="90" height="14" fill="#ce1124"/>`,
  sheep: `<g><path d="M-20 0 v-22 M14 0 v-22" stroke="#2b2b2b" stroke-width="7" stroke-linecap="round"/><circle cx="-30" cy="-40" r="20" fill="#f4f1ea" stroke="#c9c3b6" stroke-width="2"/><circle cx="-6" cy="-50" r="22" fill="#f4f1ea" stroke="#c9c3b6" stroke-width="2"/><circle cx="18" cy="-42" r="20" fill="#f4f1ea" stroke="#c9c3b6" stroke-width="2"/><circle cx="-10" cy="-30" r="20" fill="#f4f1ea"/><ellipse cx="42" cy="-52" rx="14" ry="11" fill="#2b2b2b"/><circle cx="46" cy="-55" r="2.4" fill="#ffffff"/></g>`,
  ship: `<g><path d="M-80 -30 h160 l-24 30 h-112 z" fill="#3d5a80" stroke="#1d2a3f" stroke-width="2"/><rect x="-40" y="-60" width="60" height="30" fill="#f7f3ec" stroke="#1d2a3f" stroke-width="2"/><rect x="-30" y="-52" width="10" height="10" fill="#9fd3e8"/><rect x="-10" y="-52" width="10" height="10" fill="#9fd3e8"/><rect x="26" y="-82" width="14" height="52" fill="#c0563b"/><path d="M-90 4 q15 -8 30 0 t30 0 t30 0 t30 0 t30 0 t30 0" fill="none" stroke="#5aa9c9" stroke-width="4"/></g>`,
  "sleep-z": `<text x="0" y="0" font-family="Bricolage" font-weight="800" font-size="34" fill="#3d5a80">z</text><text x="18" y="-24" font-family="Bricolage" font-weight="800" font-size="26" fill="#3d5a80">z</text>`,
};

/** A single counted unit for number props: apples on a table, one by one. */
export function countedProp(unit: string, count: number): string {
  const inner = P[unit];
  if (!inner) throw new Error(`Unknown prop "${unit}".`);
  const gap = 70;
  const start = -((count - 1) * gap) / 2;
  return Array.from(
    { length: count },
    (_, i) =>
      `<g class="unit" data-n="${String(i + 1)}" transform="translate(${String(start + i * gap)} 0)">${inner}</g>`,
  ).join("");
}

export function propSvg(type: string): string {
  const svg = P[type];
  if (svg === undefined) throw new Error(`Unknown prop "${type}".`);
  return svg;
}

export function hasProp(type: string): boolean {
  return type in P;
}
