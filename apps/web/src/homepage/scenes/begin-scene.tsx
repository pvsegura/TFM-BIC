import type { HomepageContent } from "../content/homepage-content.js";
import { ScrollScene } from "../motion/scroll-scene.js";
import { CallsToAction, SceneIntro } from "./scene-parts.js";

/**
 * Scene 10: the story closes where it began — the first word returns, now split and understood —
 * and the thread ends as the underline of the call to action.
 */
export function BeginScene({ content }: { content: HomepageContent }) {
  const { begin, chapters, word, exampleLanguage } = content;

  return (
    <ScrollScene scene="begin" labelledBy="scene-begin-title">
      <div className="scene__frame begin">
        <p className="begin__echo" aria-hidden="true" lang={exampleLanguage}>
          {word.syllables.join("·")}
          <span className="begin__gloss">{word.gloss}</span>
        </p>
        <SceneIntro
          id="scene-begin-title"
          chapter={10}
          chapterName={chapters.begin}
          title={begin.title}
          lead={begin.lead}
        />
        <CallsToAction cta={content.cta} />
        <span className="begin__thread" aria-hidden="true" />
      </div>
    </ScrollScene>
  );
}
