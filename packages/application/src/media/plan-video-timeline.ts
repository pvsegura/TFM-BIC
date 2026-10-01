import type { LanguageId, VideoScript } from "@tfm-bic/domain";

import type { NarrationClip } from "./ports/media-generation-ports.js";

/** Silence before the first line of a scene, and after its last, in seconds. */
export const SCENE_LEAD_IN = 0.6;
export const SCENE_TAIL = 0.8;
/** Default gap between two lines of one scene. */
export const LINE_GAP = 0.35;

export interface TimedLine {
  sceneIndex: number;
  lineIndex: number;
  start: number;
  duration: number;
  text: string;
  language: LanguageId;
  clipPath: string;
  /** Who speaks (a cast id), absent for the narrator — drives the right character's mouth. */
  speaker?: string | undefined;
  /** When the line's lead-in silence starts (actions timed "lead" begin here). */
  leadStart: number;
}

export interface TimedScene {
  index: number;
  start: number;
  duration: number;
}

export interface VideoTimeline {
  scenes: TimedScene[];
  lines: TimedLine[];
  durationSeconds: number;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Lays the script out in time from the *real* clip durations (M21): every scene lasts exactly as
 * long as what is said in it, plus a lead-in and a tail, so visuals and narration stay in sync
 * without guessing reading speeds. `clips` are in `narrationOf(script)` order.
 */
export function planVideoTimeline(
  script: VideoScript,
  clips: readonly NarrationClip[],
): VideoTimeline {
  const scenes: TimedScene[] = [];
  const lines: TimedLine[] = [];
  let cursor = 0;
  let clipIndex = 0;

  script.scenes.forEach((scene, sceneIndex) => {
    const sceneStart = cursor;
    let t = sceneStart + SCENE_LEAD_IN;
    scene.narration.forEach((line, lineIndex) => {
      const clip = clips[clipIndex];
      clipIndex += 1;
      if (!clip) throw new Error("Fewer narration clips than narration lines.");
      const leadStart = t;
      t += line.leadIn ?? 0;
      lines.push({
        leadStart: round(leadStart),
        ...(line.speaker ? { speaker: line.speaker } : {}),
        sceneIndex,
        lineIndex,
        start: round(t),
        duration: round(clip.durationSeconds),
        text: line.text,
        language: line.language,
        clipPath: clip.path,
      });
      t += clip.durationSeconds + (line.pauseAfter ?? LINE_GAP);
    });
    const end = t + SCENE_TAIL;
    scenes.push({ index: sceneIndex, start: round(sceneStart), duration: round(end - sceneStart) });
    cursor = end;
  });

  if (clipIndex !== clips.length) throw new Error("More narration clips than narration lines.");
  return { scenes, lines, durationSeconds: round(cursor) };
}

/** One caption cue per spoken line — the narration is the captions (WebVTT is written by the adapter). */
export function captionCues(
  timeline: VideoTimeline,
): { start: number; end: number; text: string }[] {
  return timeline.lines.map((line) => ({
    start: line.start,
    end: round(line.start + line.duration),
    text: line.text,
  }));
}
