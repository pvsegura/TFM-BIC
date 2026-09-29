import { Link } from "react-router";

import { useCurrentUser } from "../../hooks/use-current-user.js";
import type { CallToActionPair, HomepageContent } from "../content/homepage-content.js";

/** A two-digit chapter number, as in an exercise book ("01", "02", …). */
function chapterNumber(index: number): string {
  return String(index).padStart(2, "0");
}

interface SceneIntroProps {
  id: string;
  chapter: number;
  chapterName: string;
  title: string;
  lead: string;
  /** A short line above the heading (the hero says what the product is). */
  kicker?: string;
  /** Only the hero's title is the page's h1. */
  level?: 1 | 2;
}

/**
 * The start of every scene: its chapter mark (the bead on the orange margin line), its heading and
 * one short lead paragraph. Never faded out by motion — the copy is always readable.
 */
export function SceneIntro({
  id,
  chapter,
  chapterName,
  title,
  lead,
  kicker,
  level = 2,
}: SceneIntroProps) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <header className="scene-intro">
      <p className="chapter">
        <span className="chapter__number">{chapterNumber(chapter)}</span>
        <span className="chapter__name">{chapterName}</span>
      </p>
      {kicker === undefined ? null : <p className="kicker">{kicker}</p>}
      <Heading id={id} className={level === 1 ? "type-h1" : "type-h2"}>
        {title}
      </Heading>
      <p className="type-lead">{lead}</p>
    </header>
  );
}

/**
 * The page's two calls to action. Auth state comes from the one shared query (`useCurrentUser`),
 * never a copy of it: a signed-in student is sent back to their work instead of to registration.
 * While the session is still being restored, the visitor's pair is shown (a public page must never
 * wait on the API to be usable).
 */
export function CallsToAction({ cta }: { cta: HomepageContent["cta"] }) {
  const { data: currentUser } = useCurrentUser();
  const pair: CallToActionPair = currentUser ? cta.member : cta.guest;

  return (
    <div className="cta-row">
      <Link to={pair.primary.to} className="cta cta--primary">
        {pair.primary.label}
        <span aria-hidden="true" className="cta__arrow">
          →
        </span>
      </Link>
      <Link to={pair.secondary.to} className="cta cta--secondary">
        {pair.secondary.label}
      </Link>
    </div>
  );
}
