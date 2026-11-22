export const errors = {
  network: "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.",
  byStatus: {
    400: "Sprawdź wprowadzone dane i spróbuj ponownie.",
    401: "Sesja wygasła. Zaloguj się ponownie.",
    403: "Nie masz dostępu do tej treści.",
    404: "Nie znaleziono tej treści.",
    409: "Tej operacji nie można teraz wykonać.",
    413: "Przesłane dane są za duże.",
    429: "Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.",
    500: "Wystąpił błąd serwera. Spróbuj ponownie za chwilę.",
    503: "Serwis jest chwilowo niedostępny. Spróbuj ponownie za chwilę.",
  } as Partial<Record<number, string>>,
  fixFields: "Popraw zaznaczone pola.",
} as const;
