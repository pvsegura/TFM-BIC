import type { CSSProperties } from "react";

import type { HomepageContent } from "../content/homepage-content.js";
import { ScrollScene } from "../motion/scroll-scene.js";
import { SceneIntro } from "./scene-parts.js";

/**
 * Scene 04: the flattened sound wave becomes a video timeline. The product has one authored video
 * definition and no playable media yet (M11), so this is its storyboard — title card and one frame
 * per nasal vowel — with the status stated in words, never a fake player.
 */
export function WatchScene({ content }: { content: HomepageContent }) {
  const { watch, chapters, exampleLanguage } = content;
  const frameCount = watch.keyframes.length + 1;

  return (
    <ScrollScene scene="watch" labelledBy="scene-watch-title">
      <div className="scene__frame scene__frame--split">
        <SceneIntro
          id="scene-watch-title"
          chapter={4}
          chapterName={chapters.watch}
          title={watch.title}
          lead={watch.lead}
        />
        <figure className="storyboard">
          <ol className="storyboard__frames" lang={exampleLanguage}>
            <li className="frame frame--title" style={{ "--k": 0 } as CSSProperties}>
              <span className="frame__title">{watch.videoTitle}</span>
            </li>
            {watch.keyframes.map((keyframe, index) => (
              <li
                key={keyframe.glyph}
                className="frame"
                style={{ "--k": (index + 1) / (frameCount - 1) } as CSSProperties}
              >
                <span className="frame__glyph">{keyframe.glyph}</span>
                <span className="frame__caption">{keyframe.caption}</span>
              </li>
            ))}
          </ol>
          <div className="timeline" aria-hidden="true">
            <span className="timeline__track" />
            <span className="timeline__progress" />
            <span className="timeline__playhead" />
          </div>
          <figcaption className="storyboard__status">{watch.status}</figcaption>
        </figure>
      </div>
    </ScrollScene>
  );
}
