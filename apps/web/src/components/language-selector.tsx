import type { LanguageResponse } from "@tfm-bic/contracts";
import { Link } from "react-router";

export interface LanguageSelectorProps {
  /** The catalog, exactly as the API returned it — this component defines no language of its own. */
  languages: readonly LanguageResponse[];
  selectedCode?: string | undefined;
  getHref: (languageCode: string) => string;
}

/**
 * Reusable language chooser. It renders whatever the language catalog
 * contains, so adding a language to the catalog data adds it here with no code
 * change. Each option is a real link (so it is keyboard operable, focusable
 * and announced as a link), the current choice carries `aria-current` *and* a
 * visible check mark — selection is never conveyed by colour alone — and the
 * native name is tagged with the language's own locale and text direction
 * taken from the catalog metadata.
 */
export function LanguageSelector({ languages, selectedCode, getHref }: LanguageSelectorProps) {
  return (
    <nav aria-label="Languages">
      <ul className="grid gap-3 sm:grid-cols-2">
        {languages.map((language) => {
          const selected = language.code === selectedCode;
          const classes = [
            "relative flex flex-col rounded-lg border-2 px-4 py-3 transition-colors",
            "hover:bg-primary/5 dark:hover:bg-surface/10",
            selected
              ? "border-primary bg-primary/5 dark:border-surface dark:bg-surface/10"
              : "border-primary/20 dark:border-surface/20",
          ].join(" ");

          return (
            <li key={language.code}>
              <Link
                to={getHref(language.code)}
                aria-current={selected ? "true" : undefined}
                className={classes}
              >
                <span className="font-medium">{language.name}</span>{" "}
                <span
                  lang={language.locale}
                  dir={language.direction}
                  className="text-sm text-primary/70 dark:text-surface/70"
                >
                  {language.nativeName}
                </span>
                {selected ? (
                  <span
                    aria-hidden="true"
                    data-testid="selected-indicator"
                    className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-surface dark:bg-surface dark:text-primary"
                  >
                    ✓
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
