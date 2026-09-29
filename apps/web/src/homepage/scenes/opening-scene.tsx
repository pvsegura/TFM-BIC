import type { HomepageContent } from "../content/homepage-content.js";
import { ScrollScene } from "../motion/scroll-scene.js";
import { CallsToAction, SceneIntro } from "./scene-parts.js";

interface OpeningSceneProps {
  content: HomepageContent;
}

/**
 * Scenes 01 (Discover) and 02 (Understand) share one pinned figure: the word *szkoła* stays in view
 * while the hero copy scrolls away and the explanation scrolls in, and the same word splits into
 * syllables and gathers its annotations — the page's one shared-element transition. The figure is
 * decorative (the Understand section states every fact it shows in text), so it is hidden from
 * assistive technology.
 */
export function OpeningScene({ content }: OpeningSceneProps) {
  const { hero, understand, word, chapters, exampleLanguage } = content;
  const [first = "", second = ""] = word.syllables;

  return (
    <ScrollScene scene="opening" pinned stage={false}>
      <section className="opening__hero" data-scene="hero" aria-labelledby="scene-hero-title">
        <SceneIntro
          id="scene-hero-title"
          chapter={1}
          chapterName={chapters.hero}
          title={hero.title}
          lead={hero.lead}
          kicker={hero.eyebrow}
          level={1}
        />
        <CallsToAction cta={content.cta} />
        <p className="scroll-cue">
          <span aria-hidden="true" className="scroll-cue__line" />
          {hero.scrollCue}
        </p>
      </section>

      <div className="opening__figure" aria-hidden="true">
        <div className="opening__sticky">
          <div className="specimen" lang={exampleLanguage}>
            <div className="specimen__row specimen__row--above">
              <span className="note note--ipa">{word.ipa}</span>
              <span className="note note--pos">{word.partOfSpeech}</span>
            </div>
            <p className="specimen__word">
              <span className="specimen__syllable">{first}</span>
              <span className="specimen__dot">·</span>
              <span className="specimen__syllable specimen__syllable--second">{second}</span>
            </p>
            <span className="specimen__underline" />
            <div className="specimen__ticks">
              <span className="tick tick--1" />
              <span className="tick tick--2" />
              <span className="tick tick--3" />
            </div>
            <div className="specimen__row specimen__row--below">
              <span className="note note--syllables">
                {first}·{second}
              </span>
              <span className="note note--gloss">{word.gloss}</span>
              <span className="note note--rough">{word.rough}</span>
            </div>
          </div>
        </div>
      </div>

      <section
        className="opening__understand"
        data-scene="understand"
        aria-labelledby="scene-understand-title"
      >
        <SceneIntro
          id="scene-understand-title"
          chapter={2}
          chapterName={chapters.understand}
          title={understand.title}
          lead={understand.lead}
        />
        <dl className="facets">
          {understand.facets.map((facet) => (
            <div key={facet.term} className="facet">
              <dt className="facet__term">{facet.term}</dt>
              <dd className="facet__detail">{facet.detail}</dd>
            </div>
          ))}
          <div className="facet">
            <dt className="facet__term">{understand.ipaTerm}</dt>
            <dd className="facet__detail">{word.ipa}</dd>
          </div>
        </dl>
        <p className="example-note">{word.source}</p>
      </section>
    </ScrollScene>
  );
}
