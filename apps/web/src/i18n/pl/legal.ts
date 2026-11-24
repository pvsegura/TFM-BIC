/** Labels around the legal texts (the texts themselves are in i18n/legal). */
export const legal = {
  version: (version: string, date: string) => `Wersja ${version} · ${date}`,
  profileLinkBefore: "Te opcje znajdziesz na ",
  profileLink: "stronie profilu",
  profileLinkAfter: ".",
} as const;
