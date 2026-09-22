import type { VocabularyItemResponse } from "@tfm-bic/contracts";

import { VocabularyItemCard } from "./vocabulary-item-card.js";

export interface VocabularyListProps {
  items: readonly VocabularyItemResponse[];
  getHref: (item: VocabularyItemResponse) => string;
  /** An accessible name for the list, since a page may show more than one (e.g. after a search). */
  label: string;
}

/** A page of vocabulary entries as a named list. Ordering is the server's (category, then entry order). */
export function VocabularyList({ items, getHref, label }: VocabularyListProps) {
  return (
    <ol aria-label={label} className="grid gap-3">
      {items.map((item) => (
        <VocabularyItemCard key={item.id} item={item} href={getHref(item)} />
      ))}
    </ol>
  );
}
