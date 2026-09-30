/** 125 → "2:05" — video lengths on cards, badges and players (M21). */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${String(Math.floor(total / 60))}:${String(total % 60).padStart(2, "0")}`;
}
