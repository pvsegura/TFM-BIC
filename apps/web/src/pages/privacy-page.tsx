import { Link } from "react-router";

import { PRIVACY_NOTICE, type PrivacyNoticeSection } from "../legal/privacy-notice.js";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" });

function Section({ section }: { section: PrivacyNoticeSection }) {
  const headingId = `privacy-${section.id}`;
  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h2 id={headingId} className="text-xl font-semibold">
        {section.heading}
      </h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph} className="mt-2">
          {paragraph}
        </p>
      ))}
      {section.items ? (
        <ul className="mt-2 list-disc space-y-1 pl-6">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {section.linkToProfile ? (
        <p className="mt-2">
          These controls are on your{" "}
          <Link to="/profile" className="text-accent underline">
            profile page
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}

/**
 * The public privacy notice (M15). Renders `PRIVACY_NOTICE` (content) with its version id and
 * date, and a visible draft/pending-review note — it never claims legal compliance.
 */
export function PrivacyPage() {
  return (
    <article aria-labelledby="privacy-heading" className="mx-auto max-w-3xl py-8">
      <h1 id="privacy-heading" className="text-2xl font-semibold">
        Privacy notice
      </h1>
      <p className="mt-2 text-sm text-primary/70 dark:text-surface/70">
        {`Version ${PRIVACY_NOTICE.version} · ${DATE_FORMAT.format(new Date(PRIVACY_NOTICE.date))}`}
      </p>
      <p
        role="note"
        className="mt-4 rounded-md border border-accent p-4 text-sm dark:border-accent"
      >
        {PRIVACY_NOTICE.reviewNote}
      </p>
      {PRIVACY_NOTICE.sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}
    </article>
  );
}
