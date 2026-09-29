import type { CSSProperties } from "react";

import type { HomepageContent } from "../content/homepage-content.js";
import { ScrollScene } from "../motion/scroll-scene.js";
import { SceneIntro } from "./scene-parts.js";

/**
 * Scene 07: the threads collapse into progress rails. Everything here is an illustration of how the
 * product counts progress — the lesson states, the point amounts and the achievement names are the
 * real ones, the student is not — and it says so above the figure.
 */
export function ProgressScene({ content }: { content: HomepageContent }) {
  const { progress, chapters } = content;

  return (
    <ScrollScene scene="progress" labelledBy="scene-progress-title">
      <div className="scene__frame scene__frame--split">
        <SceneIntro
          id="scene-progress-title"
          chapter={7}
          chapterName={chapters.progress}
          title={progress.title}
          lead={progress.lead}
        />
        <div className="report">
          <p className="report__label">{progress.illustrationLabel}</p>

          <h3 className="report__heading">{progress.lessonsHeading}</h3>
          <ul className="report__lessons">
            {progress.lessons.map((lesson) => (
              <li
                key={lesson.title}
                className="rail-row"
                style={{ "--fraction": lesson.fraction } as CSSProperties}
              >
                <span className="rail-row__title">{lesson.title}</span>
                <span className="rail-row__status">{lesson.status}</span>
                <span className="rail-row__rail" aria-hidden="true">
                  <span className="rail-row__fill" />
                </span>
              </li>
            ))}
          </ul>

          <div className="report__columns">
            <div>
              <h3 className="report__heading">{progress.pointsHeading}</h3>
              <dl className="ledger">
                {progress.points.map((rule) => (
                  <div key={rule.reason} className="ledger__row">
                    <dt>{rule.reason}</dt>
                    <dd className="ledger__amount">{rule.amount}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h3 className="report__heading">{progress.achievementsHeading}</h3>
              <ul className="stamps">
                {progress.achievements.map((title, index) => (
                  <li
                    key={title}
                    className="stamp"
                    style={
                      { "--i": (index / progress.achievements.length).toFixed(3) } as CSSProperties
                    }
                  >
                    {title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ScrollScene>
  );
}
