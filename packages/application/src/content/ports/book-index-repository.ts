/** Page numbers of one printed book: total pages and the page of each indexed item. */
export interface BookPages {
  pages: number;
  index: Readonly<Record<string, number>>;
}

/** Where a course's units, lessons and exercises are in its printed books. */
export interface BookIndex {
  course: string;
  podrecznik?: BookPages | undefined;
  zeszyt?: BookPages | undefined;
}

/** Read-only access to the page indexes the book generator writes (content/books/*.json). */
export interface BookIndexRepository {
  find(course: string): Promise<BookIndex | null>;
}
