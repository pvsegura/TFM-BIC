import type { CSSProperties } from "react";

import type { HomepageContent } from "../content/homepage-content.js";
import { ScrollScene } from "../motion/scroll-scene.js";
import { SceneIntro } from "./scene-parts.js";

const BAR_COUNT = 48;

/** One rise per syllable: the stressed first syllable is longer and louder than the second. */
const SYLLABLE_ENVELOPES = [
  { centre: 0.3, width: 0.15, peak: 1 },
  { centre: 0.72, width: 0.11, peak: 0.72 },
];

/** Bar heights (0–1) of an illustrative wave — deterministic, so every render and screenshot match. */
const WAVE_HEIGHTS: readonly number[] = Array.from({ length: BAR_COUNT }, (_, index) => {
  const x = (index + 0.5) / BAR_COUNT;
  const envelope = Math.max(
    ...SYLLABLE_ENVELOPES.map(
      ({ centre, width, peak }) => peak * Math.exp(-(((x - centre) / width) ** 2)),
    ),
  );
  const texture = 0.78 + 0.22 * Math.abs(Math.sin(index * 2.3));
  return Math.max(0.06, Number((envelope * texture).toFixed(3)));
});

/** Custom properties for one bar, set through the CSSOM (allowed by the CSP). */
function barStyle(index: number, height: number): CSSProperties {
  return { "--i": (index / BAR_COUNT).toFixed(3), "--h": height } as CSSProperties;
}

export function ListenScene({ content }: { content: HomepageContent }) {
  const { listen, word, chapters, exampleLanguage } = content;
  const [first = "", second = ""] = word.syllables;
  const [firstSound = "", secondSound = ""] = word.ipa.replace(/[/ˈ]/g, "").split(".");

  return (
    <ScrollScene scene="listen" pinned labelledBy="scene-listen-title">
      <div className="scene__frame scene__frame--split">
        <SceneIntro
          id="scene-listen-title"
          chapter={3}
          chapterName={chapters.listen}
          title={listen.title}
          lead={listen.lead}
        />
        <div className="listen-figure" aria-hidden="true">
          <div className="wave">
            {WAVE_HEIGHTS.map((height, index) => (
              <span key={index} className="wave__bar" style={barStyle(index, height)} />
            ))}
            <span className="wave__playhead" />
          </div>
          <div className="wave__syllables" lang={exampleLanguage}>
            <span className="wave__syllable wave__syllable--1">
              <span className="wave__letters">{first}</span>
              <span className="wave__ipa">{firstSound}</span>
            </span>
            <span className="wave__syllable wave__syllable--2">
              <span className="wave__letters">{second}</span>
              <span className="wave__ipa">{secondSound}</span>
            </span>
          </div>
          <div className="speeds">
            {listen.speeds.map((speed, index) => (
              <span key={speed} className={`speed ${index === 0 ? "speed--on" : ""}`}>
                {speed}
              </span>
            ))}
          </div>
        </div>
        <p className="sr-only">{listen.figureLabel}</p>
      </div>
    </ScrollScene>
  );
}
