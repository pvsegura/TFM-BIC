/** A versioned legal text (terms, privacy). Content only — `LegalDocumentPage` renders it. */
export interface LegalSection {
  readonly id: string;
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly items?: readonly string[];
  /** Adds a sentence pointing to the profile page's data controls. */
  readonly linkToProfile?: boolean;
}

export interface LegalDocument {
  /** e.g. `regulamin-v1`; never reused for different wording. */
  readonly version: string;
  /** ISO date (YYYY-MM-DD). */
  readonly date: string;
  readonly status: "draft-pending-legal-review";
  readonly title: string;
  readonly reviewNote: string;
  readonly sections: readonly LegalSection[];
}
