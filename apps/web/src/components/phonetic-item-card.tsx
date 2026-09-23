import type { PhoneticRepresentationResponse } from "@tfm-bic/contracts";
import { Link } from "react-router";

import { PhoneticActions } from "./phonetic-actions.js";
import { PhoneticProgressBadge } from "./phonetic-progress-badge.js";

export interface PhoneticItemCardProps {
  representation: PhoneticRepresentationResponse;
  href: string;
}

/**
 * One phonetic representation in a list: its IPA, description, where it belongs and the student's
 * own progress and actions. Presentation only — it receives the representation and where its
 * detail page is. The IPA is given an explicit `aria-label` so a screen reader announces it as a
 * sound, not as unreadable symbols.
 */
export function PhoneticItemCard({ representation, href }: PhoneticItemCardProps) {
  return (
    <li className="rounded-lg border border-primary/20 px-4 py-4 dark:border-surface/20">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div>
          <Link
            to={href}
            className="text-lg font-semibold underline-offset-2 hover:underline"
            lang={representation.languageId}
            aria-label={`IPA symbol ${representation.ipa}`}
          >
            {representation.ipa}
          </Link>
          <p className="text-primary/70 dark:text-surface/70">{representation.description}</p>
        </div>
        <PhoneticProgressBadge status={representation.userProgress.status} />
      </div>

      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-primary/70 dark:text-surface/70">
        {representation.topic ? <span>{representation.topic.title}</span> : null}
        {representation.levelId ? <span>{representation.levelId.toUpperCase()}</span> : null}
      </p>

      <div className="mt-3">
        <PhoneticActions
          phoneticId={representation.id}
          status={representation.userProgress.status}
        />
      </div>
    </li>
  );
}
