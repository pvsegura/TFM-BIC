/** Colour arithmetic for the illustrations: mixes a `#rrggbb` colour towards black or white. */

function mix(hex: string, other: number, f: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const a = (n >> shift) & 255;
    const b = (other >> shift) & 255;
    return Math.max(0, Math.min(255, Math.round(a + (b - a) * f)));
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/** Mix a colour towards black (f < 1) — shadows, back sleeves, folds. */
export function shade(hex: string, f = 0.8): string {
  return mix(hex, 0x000000, 1 - f);
}

/** Mix a colour towards white — highlights. */
export function tint(hex: string, f = 0.3): string {
  return mix(hex, 0xffffff, f);
}
