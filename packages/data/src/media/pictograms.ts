/**
 * Line pictograms for vocabulary videos (M21). Language-independent: content maps a word id to a
 * key (`content/languages/<lang>/media/plan.json` → `vocabularyPictograms`), the renderer owns the
 * drawings. Paths use a 120×120 box, drawn with the stroke colour so the video's GSAP timeline can
 * "draw" them (stroke-dashoffset). Elements marked `data-accent` are filled with the accent colour
 * after the drawing completes. Original drawings, made for this project.
 */
const P: Record<string, string> = {
  house: `
    <path d="M18 58 L60 22 L102 58"/>
    <path d="M28 50 V100 H92 V50"/>
    <path d="M52 100 V74 H68 V100"/>
    <rect data-accent x="72" y="58" width="12" height="12"/>`,
  cat: `
    <path d="M34 54 L30 26 L48 42 Q60 38 72 42 L90 26 L86 54"/>
    <path d="M34 54 Q30 84 60 88 Q90 84 86 54"/>
    <circle data-accent cx="48" cy="60" r="4"/><circle data-accent cx="72" cy="60" r="4"/>
    <path d="M56 70 L60 74 L64 70"/>
    <path d="M40 72 L18 68 M40 78 L20 82 M80 72 L102 68 M80 78 L100 82"/>`,
  dog: `
    <path d="M36 40 Q24 36 20 58 Q22 70 34 64"/>
    <path d="M84 40 Q96 36 100 58 Q98 70 86 64"/>
    <path d="M36 40 Q60 26 84 40 Q92 70 60 92 Q28 70 36 40"/>
    <circle data-accent cx="48" cy="56" r="4"/><circle data-accent cx="72" cy="56" r="4"/>
    <path d="M52 72 Q60 80 68 72"/><path d="M56 66 H64"/>`,
  book: `
    <path d="M60 32 Q40 22 18 28 V92 Q40 86 60 96 Q80 86 102 92 V28 Q80 22 60 32 Z"/>
    <path d="M60 32 V96"/>
    <path d="M28 44 Q40 40 50 46 M28 58 Q40 54 50 60 M70 46 Q80 40 92 44 M70 60 Q80 54 92 58"/>`,
  briefcase: `
    <rect x="18" y="40" width="84" height="56" rx="6"/>
    <path d="M44 40 V30 H76 V40"/>
    <path d="M18 62 H102"/>
    <rect data-accent x="54" y="56" width="12" height="12"/>`,
  family: `
    <circle cx="38" cy="36" r="10"/><path d="M22 90 V66 Q22 52 38 52 Q54 52 54 66 V90"/>
    <circle cx="82" cy="36" r="10"/><path d="M66 90 V66 Q66 52 82 52 Q98 52 98 66 V90"/>
    <circle data-accent cx="60" cy="64" r="7"/><path d="M50 98 V86 Q50 76 60 76 Q70 76 70 86 V98"/>`,
  bread: `
    <path d="M22 60 Q16 36 40 34 Q60 22 80 34 Q104 36 98 60 V92 H22 Z"/>
    <path d="M42 50 L50 66 M58 46 L66 62 M74 50 L80 62"/>`,
  water: `
    <path d="M34 26 H86 L78 98 H42 Z"/>
    <path data-accent d="M38 56 Q50 50 60 56 Q70 62 82 56 L78 94 H42 Z"/>`,
  milk: `
    <path d="M40 34 L48 20 H72 L80 34 V100 H40 Z"/>
    <path d="M40 34 H80"/>
    <path data-accent d="M50 58 Q60 50 70 58 Q72 72 60 76 Q48 72 50 58 Z"/>`,
  apple: `
    <path d="M60 38 Q40 26 26 42 Q14 62 30 86 Q44 104 60 92 Q76 104 90 86 Q106 62 94 42 Q80 26 60 38 Z"/>
    <path d="M60 38 Q60 26 66 18"/>
    <path data-accent d="M66 28 Q78 18 88 24 Q80 36 66 28 Z"/>`,
  cheese: `
    <path d="M16 78 L86 36 Q100 46 104 62 V92 H16 Z"/>
    <path d="M16 78 H104"/>
    <circle data-accent cx="44" cy="84" r="4"/><circle data-accent cx="72" cy="70" r="5"/><circle data-accent cx="88" cy="84" r="3"/>`,
  wave: `
    <path d="M44 100 Q30 84 32 64 L34 40 Q36 34 42 36 Q46 38 46 44 V60"/>
    <path d="M46 58 V28 Q48 22 54 22 Q60 24 60 30 V56"/>
    <path d="M60 54 V30 Q62 24 68 26 Q74 28 74 34 V58"/>
    <path d="M74 58 V40 Q76 34 82 36 Q88 38 86 46 L84 76 Q80 96 64 100 Z"/>
    <path data-accent d="M92 22 Q100 30 98 40 M100 16 Q112 28 108 44"/>`,
  sun: `
    <circle data-accent cx="60" cy="60" r="18"/>
    <path d="M60 18 V30 M60 90 V102 M18 60 H30 M90 60 H102 M30 30 L38 38 M82 82 L90 90 M30 90 L38 82 M82 38 L90 30"/>`,
  evening: `
    <path d="M14 84 H106"/>
    <path data-accent d="M32 84 Q32 56 60 56 Q88 56 88 84 Z"/>
    <path d="M60 30 V42 M30 44 L38 52 M90 44 L82 52 M24 100 H96"/>`,
  moon: `
    <path data-accent d="M74 20 Q46 26 44 58 Q46 90 78 98 Q48 104 30 82 Q14 58 30 36 Q46 18 74 20 Z"/>
    <path d="M86 34 L88 40 L94 42 L88 44 L86 50 L84 44 L78 42 L84 40 Z"/>
    <path d="M92 70 L93 74 L97 75 L93 76 L92 80 L91 76 L87 75 L91 74 Z"/>`,
  train: `
    <rect x="30" y="18" width="60" height="70" rx="12"/>
    <path d="M30 56 H90"/>
    <rect data-accent x="40" y="28" width="40" height="20" rx="3"/>
    <circle cx="44" cy="72" r="5"/><circle cx="76" cy="72" r="5"/>
    <path d="M40 88 L30 104 M80 88 L90 104"/>`,
  ticket: `
    <path d="M14 38 H106 V52 Q96 52 96 60 Q96 68 106 68 V82 H14 V68 Q24 68 24 60 Q24 52 14 52 Z"/>
    <path d="M76 40 V80" stroke-dasharray="4 6"/>
    <path data-accent d="M32 54 H62 V66 H32 Z"/>`,
  plane: `
    <path d="M60 14 Q66 14 66 26 V48 L104 70 V80 L66 68 V90 L78 100 V106 L60 100 L42 106 V100 L54 90 V68 L16 80 V70 L54 48 V26 Q54 14 60 14 Z"/>
    <circle data-accent cx="60" cy="34" r="4"/>`,
  suitcase: `
    <rect x="26" y="36" width="68" height="62" rx="8"/>
    <path d="M46 36 V24 H74 V36"/>
    <path d="M44 36 V98 M76 36 V98"/>
    <circle cx="40" cy="104" r="4"/><circle cx="80" cy="104" r="4"/>
    <rect data-accent x="50" y="58" width="20" height="10" rx="2"/>`,
};

/** "count-3" → three filled dots, laid out on one row; the video counts them in one by one. */
function countDots(n: number): string {
  const size = 18;
  const gap = 8;
  const width = n * size + (n - 1) * gap;
  const start = 60 - width / 2 + size / 2;
  return Array.from(
    { length: n },
    (_, i) =>
      `<circle data-accent data-count="${String(i + 1)}" cx="${String(start + i * (size + gap))}" cy="60" r="${String(size / 2)}"/>`,
  ).join("");
}

/** SVG inner markup for a pictogram key, or `undefined` for an unknown key (the scene omits it). */
export function pictogramMarkup(key: string): string | undefined {
  const count = /^count-([1-9])$/.exec(key);
  if (count?.[1]) return countDots(Number(count[1]));
  return P[key];
}

export const PICTOGRAM_KEYS = [...Object.keys(P), "count-1…count-9"];
