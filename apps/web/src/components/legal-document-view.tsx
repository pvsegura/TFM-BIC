import { Link } from "./app-link.js";

import type { LegalDocument, LegalSection } from "../legal/legal-document.js";
import { formatDate, m } from "../i18n/index.js";

const t = m.legal;

function Section({ prefix, section }: { prefix: string; section: LegalSection }) {
  const headingId = `${prefix}-${section.id}`;
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
          {t.profileLinkBefore}
          <Link to="/profile" className="text-accent underline">
            {t.profileLink}
          </Link>
          {t.profileLinkAfter}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Renders a versioned legal text with its id, date and a visible draft note — it never claims
 * legal compliance. `prefix` keeps section anchors stable (`/privacy#privacy-rights`).
 */
export function LegalDocumentView({
  document,
  prefix,
}: {
  document: LegalDocument;
  prefix: string;
}) {
  return (
    <article aria-labelledby={`${prefix}-heading`} className="mx-auto max-w-3xl py-8">
      <h1 id={`${prefix}-heading`} className="text-2xl font-semibold">
        {document.title}
      </h1>
      <p className="mt-2 text-sm text-primary/70 dark:text-surface/70">
        {t.version(document.version, formatDate(document.date))}
      </p>
      <p
        role="note"
        className="mt-4 rounded-md border border-accent p-4 text-sm dark:border-accent"
      >
        {document.reviewNote}
      </p>
      {document.sections.map((section) => (
        <Section key={section.id} prefix={prefix} section={section} />
      ))}
    </article>
  );
}
