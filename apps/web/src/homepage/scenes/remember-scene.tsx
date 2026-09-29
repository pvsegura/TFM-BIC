import type { CSSProperties } from "react";

import type { HomepageContent } from "../content/homepage-content.js";
import { ScrollScene } from "../motion/scroll-scene.js";
import { SceneIntro } from "./scene-parts.js";

/** Where each word sits in the constellation (percent of the figure), the first in the centre —
 * it is the answer the reader just chose in the Practise scene. Layout, not content. */
const POSITIONS: readonly (readonly [number, number])[] = [
  [50, 48],
  [20, 20],
  [80, 18],
  [14, 76],
  [84, 70],
  [46, 90],
  [60, 8],
];

/** Pairs of word indexes joined by a thread. */
const LINKS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [1, 6],
  [2, 6],
  [3, 5],
  [4, 5],
];

function position(index: number): readonly [number, number] {
  return POSITIONS[index % POSITIONS.length] ?? [50, 50];
}

/**
 * Scene 06: the chosen answer joins other words; threads connect them as they are revisited. The
 * words are a real list (with their example statuses in words); only the threads are decorative.
 */
export function RememberScene({ content }: { content: HomepageContent }) {
  const { remember, chapters, exampleLanguage } = content;
  const count = remember.words.length;

  return (
    <ScrollScene scene="remember" pinned labelledBy="scene-remember-title">
      <div className="scene__frame scene__frame--split">
        <SceneIntro
          id="scene-remember-title"
          chapter={6}
          chapterName={chapters.remember}
          title={remember.title}
          lead={remember.lead}
        />
        <div className="constellation">
          <svg
            className="constellation__links"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {LINKS.filter(([from, to]) => from < count && to < count).map(([from, to], index) => {
              const [x1, y1] = position(from);
              const [x2, y2] = position(to);
              return (
                <path
                  key={`${from}-${to}`}
                  d={`M ${x1} ${y1} L ${x2} ${y2}`}
                  pathLength={1}
                  className="constellation__link"
                  style={{ "--i": (index / LINKS.length).toFixed(3) } as CSSProperties}
                />
              );
            })}
          </svg>
          <ul className="constellation__words" aria-label={remember.listLabel}>
            {remember.words.map((entry, index) => {
              const [x, y] = position(index);
              return (
                <li
                  key={entry.word}
                  className={`word-node ${index === 0 ? "word-node--centre" : ""}`}
                  style={
                    {
                      "--x": `${x}%`,
                      "--y": `${y}%`,
                      "--i": (index / count).toFixed(3),
                    } as CSSProperties
                  }
                >
                  <span className="word-node__word" lang={exampleLanguage}>
                    {entry.word}
                  </span>
                  <span className="word-node__gloss">{entry.gloss}</span>
                  <span className="word-node__status" data-status={entry.status}>
                    {entry.status}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="example-note constellation__note">{remember.statusesNote}</p>
        </div>
      </div>
    </ScrollScene>
  );
}
