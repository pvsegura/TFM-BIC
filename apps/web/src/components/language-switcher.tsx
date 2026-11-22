import type { ReactElement } from "react";

import {
  INTERFACE_LANGUAGES,
  LANGUAGE,
  setInterfaceLanguage,
  type InterfaceLanguage,
} from "../i18n/index.js";

/**
 * Inline SVG flags (emoji flags don't render on Windows). Simplified designs: Poland, the United
 * Kingdom for English, Spain without the coat of arms.
 */
const FLAG_SIZE = {
  width: 24,
  height: 16,
  viewBox: "0 0 24 16",
  "aria-hidden": true as const,
  className: "rounded-[2px] shadow-sm",
};

const FLAGS: Record<InterfaceLanguage, () => ReactElement> = {
  pl: () => (
    <svg {...FLAG_SIZE}>
      <rect width="24" height="8" fill="#ffffff" />
      <rect y="8" width="24" height="8" fill="#dc143c" />
      <rect width="24" height="16" fill="none" stroke="#00000022" />
    </svg>
  ),
  es: () => (
    <svg {...FLAG_SIZE}>
      <rect width="24" height="16" fill="#c60b1e" />
      <rect y="4" width="24" height="8" fill="#ffc400" />
    </svg>
  ),
  en: () => (
    <svg {...FLAG_SIZE}>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0L24 16M24 0L0 16" stroke="#ffffff" strokeWidth="3.2" />
      <path d="M0 0L24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.2" />
      <path d="M12 0V16M0 8H24" stroke="#ffffff" strokeWidth="5" />
      <path d="M12 0V16M0 8H24" stroke="#c8102e" strokeWidth="3" />
    </svg>
  ),
};

function Flag({ code }: { code: InterfaceLanguage }) {
  const Svg = FLAGS[code];
  return <Svg />;
}

/** Interface language flags in the header. Each label is written in its own language. */
export function LanguageSwitcher() {
  return (
    <ul className="flex items-center gap-1" aria-label="Język / Language / Idioma">
      {INTERFACE_LANGUAGES.map((language) => {
        const current = language.code === LANGUAGE;
        return (
          <li key={language.code}>
            <button
              type="button"
              lang={language.code}
              title={language.label}
              aria-label={language.label}
              aria-pressed={current}
              onClick={() => setInterfaceLanguage(language.code)}
              className={`flex items-center rounded-md p-1.5 transition ${
                current
                  ? "bg-primary/10 ring-2 ring-accent dark:bg-surface/15"
                  : "opacity-70 hover:bg-primary/5 hover:opacity-100 dark:hover:bg-surface/10"
              }`}
            >
              <Flag code={language.code} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
