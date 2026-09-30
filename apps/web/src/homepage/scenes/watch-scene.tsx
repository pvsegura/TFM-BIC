import type { CSSProperties } from "react";

import { formatDuration } from "../../components/format-duration.js";
import { useLessonMedia } from "../../hooks/use-media.js";
import type { HomepageContent } from "../content/homepage-content.js";
import { ScrollScene } from "../motion/scroll-scene.js";
import { SceneIntro } from "./scene-parts.js";

/**
 * Scene 04: the flattened sound wave becomes a video timeline. M21: when the showcase lesson has a
 * published explainer video, the scene shows that real video — poster first, native controls,
 * nothing preloaded and nothing played until the visitor presses play (no autoplay, no sound
 * without consent). Until then it keeps the M20A storyboard with the status stated in words, never
 * a fake player.
 */
export function WatchScene({ content }: { content: HomepageContent }) {
  const { watch, chapters, exampleLanguage } = content;
  const frameCount = watch.keyframes.length + 1;
  const media = useLessonMedia(watch.showcaseLessonId);
  const video = media.data?.video;

  if (video) {
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
          <figure className="m-0 w-full">
            <video
              className="aspect-video w-full rounded-xl border border-primary/15 bg-paper-shade dark:border-surface/15 dark:bg-night-paper"
              controls
              playsInline
              preload="none"
              poster={video.posterUrl}
              aria-label={`Video: ${watch.showcaseTitle}`}
            >
              <source src={video.url} type="video/mp4" />
              <track
                kind="captions"
                src={video.captionsUrl}
                srcLang={video.captionsLanguage}
                label="Captions"
                default
              />
            </video>
            <figcaption className="storyboard__status">
              {watch.readyStatus.replace("{duration}", formatDuration(video.durationSeconds))}
            </figcaption>
          </figure>
        </div>
      </ScrollScene>
    );
  }

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
