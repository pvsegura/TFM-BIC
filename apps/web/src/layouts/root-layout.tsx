import { Button } from "@tfm-bic/ui";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, Outlet, useLocation, useMatches } from "react-router";

import { useCurrentUser } from "../hooks/use-current-user.js";
import { useLogout } from "../hooks/use-logout.js";
import { useThemeStore } from "../state/theme-store.js";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/learn", label: "Learn" },
];

const NAV_LIST_ID = "primary-nav-links";

/** A route opts out of the centred column (the public homepage, M20A) with `handle: { fullBleed: true }`. */
function isFullBleedHandle(handle: unknown): boolean {
  return typeof handle === "object" && handle !== null && "fullBleed" in handle
    ? handle.fullBleed === true
    : false;
}

export function RootLayout() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const { data: currentUser } = useCurrentUser();
  const logoutMutation = useLogout();
  const { pathname } = useLocation();
  const fullBleed = useMatches().some((match) => isFullBleedHandle(match.handle));
  const frameWidth = fullBleed ? "max-w-7xl" : "max-w-5xl";

  // The small-screen menu is open *for the page it was opened on*, so following any link (a new
  // pathname) closes it without an effect.
  const [menuOpenedOn, setMenuOpenedOn] = useState<string | null>(null);
  const menuOpen = menuOpenedOn === pathname;
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function closeMenuOnEscape(event: KeyboardEvent) {
    if (event.key === "Escape" && menuOpen) {
      setMenuOpenedOn(null);
      menuButtonRef.current?.focus();
    }
  }

  return (
    <div className="min-h-screen bg-surface text-primary dark:bg-surface-dark dark:text-surface">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-primary"
      >
        Skip to main content
      </a>

      <header
        className="relative z-20 border-b border-primary/10 dark:border-surface/10"
        onKeyDown={closeMenuOnEscape}
      >
        <div
          className={`mx-auto flex ${frameWidth} flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4`}
        >
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight underline decoration-accent decoration-2 underline-offset-[6px]"
          >
            TFM-BIC
          </Link>

          <nav
            aria-label="Primary"
            className="flex grow flex-wrap items-center justify-end gap-x-4 gap-y-2 md:grow-0"
          >
            <button
              ref={menuButtonRef}
              type="button"
              className="rounded-md border border-primary px-3 py-2 text-sm font-medium md:hidden dark:border-surface"
              aria-expanded={menuOpen}
              aria-controls={NAV_LIST_ID}
              onClick={() => setMenuOpenedOn(menuOpen ? null : pathname)}
            >
              Menu
            </button>

            <ul
              id={NAV_LIST_ID}
              className={`${
                menuOpen ? "order-last flex basis-full flex-col items-start py-2" : "hidden"
              } gap-x-4 gap-y-3 md:order-none md:flex md:basis-auto md:flex-row md:flex-wrap md:items-center md:py-0`}
            >
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
              {currentUser ? (
                <>
                  <li>
                    <Link to="/dashboard" className="text-sm hover:underline">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/learn/lessons" className="text-sm hover:underline">
                      Lessons
                    </Link>
                  </li>
                  <li>
                    <Link to="/learn/vocabulary" className="text-sm hover:underline">
                      Vocabulary
                    </Link>
                  </li>
                  <li>
                    <Link to="/learn/phonetics" className="text-sm hover:underline">
                      Phonetics
                    </Link>
                  </li>
                  <li>
                    <Link to="/learn/videos" className="text-sm hover:underline">
                      Videos
                    </Link>
                  </li>
                  <li>
                    <Link to="/achievements" className="text-sm hover:underline">
                      Achievements
                    </Link>
                  </li>
                  {currentUser.role === "TEACHER" ? (
                    <li>
                      <Link to="/teacher" className="text-sm hover:underline">
                        Teaching
                      </Link>
                    </li>
                  ) : null}
                  <li>
                    <Link to="/profile" className="text-sm hover:underline">
                      Profile
                    </Link>
                  </li>
                  <li className="break-all text-sm text-primary/70 dark:text-surface/70">
                    {currentUser.email}
                  </li>
                  <li>
                    <Button
                      variant="secondary"
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                    >
                      Log out
                    </Button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="text-sm hover:underline">
                      Log in
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="text-sm hover:underline">
                      Register
                    </Link>
                  </li>
                </>
              )}
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

      <main
        id="main-content"
        className={fullBleed ? undefined : "mx-auto max-w-5xl px-4"}
        data-layout={fullBleed ? "full-bleed" : undefined}
      >
        <Outlet />
      </main>

      <footer
        className={`border-t border-primary/10 dark:border-surface/10 ${fullBleed ? "" : "mt-12"}`}
      >
        <div
          className={`mx-auto flex ${frameWidth} flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm`}
        >
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              <li>
                <Link to="/learn" className="hover:underline">
                  Languages and levels
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:underline">
                  Privacy notice
                </Link>
              </li>
            </ul>
          </nav>
          <p className="text-primary/70 dark:text-surface/70">© 2026 pvsegura · TFM-BIC</p>
        </div>
      </footer>
    </div>
  );
}
