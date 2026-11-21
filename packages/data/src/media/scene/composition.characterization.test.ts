import { createHash } from "node:crypto";

import { isAudioTarget, planVideoTimeline, type NarrationClip } from "@verbysia/application";
import { narrationOf, voiceOf } from "@verbysia/domain";
import { describe, expect, it } from "vitest";

import { DEFAULT_CONTENT_ROOT } from "../../content/content-root.js";
import { loadContentRepositories } from "../../content/load-content-repositories.js";
import { loadMediaPlan } from "../media-plan.js";
import { planMediaTargets } from "../media-targets.js";
import { buildComposition, buildWebVtt, TEMPLATE_VERSION } from "./composition.js";

/**
 * Characterization of the video template: the composition HTML of every shipped video, built from
 * the real scripts with synthetic, deterministic clip lengths (no TTS, no render). The snapshot
 * holds a hash per video, so any change to what a video looks like — intended or not — fails here.
 * An intended change bumps TEMPLATE_VERSION (which is part of every video's source hash) and
 * updates the snapshot; a refactor must leave it untouched.
 */

/** A stand-in clip whose length depends only on its text. */
function clipFor(text: string, language: string, narratorId: string, index: number): NarrationClip {
  return {
    path: `clips/${String(index)}.m4a`,
    durationSeconds: 0.8 + text.length * 0.06,
    text,
    language: language as NarrationClip["language"],
    narratorId,
    reused: true,
  };
}

async function compositions(languageId: string): Promise<Record<string, string>> {
  const repos = await loadContentRepositories(DEFAULT_CONTENT_ROOT);
  const plan = await loadMediaPlan(DEFAULT_CONTENT_ROOT, languageId);
  const { targets } = await planMediaTargets(repos, plan, {
    kinds: { lessons: true, vocabulary: true, grammar: true },
    maxPriority: 3,
  });

  const hashes: Record<string, string> = {};
  for (const target of targets) {
    if (isAudioTarget(target)) continue;
    const clips = narrationOf(target.script).map((line, i) =>
      clipFor(line.text, line.language, voiceOf(target.script, line), i),
    );
    const timeline = planVideoTimeline(target.script, clips);
    const html = buildComposition(target.script, timeline, { clipSrc: (p) => `audio/${p}` });
    hashes[target.key] = createHash("sha256").update(html).digest("hex").slice(0, 16);
  }
  return hashes;
}

describe("video composition (characterization)", () => {
  it("is template version 5", () => {
    expect(TEMPLATE_VERSION).toBe(5);
  });

  it.each(["pl", "en"])("renders every %s video exactly as before", async (languageId) => {
    const hashes = await compositions(languageId);

    expect(Object.keys(hashes).length).toBeGreaterThan(0);
    expect(hashes).toMatchSnapshot();
  });

  it("writes WebVTT cues with escaped text and millisecond timestamps", () => {
    expect(
      buildWebVtt([
        { start: 0, end: 1.25, text: "Dzień dobry" },
        { start: 3661.5, end: 3662, text: "a < b & c" },
      ]),
    ).toBe(
      "WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.250\nDzień dobry\n\n2\n01:01:01.500 --> 01:01:02.000\na &lt; b &amp; c\n",
    );
  });
});
