import type { CSSProperties } from "react";

import { useLanguages } from "../../hooks/use-catalog.js";
import type { HomepageContent } from "../content/homepage-content.js";
import { ScrollScene } from "../motion/scroll-scene.js";
import { SceneIntro } from "./scene-parts.js";

function branchStyle(index: number, total: number): CSSProperties {
  return { "--i": (index / Math.max(1, total)).toFixed(3) } as CSSProperties;
}

/**
 * Scene 09: the path branches into languages. "Available" is exactly what the catalog API lists;
 * "On the roadmap" is the proposed list from docs/product/roadmap.md minus anything the catalog
 * already offers — so a language never appears as both, and nothing future is presented as usable.
 */
export function LanguagesScene({ content }: { content: HomepageContent }) {
  const { languages, chapters } = content;
  const languagesQuery = useLanguages();
  const available = languagesQuery.data?.languages ?? [];
  const availableCodes = new Set<string>(available.map((language) => language.code));
  const roadmap = languages.roadmap.filter((language) => !availableCodes.has(language.code));
  const total = available.length + roadmap.length;

  return (
    <ScrollScene scene="languages" labelledBy="scene-languages-title">
      <div className="scene__frame scene__frame--split">
        <SceneIntro
          id="scene-languages-title"
          chapter={9}
          chapterName={chapters.languages}
          title={languages.title}
          lead={languages.lead}
        />
        <div className="branches">
          <h3 id="languages-available" className="branches__heading">
            {languages.availableHeading}
          </h3>
          <ul className="branches__list" aria-labelledby="languages-available">
            {available.map((language, index) => (
              <li
                key={language.code}
                className="branch branch--open"
                lang={language.code}
                style={branchStyle(index, total)}
              >
                <span className="branch__name">{language.nativeName}</span>
                <span className="branch__status">{languages.availableStatus}</span>
              </li>
            ))}
          </ul>
          {languagesQuery.isPending ? (
            <p className="example-note" role="status">
              {languages.loading}
            </p>
          ) : null}
          {languagesQuery.isError ? <p className="example-note">{languages.unavailable}</p> : null}

          <h3 id="languages-roadmap" className="branches__heading">
            {languages.roadmapHeading}
          </h3>
          <ul className="branches__list" aria-labelledby="languages-roadmap">
            {roadmap.map((language, index) => (
              <li
                key={language.code}
                className="branch branch--planned"
                lang={language.code}
                style={branchStyle(available.length + index, total)}
              >
                <span className="branch__name">{language.nativeName}</span>
                <span className="branch__status">{languages.roadmapStatus}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScrollScene>
  );
}
