import { personalDataExportSchema } from "@tfm-bic/contracts";

import { toApiError } from "./api-request.js";

/**
 * Privacy & Data Management (M15, ADR-026). Same-origin like every other API path (see
 * vite.config.ts). The account is always the session's: nothing identifying is ever put in a URL
 * or a body — the deletion body is the re-entered password and an explicit confirmation.
 */
const EXPORT_URL = "/data-management/export";
const DELETION_URL = "/data-management/account-deletion";
const FALLBACK_FILE_NAME = "tfm-bic-personal-data.json";
/** Only a plain file name from the server is used; anything else (a path, quotes) is ignored. */
const SAFE_FILE_NAME = /filename="([A-Za-z0-9._-]+\.json)"/;

export interface PersonalDataExportFile {
  fileName: string;
  /** The validated document, pretty-printed — what is saved to disk. */
  content: string;
}

function fileNameOf(response: Response): string {
  const match = SAFE_FILE_NAME.exec(response.headers.get("content-disposition") ?? "");
  const name = match?.[1];
  return name !== undefined && !name.startsWith(".") ? name : FALLBACK_FILE_NAME;
}

/** Downloads and validates the session user's export (version 1). */
export async function fetchPersonalDataExport(): Promise<PersonalDataExportFile> {
  const response = await fetch(EXPORT_URL, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  const document = personalDataExportSchema.parse(JSON.parse(await response.text()));
  return { fileName: fileNameOf(response), content: JSON.stringify(document, null, 2) };
}

/** Deletes the session user's account. Resolves on `204`; any refusal is an `ApiError`. */
export async function deleteAccount(password: string): Promise<void> {
  const response = await fetch(DELETION_URL, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ password, confirm: true }),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
}
