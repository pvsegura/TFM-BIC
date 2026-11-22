/**
 * Interface texts (Verbysia). Every user-facing string lives in a typed message catalog, never
 * inline in components. Polish is the default interface language; English and Spanish are
 * available from the flag switcher in the header. Each catalog has the same `Messages` shape
 * (the compiler lists every missing key).
 *
 * The chosen language is a per-browser convenience kept in localStorage and applied by reloading
 * the page, so every module reads one fixed catalog. Course content (the lessons for Polish
 * speakers) comes from the content files and is not affected by this choice.
 */
import { en } from "./en/index.js";
import { es } from "./es/index.js";
import { pl, type Messages } from "./pl/index.js";

export type { Messages };

export const INTERFACE_LANGUAGES = [
  { code: "pl", label: "Polski", locale: "pl-PL" },
  { code: "en", label: "English", locale: "en-GB" },
  { code: "es", label: "Español", locale: "es-ES" },
] as const;
export type InterfaceLanguage = (typeof INTERFACE_LANGUAGES)[number]["code"];

const CATALOGS: Record<InterfaceLanguage, Messages> = { pl, en, es };
const STORAGE_KEY = "verbysia-interface-language";
const DEFAULT_LANGUAGE: InterfaceLanguage = "pl";

function isInterfaceLanguage(value: unknown): value is InterfaceLanguage {
  return INTERFACE_LANGUAGES.some((language) => language.code === value);
}

function storedLanguage(): InterfaceLanguage {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY);
    return isInterfaceLanguage(value) ? value : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export const LANGUAGE: InterfaceLanguage = storedLanguage();
export const LOCALE: string =
  INTERFACE_LANGUAGES.find((language) => language.code === LANGUAGE)?.locale ?? "pl-PL";
export const HTML_LANG: string = LANGUAGE;

/** The active catalog. */
export const m: Messages = CATALOGS[LANGUAGE];

if (typeof document !== "undefined") {
  document.documentElement.lang = HTML_LANG;
}

/** Saves the choice and reloads, so the whole interface switches at once. */
export function setInterfaceLanguage(code: InterfaceLanguage): void {
  if (code === LANGUAGE) return;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, code);
  } catch {
    // Storage blocked (private mode): the switch cannot persist, so do nothing.
    return;
  }
  window.location.reload();
}

/**
 * Polish plural forms: 1 → `one`; 2–4 (not 12–14) → `few`; everything else → `many`.
 * `plural(5, ["słowo", "słowa", "słów"])` → "5 słów".
 */
export function plural(
  count: number,
  forms: readonly [one: string, few: string, many: string],
): string {
  const abs = Math.abs(count);
  const lastTwo = abs % 100;
  const last = abs % 10;
  let form: string;
  if (abs === 1) form = forms[0];
  else if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) form = forms[1];
  else form = forms[2];
  return `${count.toLocaleString("pl-PL")} ${form}`;
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | Date): string {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

/** `formatPrice(4900, "PLN")` → "49 zł" (in Polish); minor units shown only when present. */
export function formatPrice(minor: number, currency: string): string {
  const major = minor / 100;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
}

export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 0 }).format(
    ratio,
  );
}
