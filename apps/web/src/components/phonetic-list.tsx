import type { PhoneticRepresentationResponse } from "@tfm-bic/contracts";

import { PhoneticItemCard } from "./phonetic-item-card.js";

export interface PhoneticListProps {
  items: readonly PhoneticRepresentationResponse[];
  getHref: (representation: PhoneticRepresentationResponse) => string;
  /** An accessible name for the list, since a page may show more than one. */
  label: string;
}

/** A page of phonetic representations as a named list. Ordering is the server's (topic, then representation order). */
export function PhoneticList({ items, getHref, label }: PhoneticListProps) {
  return (
    <ol aria-label={label} className="grid gap-3">
      {items.map((representation) => (
        <PhoneticItemCard
          key={representation.id}
          representation={representation}
          href={getHref(representation)}
        />
      ))}
    </ol>
  );
}
