/** Shared by every part of the video template: the frame size, escaping and number formatting. */

export const WIDTH = 1280;
export const HEIGHT = 720;

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}
export const n = (v: number) => v.toFixed(3);

/**
 * Gives a scene its own copy of the illustration ids (gradients, clip paths). Every scene is an <svg>
 * in one document, and a url(#id) resolves to the first element with that id — which, for a place
 * seen earlier, sits in a scene that is already hidden, so its clip path no longer applies.
 */
export function scopeIds(svg: string, prefix: string): string {
  return svg.replace(/(id="|url\(#)(ill-[\w-]+)/g, `$1${prefix}-$2`);
}
export const q = JSON.stringify;
