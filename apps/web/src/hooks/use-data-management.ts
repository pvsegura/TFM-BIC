import { useMutation, useQueryClient } from "@tanstack/react-query";

import { saveTextFile } from "../services/browser-download.js";
import { deleteAccount, fetchPersonalDataExport } from "../services/data-management-api.js";
import { clearUserScopedCache, endingSessionOnUnauthorized } from "./session-cache.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";

/**
 * Downloads the personal-data export and saves it as a file. A mutation, not a query: the export
 * is never cached — it is fetched on request and handed straight to the browser.
 */
export function useExportPersonalData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const file = await endingSessionOnUnauthorized(queryClient, fetchPersonalDataExport);
      saveTextFile(file.fileName, file.content, "application/json");
      return file.fileName;
    },
  });
}

/**
 * Deletes the account. On success the session is gone server-side, so every user-scoped query is
 * dropped and the current user is recorded as signed out — exactly what logging out does.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) =>
      endingSessionOnUnauthorized(queryClient, () => deleteAccount(password)),
    onSuccess: () => {
      clearUserScopedCache(queryClient);
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
    },
  });
}
