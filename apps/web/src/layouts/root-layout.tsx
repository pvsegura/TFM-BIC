import { Button } from "@tfm-bic/ui";
import { useEffect } from "react";
import { Link, Outlet } from "react-router";

import { useThemeStore } from "../state/theme-store.js";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/login", label: "Log in" },
  { to: "/register", label: "Register" },
  { to: "/dashboard", label: "Dashboard" },
];

export function RootLayout() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="min-h-screen bg-surface text-primary dark:bg-surface-dark dark:text-surface">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <header className="border-b border-primary/10 dark:border-surface/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold">
            TFM-BIC
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-4">
            <ul className="flex items-center gap-4">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <Button
              variant="secondary"
              onClick={toggleTheme}
              aria-pressed={theme === "dark"}
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? "Dark" : "Light"} mode
            </Button>
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4">
        <Outlet />
      </main>
    </div>
  );
}
