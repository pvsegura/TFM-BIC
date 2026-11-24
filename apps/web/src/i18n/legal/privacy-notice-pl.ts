import type { LegalDocument } from "../../legal/legal-document.js";

/**
 * The privacy notice in the interface's reference language — the same facts as
 * `legal/privacy-notice.ts` (same version id, same sections). DRAFT pending legal review.
 */
export const PRIVACY_NOTICE_PL: LegalDocument = {
  version: "privacy-policy-v2",
  date: "2026-11-24",
  status: "draft-pending-legal-review",
  title: "Polityka prywatności",
  reviewNote:
    "Ta polityka jest projektem, który czeka na weryfikację prawną. Opisuje, co aplikacja faktycznie robi dzisiaj, ale nie została jeszcze sprawdzona przez prawnika, a część informacji poniżej czeka na tę weryfikację.",
  sections: [
    {
      id: "who",
      heading: "Kto odpowiada za Twoje dane",
      paragraphs: [
        "Dane administratora Twoich danych osobowych (nazwa i dane kontaktowe) czekają na weryfikację prawną i zostaną dodane do tej polityki przed uruchomieniem płatności rzeczywistych. [DO UZUPEŁNIENIA]",
      ],
    },
    {
      id: "what",
      heading: "Jakie dane przechowujemy",
      paragraphs: [
        "Aplikacja przechowuje tylko to, czego potrzebuje do prowadzenia konta i nauki:",
      ],
      items: [
        "Konto: adres e-mail, hasło (wyłącznie jako jednokierunkowy skrót, którego nie da się odczytać), rola (uczeń, nauczyciel lub administrator), informacja, czy adres e-mail jest potwierdzony, oraz daty utworzenia i ostatniej zmiany konta.",
        "Profil, jeśli go uzupełnisz: imię, nazwisko, pseudonim i wybrany awatar.",
        "Aktywność w nauce: rozpoczęte i ukończone lekcje, każda przesłana odpowiedź w ćwiczeniach i to, czy była poprawna, punkty i osiągnięcia, zapisane słówka i ich status, postępy w fonetyce oraz zlecenia wygenerowania filmów.",
        "Zakupy: kupiony produkt, kwota, waluta i data, identyfikatory płatności, klienta i subskrypcji u operatora płatności, status i data odnowienia subskrypcji oraz dostęp (licencje), który dają. Dane kart nigdy do nas nie trafiają — obsługuje je operator płatności.",
        "Trener pamięci: powtarzane słówka, ocena, jak dobrze je pamiętasz, i termin kolejnej powtórki.",
        "Ustawienia e-maili: czy zapisałeś(-aś) się do newslettera, którą wersję treści zgody zaakceptowałeś(-aś) oraz kiedy się zapisałeś(-aś), potwierdziłeś(-aś) lub wypisałeś(-aś).",
        "Bezpieczeństwo: sesje logowania oraz jednorazowe linki do potwierdzenia adresu e-mail i zmiany hasła, przechowywane wyłącznie jako skróty.",
        "Powiązania z nauczycielem: jeśli operator powiązał Twoje konto z nauczycielem — to powiązanie i data jego utworzenia.",
        "Logi serwera: metoda, ścieżka (bez parametrów) i adres IP każdego żądania oraz niektóre zdarzenia z wewnętrznym identyfikatorem konta — nigdy hasło, sesja, odpowiedzi ani eksportowane dane.",
      ],
    },
    {
      id: "browser",
      heading: "Pliki cookie i pamięć przeglądarki",
      paragraphs: [
        "Plik cookie sesji, który utrzymuje Cię zalogowanym(-ą) (wygasa po 7 dniach lub po wylogowaniu), oraz w pamięci lokalnej przeglądarki: wybór trybu jasnego lub ciemnego, język interfejsu i — tylko jeśli korzystasz z darmowej wersji demo bez konta — postęp w demo, który zostaje na Twoim urządzeniu. Aplikacja nie używa narzędzi analitycznych, reklamowych ani śledzących i nie ładuje skryptów stron trzecich. Dlatego nie wyświetlamy banera zgody na cookies.",
      ],
    },
    {
      id: "why",
      heading: "W jakim celu",
      paragraphs: ["Twoje dane służą do:"],
      items: [
        "założenia konta, logowania i zapewnienia mu bezpieczeństwa;",
        "prowadzenia lekcji i ćwiczeń oraz pokazywania postępów, punktów i osiągnięć;",
        "wysyłania niezbędnych wiadomości, takich jak potwierdzenie adresu e-mail, zmiana hasła, potwierdzenie zakupu i informacje o płatnościach;",
        "przyjmowania płatności, przyznawania opłaconego dostępu i prowadzenia dokumentacji sprzedaży wymaganej przepisami;",
        "wysyłania newslettera — tylko jeśli się zapisałeś(-aś) i potwierdziłeś(-aś) zapis e-mailem;",
        "umożliwienia nauczycielowi powiązanemu z Twoim kontem śledzenia postępów.",
      ],
    },
    {
      id: "legal-basis",
      heading: "Podstawa prawna",
      paragraphs: [
        "Podstawy prawne poszczególnych celów czekają na weryfikację prawną. Newsletter wysyłamy wyłącznie za Twoją wyraźną zgodą, którą możesz w każdej chwili wycofać.",
      ],
    },
    {
      id: "who-sees",
      heading: "Kto ma dostęp",
      paragraphs: [
        "Ty. Nauczyciel powiązany z Twoim kontem widzi imię, nazwisko, pseudonim i awatar, postępy w lekcjach, ćwiczeniach i punktach, ostatnią aktywność i osiągnięcia — nigdy adresu e-mail, przesłanych odpowiedzi, słówek, postępów w fonetyce, ustawień e-maili ani ustawień konta. Operatorzy z dostępem do bazy danych widzą przechowywane dane.",
      ],
    },
    {
      id: "services",
      heading: "Usługi zewnętrzne",
      paragraphs: [],
      items: [
        "Płatności: płatności obsługuje Stripe (Stripe Payments Europe Ltd.). Przy zakupie otrzymuje od nas Twój adres e-mail i identyfikator konta, a dane płatnicze zbiera bezpośrednio na swojej stronie.",
        "E-mail: gdy włączony jest dostawca wysyłki wiadomości (Resend), otrzymuje Twój adres e-mail i treść wysyłanych do Ciebie wiadomości.",
        "Wymowa (audio): jeśli operator ją włączy, tekst słówka lub przykładu jest wysyłany do Gemini API (Google) w celu wygenerowania nagrania. Nie wysyłamy nic o Tobie — ani imienia, ani adresu e-mail, ani identyfikatora konta. Domyślnie wyłączone.",
        "Asystent AI: jeśli operator go włączy, wiadomości, które piszesz do asystenta, i krótkie podsumowanie Twoich postępów (bez imienia, adresu e-mail i identyfikatora konta) są wysyłane do Gemini API (Google) w celu przygotowania odpowiedzi. Aplikacja nie zapisuje rozmowy.",
        "Filmy: filmy są renderowane na własnym serwerze aplikacji; nic o Tobie nie jest nigdzie wysyłane.",
        "Hosting i baza danych: aplikacja działa na Render, a baza danych na Neon (PostgreSQL). [Lokalizacja danych i zabezpieczenia przekazywania czekają na weryfikację prawną.]",
      ],
    },
    {
      id: "retention",
      heading: "Jak długo przechowujemy dane",
      paragraphs: [
        "Dane przechowujemy do czasu usunięcia konta; usunięcie konta usuwa dane konta z bazy aplikacji. Dokumentację sprzedaży możemy być zobowiązani przechowywać przez okres wymagany przepisami podatkowymi i rachunkowymi, a operator płatności prowadzi własną dokumentację. Logi serwera nie są usuwane razem z kontem; okres ich przechowywania zależy od dostawcy hostingu. Pozostałe okresy przechowywania czekają na weryfikację prawną.",
      ],
    },
    {
      id: "controls",
      heading: "Co możesz zrobić sam(a)",
      linkToProfile: true,
      paragraphs: ["W każdej chwili, bez kontaktu z nami, możesz:"],
      items: [
        "poprawić lub usunąć imię, nazwisko, pseudonim i awatar;",
        "pobrać kopię swoich danych w formacie JSON;",
        "wypisać się z newslettera — konto i niezbędne wiadomości pozostają;",
        "trwale usunąć konto i jego dane (wymagane hasło).",
      ],
    },
    {
      id: "rights",
      heading: "Twoje prawa",
      paragraphs: [
        "Przepisy o ochronie danych mogą dawać Ci prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia, sprzeciwu i wycofania zgody, a także prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych. Część z tych praw możesz wykonać sam(a) za pomocą opcji powyżej. Zmiana adresu e-mail nie jest jeszcze dostępna. W innych sprawach — dane kontaktowe administratora czekają na uzupełnienie (zob. „Kto odpowiada za Twoje dane”).",
      ],
    },
    {
      id: "changes",
      heading: "Zmiany polityki",
      paragraphs: [
        "Każda wersja tej polityki ma własny identyfikator, a wcześniejsze wersje pozostają rozpoznawalne. To jest wersja privacy-policy-v2.",
      ],
    },
  ],
};
