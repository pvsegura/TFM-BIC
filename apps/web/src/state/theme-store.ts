import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

/**
 * Global, client-only theme preference. Zustand is used here (rather than
 * TanStack Query or component state) because the value has no server
 * counterpart and must be read by unrelated parts of the tree (the root
 * <html> class effect and the header toggle) without prop drilling — the
 * justification ADR-003 requires per Zustand store. See
 * .claude/skills/react-typescript.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggleTheme: () => {
        set({ theme: get().theme === "light" ? "dark" : "light" });
      },
    }),
    {
      name: "tfm-bic-theme",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
