/**
 * The personal-data export's schema version (M15, docs/privacy/DATA-EXPORT-FORMAT.md).
 * Bump it — never silently change the shape — when a field is added, renamed or removed.
 */
export const PERSONAL_DATA_EXPORT_VERSION = "1";

/**
 * The download's file name: the product and the UTC date, nothing that identifies the user (the
 * name can end up in a shared downloads folder, a browser history or a support ticket).
 */
export function personalDataExportFileName(generatedAt: Date): string {
  return `tfm-bic-personal-data-${generatedAt.toISOString().slice(0, 10)}.json`;
}
