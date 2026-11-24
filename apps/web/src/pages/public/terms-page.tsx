import { LegalDocumentView } from "../../components/legal-document-view.js";
import { legal } from "../../i18n/index.js";

/** The terms of sale ("Regulamin"), linked from the footer and from the buy consent. */
export function TermsPage() {
  return <LegalDocumentView document={legal.terms} prefix="terms" />;
}
