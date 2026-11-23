import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { hasDemoProgress, syncDemoProgress } from "../services/demo-progress.js";
import { useCurrentUser } from "./use-current-user.js";

/**
 * Once a visitor who tried the free demo is signed in, moves their browser-only demo progress into
 * the account (once per page load). Returns true after something was moved, for a short notice.
 */
export function useDemoProgressSync(): boolean {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const started = useRef(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!user || started.current || !hasDemoProgress()) return;
    started.current = true;
    void syncDemoProgress().then((count) => {
      if (count > 0) {
        setSynced(true);
        void queryClient.invalidateQueries();
      }
    });
  }, [user, queryClient]);

  return synced;
}
