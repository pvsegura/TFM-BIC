import { useMutation, useQueryClient } from "@tanstack/react-query";

import { saveTextFile } from "../services/browser-download.js";
import { replacePage } from "../services/browser-navigation.js";
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
 * Deletes the account. On success the session is gone server-side: the cache is dropped, the user
 * is recorded as signed out, and the browser loads the public confirmation page afresh. A full page
 * load (not an in-app navigation) because any other request that meets the dead session gets a 401
 * and lets the login guard redirect first — a race an in-app navigation can lose — and because it
 * discards everything about the deleted user still held in memory. Defined on the hook, so it runs
 * even if the section has unmounted by then.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) =>
      endingSessionOnUnauthorized(queryClient, () => deleteAccount(password)),
    onSuccess: () => {
      clearUserScopedCache(queryClient);
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
      replacePage("/account-deleted");
    },
  });
}
