import { Button } from "@tfm-bic/ui";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Outlet, useLocation, useMatches } from "react-router";
import { Link } from "../components/app-link.js";

import { useCurrentUser } from "../hooks/use-current-user.js";
import { useLogout } from "../hooks/use-logout.js";
import { useThemeStore } from "../state/theme-store.js";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/learn", label: "Learn" },
];

const NAV_LIST_ID = "primary-nav-links";

/** Footer groups: only pages that exist; privacy links jump to the matching notice section. */
const FOOTER_GROUPS = [
  {
    title: "Learn",
    links: [{ to: "/learn", label: "Languages and levels" }],
  },
  {
    title: "Privacy and data",
    links: [
      { to: "/privacy", label: "Privacy notice" },
      { to: "/privacy#privacy-what", label: "Data we store" },
      { to: "/privacy#privacy-browser", label: "Cookies and browser storage" },
      { to: "/privacy#privacy-why", label: "How your data is used" },
      { to: "/privacy#privacy-rights", label: "Your rights" },
      { to: "/profile#data-management-heading", label: "Download or delete your data" },
    ],
  },
  {
    title: "Contact",
    links: [{ to: "/privacy#privacy-who", label: "Who is responsible" }],
  },
] as const;

const supportsViewTransitions =
  typeof document !== "undefined" && "startViewTransition" in document;

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
  const { pathname, hash } = useLocation();

  // In-page links (e.g. /privacy#privacy-rights): once the page has rendered, scroll to the target.
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    }, 150);
    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname, hash]);
  const fullBleed = useMatches().some((match) => isFullBleedHandle(match.handle));
  const frameWidth = fullBleed ? "max-w-7xl" : "max-w-5xl";
  // M21: the signed-in navigation needs the wider frame to stay on one row; content keeps its column.
  const headerWidth = "max-w-7xl";

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
    <div className="app-paper flex min-h-screen flex-col text-primary dark:text-surface">
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
          className={`mx-auto flex ${headerWidth} flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4`}
        >
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight underline decoration-accent decoration-2 underline-offset-[6px]"
          >
            TFM-BIC
          </Link>

          <nav
            aria-label="Primary"
            className="flex grow flex-wrap items-center justify-end gap-x-4 gap-y-2 xl:grow-0"
          >
            <button
              ref={menuButtonRef}
              type="button"
              className="rounded-md border border-primary px-3 py-2 text-sm font-medium xl:hidden dark:border-surface"
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
              } gap-x-4 gap-y-3 xl:order-none xl:flex xl:basis-auto xl:flex-row xl:flex-nowrap xl:items-center xl:py-0`}
            >
              {NAV_LINKS.filter((link) => !(currentUser && link.to === "/")).map((link) => (
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
                    <Link to="/learn/videos" className="text-sm hover:underline">
                      Videos
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
                    <Link to="/learn/grammar" className="text-sm hover:underline">
                      Grammar
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
                  <li
                    className="max-w-[16rem] truncate text-sm text-primary/70 xl:max-w-[11rem] dark:text-surface/70"
                    title={currentUser.email}
                  >
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
        // flex-1 keeps the footer at the bottom of the window on short pages.
        className={`w-full flex-1 ${fullBleed ? "" : "app-column mx-auto max-w-5xl px-4"}`}
        data-layout={fullBleed ? "full-bleed" : undefined}
      >
        {/* Without the View Transitions API, each new page still fades in (keyed by path). */}
        <div key={pathname} className={supportsViewTransitions ? undefined : "page-enter"}>
          <Outlet />
        </div>
      </main>

      <footer
        className={`border-t border-primary/10 bg-paper-shade/40 dark:border-surface/10 dark:bg-night-paper/40 ${fullBleed ? "" : "mt-12"}`}
      >
        <div className={`mx-auto ${frameWidth} px-4 py-8 font-display text-[0.95rem]`}>
          <nav aria-label="Footer" className="grid gap-6 sm:grid-cols-3">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className="text-base font-bold tracking-tight text-accent-ink dark:text-accent">
                  {group.title}
                </h2>
                <ul className="mt-2 space-y-1.5 font-medium">
                  {group.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className="hover:underline">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <p className="mt-6 border-t border-primary/10 pt-4 text-sm text-primary/70 dark:border-surface/10 dark:text-surface/70">
            © 2026 pvsegura · TFM-BIC · A study project; contact details and legal review are
            pending.
          </p>
        </div>
      </footer>
    </div>
  );
}
