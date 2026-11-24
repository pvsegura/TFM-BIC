import type { LegalDocument } from "../../legal/legal-document.js";
import { PRIVACY_NOTICE } from "../../legal/privacy-notice.js";
import { PRIVACY_NOTICE_PL } from "./privacy-notice-pl.js";
import { TERMS_OF_SALE_EN, TERMS_OF_SALE_PL } from "./terms-of-sale.js";

export interface LegalDocuments {
  readonly terms: LegalDocument;
  readonly privacy: LegalDocument;
}

const SPANISH_NOTE =
  "Texto informativo en inglés mientras no exista la traducción. La versión vinculante es la polaca. Borrador pendiente de revisión legal.";

/** The legal texts per interface language. The reference-language versions are binding. */
export const LEGAL_DOCUMENTS = {
  pl: { terms: TERMS_OF_SALE_PL, privacy: PRIVACY_NOTICE_PL },
  en: { terms: TERMS_OF_SALE_EN, privacy: PRIVACY_NOTICE },
  es: {
    terms: { ...TERMS_OF_SALE_EN, reviewNote: SPANISH_NOTE },
    privacy: { ...PRIVACY_NOTICE, reviewNote: SPANISH_NOTE },
  },
} as const satisfies Record<string, LegalDocuments>;
