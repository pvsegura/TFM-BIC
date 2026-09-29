import { useMemo } from "react";

import { homepageContent } from "../homepage/content/homepage-content.js";
import "../homepage/homepage.css";
import { HomepageMotionContext, PIN_MEDIA_QUERY } from "../homepage/motion/motion-context.js";
import { useMediaQuery, usePrefersReducedMotion } from "../homepage/motion/use-media-query.js";
import { BeginScene } from "../homepage/scenes/begin-scene.js";
import { JourneyScene } from "../homepage/scenes/journey-scene.js";
import { LanguagesScene } from "../homepage/scenes/languages-scene.js";
import { ListenScene } from "../homepage/scenes/listen-scene.js";
import { OpeningScene } from "../homepage/scenes/opening-scene.js";
import { PractiseScene } from "../homepage/scenes/practise-scene.js";
import { ProgressScene } from "../homepage/scenes/progress-scene.js";
import { RememberScene } from "../homepage/scenes/remember-scene.js";
import { WatchScene } from "../homepage/scenes/watch-scene.js";
import { useDocumentMeta } from "../homepage/use-document-meta.js";

/**
 * The public homepage (M20A): one story in ten scenes, from a word the visitor cannot read to the
 * first step of learning it — docs/m20a-homepage-audit.md and docs/m20a-motion-system.md. Loaded as
 * its own chunk (router.tsx). All copy comes from the locale file; live facts from the catalog API.
 *
 * `data-motion` switches the whole page between the scroll-driven layout and the settled, static
 * one used for `prefers-reduced-motion` — the content is identical in both.
 */
export function HomePage() {
  const content = homepageContent();
  const motion = !usePrefersReducedMotion();
  const wide = useMediaQuery(PIN_MEDIA_QUERY);
  const motionSettings = useMemo(() => ({ motion, pin: motion && wide }), [motion, wide]);
  useDocumentMeta(content.meta.title, content.meta.description);

  return (
    <HomepageMotionContext value={motionSettings}>
      <div className="homepage" data-motion={motion ? "full" : "reduced"}>
        <span className="homepage__rail" aria-hidden="true" />
        <OpeningScene content={content} />
        <ListenScene content={content} />
        <WatchScene content={content} />
        <PractiseScene content={content} />
        <RememberScene content={content} />
        <ProgressScene content={content} />
        <JourneyScene content={content} />
        <LanguagesScene content={content} />
        <BeginScene content={content} />
      </div>
    </HomepageMotionContext>
  );
}
