import { LegalDocumentView } from "../components/legal-document-view.js";
import { legal } from "../i18n/index.js";

/** The public privacy notice (M15, v2 for Verbysia), in the interface language. */
export function PrivacyPage() {
  return <LegalDocumentView document={legal.privacy} prefix="privacy" />;
}
