/**
 * A deterministic shuffle keyed by the exercise id, so the web and the printed workbook show the
 * same scrambled order, and a reload never reshuffles. Never returns the original order when the
 * list can be reordered (otherwise the exercise would show its own answer).
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let state = 2166136261;
  for (const char of seed) {
    state ^= char.codePointAt(0) ?? 0;
    state = Math.imul(state, 16777619) >>> 0;
  }
  const next = () => {
    state = (Math.imul(state ^ (state >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    return state / 2 ** 32;
  };
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  if (result.length > 1 && result.every((item, index) => item === items[index])) {
    result.push(result.shift() as T);
  }
  return result;
}
