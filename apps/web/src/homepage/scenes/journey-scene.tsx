import type { CSSProperties } from "react";

import { useLanguageLevels, useLanguages } from "../../hooks/use-catalog.js";
import type { HomepageContent } from "../content/homepage-content.js";
import { ScrollScene } from "../motion/scroll-scene.js";
import { SceneIntro } from "./scene-parts.js";

interface Station {
  id: string;
  label: string;
  /** Undefined while the catalog cannot say — a status is never guessed. */
  status?: "available" | "planned";
}

/** Height of station `index` above the figure's floor, in percent — an ascending path. */
function rise(index: number): number {
  return 14 + 14 * index;
}

function pathThrough(count: number, from: number, to: number): string {
  const points = Array.from({ length: to - from + 1 }, (_, offset) => {
    const index = from + offset;
    return `${(((index + 0.5) / count) * 100).toFixed(2)} ${(100 - rise(index)).toFixed(2)}`;
  });
  return `M ${points.join(" L ")}`;
}

/**
 * Scene 08: the progress rail climbs into the CEFR path. The levels and their status come from the
 * public catalog (the first language it lists); nothing here claims how fast a learner moves.
 */
export function JourneyScene({ content }: { content: HomepageContent }) {
  const { journey, chapters } = content;
  const languagesQuery = useLanguages();
  const language = languagesQuery.data?.languages[0];
  const levelsQuery = useLanguageLevels(language?.code);

  const failed =
    languagesQuery.isError ||
    levelsQuery.isError ||
    (languagesQuery.isSuccess && language === undefined);
  const levels = levelsQuery.data?.levels;
  const stations: Station[] =
    levels === undefined
      ? journey.cefrLevels.map((label) => ({ id: label, label }))
      : levels.map((level) => ({ id: level.id, label: level.label, status: level.status }));

  // The path is solid for the opening run of available levels, dashed from the first planned one.
  const firstPlanned = stations.findIndex((station) => station.status !== "available");
  const lastOpen = firstPlanned === -1 ? stations.length - 1 : firstPlanned - 1;

  return (
    <ScrollScene scene="journey" pinned labelledBy="scene-journey-title">
      <div className="scene__frame scene__frame--split">
        <div>
          <SceneIntro
            id="scene-journey-title"
            chapter={8}
            chapterName={chapters.journey}
            title={journey.title}
            lead={journey.lead}
          />
          <p className="example-note">{journey.disclaimer}</p>
        </div>

        <figure className="path">
          {language === undefined ? null : (
            <figcaption className="path__language">{language.name}</figcaption>
          )}
          <div className="path__canvas">
            <svg
              className="path__lines"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="path__line path__line--planned"
                d={pathThrough(stations.length, 0, stations.length - 1)}
              />
              {lastOpen >= 1 ? (
                <path
                  className="path__line path__line--open"
                  d={pathThrough(stations.length, 0, lastOpen)}
                />
              ) : null}
            </svg>
            <ol className="path__stations">
              {stations.map((station, index) => (
                <li
                  key={station.id}
                  className="station"
                  data-status={station.status}
                  style={
                    {
                      "--x": `${(((index + 0.5) / stations.length) * 100).toFixed(2)}%`,
                      "--y": `${rise(index)}%`,
                      "--i": (index / stations.length).toFixed(3),
                    } as CSSProperties
                  }
                >
                  <span className="station__label">{station.label}</span>
                  {station.status === undefined ? null : (
                    <span className="station__status">
                      {station.status === "available" ? journey.available : journey.planned}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
          {failed ? (
            <p className="example-note">{journey.unavailable}</p>
          ) : levels === undefined ? (
            <p className="example-note" role="status">
              {journey.loading}
            </p>
          ) : null}
        </figure>
      </div>
    </ScrollScene>
  );
}
