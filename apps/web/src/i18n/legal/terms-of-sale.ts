/**
 * The terms of sale ("Regulamin") — content, not code, rendered by `LegalDocumentPage`. DRAFT
 * pending legal review: it describes how the service actually works (free material, the A1
 * course, Premium subscriptions through Stripe, server-side licences) and leaves the seller's
 * identity as an explicit placeholder rather than inventing it. Polish is the binding version.
 *
 * Versioning: the id must match `CURRENT_TERMS_VERSION` in @verbysia/contracts, which the
 * checkout records with each payment. A new wording gets a new id; an id is never rewritten.
 */
import type { LegalDocument } from "../../legal/legal-document.js";

const SELLER_PL = "[DANE SPRZEDAWCY DO UZUPEŁNIENIA: imię i nazwisko lub firma, adres, NIP]";
const SELLER_EN = "[SELLER DETAILS TO BE ADDED: name or company, address, tax number]";
const CONTACT_PL = "[ADRES E-MAIL DO UZUPEŁNIENIA]";
const CONTACT_EN = "[CONTACT EMAIL TO BE ADDED]";

export const TERMS_OF_SALE_PL: LegalDocument = {
  version: "regulamin-v1",
  date: "2026-11-24",
  status: "draft-pending-legal-review",
  title: "Regulamin serwisu Verbysia",
  reviewNote:
    "To jest projekt regulaminu, który czeka na weryfikację prawną. Opisuje, jak serwis faktycznie działa, ale dane sprzedawcy i część postanowień zostaną uzupełnione przed uruchomieniem płatności rzeczywistych.",
  sections: [
    {
      id: "general",
      heading: "§1. Postanowienia ogólne",
      paragraphs: [
        `Serwis internetowy www.verbysia.com (dalej: „Serwis”) prowadzi ${SELLER_PL} (dalej: „Sprzedawca”). Kontakt: ${CONTACT_PL} lub formularz na stronie Kontakt.`,
        "Regulamin określa zasady korzystania z Serwisu, zawierania umów o dostarczanie treści i usług cyfrowych oraz składania reklamacji. Regulamin jest udostępniany bezpłatnie przed zawarciem umowy w sposób umożliwiający jego zapisanie i wydrukowanie.",
      ],
      items: [
        "Konsument — osoba fizyczna zawierająca umowę niezwiązaną bezpośrednio z jej działalnością gospodarczą lub zawodową.",
        "Przedsiębiorca na prawach konsumenta — osoba fizyczna prowadząca działalność gospodarczą, dla której umowa nie ma charakteru zawodowego; przysługują jej uprawnienia konsumenta w zakresie przewidzianym przepisami.",
        "Treści cyfrowe — lekcje, ćwiczenia, nagrania, słownictwo i inne materiały dostępne w Serwisie.",
        "Konto — indywidualny profil Użytkownika w Serwisie, chroniony hasłem.",
        "Licencja — prawo dostępu do płatnych Treści cyfrowych przypisane do Konta.",
      ],
    },
    {
      id: "services",
      heading: "§2. Co oferujemy",
      paragraphs: [
        "Verbysia to platforma do samodzielnej nauki języka hiszpańskiego dla osób mówiących po polsku. Serwis nie prowadzi lekcji na żywo i nie gwarantuje osiągnięcia określonego poziomu ani płynności — efekty zależą od regularnej nauki.",
      ],
      items: [
        "Bezpłatnie: Konto, wyzwanie „7 dni, żeby zacząć mówić po hiszpańsku”, jednostka 1 kursu A1, test słuchu, przykładowa lekcja i fragment książki.",
        "Kurs A1 — jednorazowa opłata, dostęp do wszystkich jednostek A1 przez czas wskazany przy produkcie (domyślnie bezterminowo, dopóki Serwis działa).",
        "Premium — subskrypcja miesięczna lub roczna, dająca dostęp do wszystkich dostępnych poziomów.",
        "Ceny są podane w złotych polskich i są cenami końcowymi. [STATUS VAT DO UZUPEŁNIENIA]",
      ],
    },
    {
      id: "requirements",
      heading: "§3. Wymagania techniczne i zasady korzystania",
      paragraphs: [
        "Do korzystania z Serwisu potrzebne są: urządzenie z dostępem do internetu, aktualna przeglądarka z włączoną obsługą JavaScript i plików cookie oraz aktywny adres e-mail.",
        "Zabronione jest dostarczanie treści o charakterze bezprawnym, udostępnianie Konta osobom trzecim oraz kopiowanie i rozpowszechnianie materiałów Serwisu.",
      ],
    },
    {
      id: "account",
      heading: "§4. Konto",
      paragraphs: [
        "Założenie Konta jest bezpłatne i wymaga podania adresu e-mail oraz hasła. Umowa o prowadzenie Konta jest zawierana na czas nieokreślony.",
        "Możesz usunąć Konto w każdej chwili w ustawieniach profilu. Usunięcie Konta kończy dostęp do wszystkich Licencji przypisanych do Konta.",
      ],
    },
    {
      id: "orders",
      heading: "§5. Zamówienia i płatności",
      paragraphs: [
        "Aby kupić produkt, należy zalogować się, wybrać produkt w Cenniku, zaakceptować Regulamin i złożyć oświadczenie z §7 ust. 2, a następnie zapłacić na stronie operatora płatności.",
        "Płatności obsługuje Stripe Payments Europe Ltd. Dostępne metody płatności są wyświetlane na stronie płatności. Sprzedawca nie przechowuje danych kart płatniczych.",
        "Umowa zostaje zawarta z chwilą potwierdzenia płatności przez operatora. Dostęp jest przyznawany automatycznie, zwykle w ciągu kilku sekund. Potwierdzenie zawarcia umowy, wraz z treścią złożonych oświadczeń, wysyłamy na adres e-mail przypisany do Konta.",
      ],
    },
    {
      id: "subscriptions",
      heading: "§6. Subskrypcja Premium",
      paragraphs: [
        "Subskrypcja odnawia się automatycznie na kolejny okres (miesiąc lub rok), a opłata jest pobierana na początku każdego okresu.",
        "Subskrypcję możesz anulować w każdej chwili w panelu płatności (Profil → Płatności i subskrypcja). Anulowanie działa na koniec opłaconego okresu — do tego czasu dostęp pozostaje aktywny.",
        "Jeśli odnowienie się nie powiedzie, powiadomimy Cię e-mailem; dostęp pozostaje aktywny przez 3 dni, aby można było zaktualizować metodę płatności.",
      ],
    },
    {
      id: "withdrawal",
      heading: "§7. Prawo odstąpienia od umowy",
      paragraphs: [
        "1. Konsument może odstąpić od umowy zawartej na odległość w terminie 14 dni od dnia jej zawarcia, bez podawania przyczyny. Wystarczy wysłać oświadczenie (np. według wzoru poniżej) na adres e-mail Sprzedawcy przed upływem terminu.",
        "2. W przypadku treści cyfrowych niedostarczanych na nośniku materialnym prawo odstąpienia nie przysługuje, jeżeli Sprzedawca rozpoczął świadczenie za wyraźną i uprzednią zgodą Konsumenta, który został poinformowany przed rozpoczęciem świadczenia, że po jego spełnieniu utraci prawo odstąpienia, przyjął to do wiadomości, a Sprzedawca przekazał mu potwierdzenie. Zgodę tę składasz, zaznaczając odpowiednie pole przed przejściem do płatności; potwierdzenie otrzymujesz e-mailem.",
        "3. Zasady odstąpienia od subskrypcji Premium jako usługi cyfrowej, w tym ewentualne proporcjonalne rozliczenie, wymagają weryfikacji prawnej. [DO WERYFIKACJI]",
        "4. W razie skutecznego odstąpienia zwracamy płatność niezwłocznie, nie później niż w terminie 14 dni, tą samą metodą płatności, a dostęp do płatnych treści wygasa.",
      ],
    },
    {
      id: "complaints",
      heading: "§8. Reklamacje",
      paragraphs: [
        `Sprzedawca odpowiada za zgodność treści cyfrowych z umową. Jeśli coś nie działa lub materiały nie odpowiadają opisowi, napisz na ${CONTACT_PL}, opisując problem i podając adres e-mail Konta.`,
        "Odpowiadamy na reklamacje w ciągu 14 dni. W razie braku zgodności z umową Konsument może żądać doprowadzenia treści do zgodności z umową, a w przypadkach przewidzianych przepisami — obniżenia ceny lub odstąpienia od umowy.",
      ],
    },
    {
      id: "licence",
      heading: "§9. Prawa autorskie i licencja",
      paragraphs: [
        "Wszystkie materiały Serwisu są chronione prawem autorskim. Licencja uprawnia wyłącznie do osobistej, niekomercyjnej nauki w ramach własnego Konta. Nie wolno ich kopiować, odsprzedawać ani udostępniać innym osobom.",
      ],
    },
    {
      id: "disputes",
      heading: "§10. Pozasądowe rozwiązywanie sporów",
      paragraphs: [
        "Konsument może skorzystać z bezpłatnej pomocy miejskiego lub powiatowego rzecznika konsumentów, organizacji konsumenckich oraz wojewódzkich inspektoratów Inspekcji Handlowej. Informacje są dostępne na stronie prawakonsumenta.uokik.gov.pl.",
      ],
    },
    {
      id: "privacy",
      heading: "§11. Dane osobowe",
      paragraphs: [
        "Zasady przetwarzania danych osobowych opisuje Polityka prywatności dostępna w stopce Serwisu.",
      ],
    },
    {
      id: "final",
      heading: "§12. Postanowienia końcowe",
      paragraphs: [
        "O zmianach Regulaminu informujemy z wyprzedzeniem co najmniej 14 dni. Zmiany nie dotyczą umów już zawartych w sposób niekorzystny dla Konsumenta, chyba że Konsument wyrazi na to zgodę.",
        "Regulamin podlega prawu polskiemu. Nie ogranicza on praw Konsumenta wynikających z bezwzględnie obowiązujących przepisów, w tym przepisów kraju zwykłego pobytu Konsumenta.",
      ],
    },
    {
      id: "withdrawal-form",
      heading: "Załącznik — wzór formularza odstąpienia od umowy",
      paragraphs: [
        "(formularz ten należy wypełnić i odesłać tylko w przypadku chęci odstąpienia od umowy)",
        `Adresat: ${SELLER_PL}, ${CONTACT_PL}`,
        "Ja/My(*) niniejszym informuję/informujemy(*) o moim/naszym odstąpieniu od umowy o dostarczenie następujących treści cyfrowych / świadczenie usługi cyfrowej(*): …",
        "Data zawarcia umowy: … · Imię i nazwisko konsumenta(-ów): … · Adres e-mail Konta: … · Data: …",
        "(*) Niepotrzebne skreślić.",
      ],
    },
  ],
};

export const TERMS_OF_SALE_EN: LegalDocument = {
  version: "regulamin-v1",
  date: "2026-11-24",
  status: "draft-pending-legal-review",
  title: "Verbysia terms of sale",
  reviewNote:
    "This is a draft pending legal review and an informational translation: the Polish version is binding. The seller's details and some clauses will be completed before real payments are switched on.",
  sections: [
    {
      id: "general",
      heading: "1. General",
      paragraphs: [
        `The website www.verbysia.com (the “Service”) is run by ${SELLER_EN} (the “Seller”). Contact: ${CONTACT_EN} or the form on the Contact page.`,
        "These terms set out how to use the Service, how contracts for digital content and services are made, and how to complain. They are available free of charge before any contract, in a form you can save and print.",
      ],
    },
    {
      id: "services",
      heading: "2. What we offer",
      paragraphs: [
        "Verbysia is a self-study platform for Polish speakers learning Spanish. There are no live classes, and no particular level or fluency is guaranteed — results depend on regular study.",
      ],
      items: [
        "Free: the account, the 7-day challenge, unit 1 of the A1 course, the listening test, a demo lesson and a sample of the book.",
        "A1 course — a one-off payment for all A1 units, for the period shown with the product (by default with no end date, while the Service runs).",
        "Premium — a monthly or yearly subscription giving access to every available level.",
        "Prices are in Polish złoty and are final prices. [VAT STATUS TO BE ADDED]",
      ],
    },
    {
      id: "requirements",
      heading: "3. Technical requirements and rules",
      paragraphs: [
        "You need an internet-connected device, an up-to-date browser with JavaScript and cookies enabled, and a working email address.",
        "You may not post unlawful content, share your account with others, or copy or distribute the Service's material.",
      ],
    },
    {
      id: "account",
      heading: "4. Account",
      paragraphs: [
        "The account is free and needs an email address and a password. The account contract has no end date.",
        "You can delete your account at any time in your profile. Deleting it ends access to every licence on the account.",
      ],
    },
    {
      id: "orders",
      heading: "5. Orders and payment",
      paragraphs: [
        "To buy, sign in, choose a product on the Prices page, accept these terms and make the statement in section 7(2), then pay on the payment provider's page.",
        "Payments are handled by Stripe Payments Europe Ltd. The available payment methods are shown on the payment page. The Seller never stores card details.",
        "The contract is made when the provider confirms the payment. Access is granted automatically, usually within seconds. We email a confirmation, including the statements you made, to your account's address.",
      ],
    },
    {
      id: "subscriptions",
      heading: "6. Premium subscription",
      paragraphs: [
        "The subscription renews automatically for the next period (month or year) and is charged at the start of each period.",
        "You can cancel at any time in the billing portal (Profile → Payments and subscription). Cancelling takes effect at the end of the paid period; access stays active until then.",
        "If a renewal fails, we email you; access stays active for 3 days so you can update your payment method.",
      ],
    },
    {
      id: "withdrawal",
      heading: "7. Right of withdrawal",
      paragraphs: [
        "1. A consumer may withdraw from a distance contract within 14 days of making it, without giving a reason, by sending a statement (for example using the form below) to the Seller's email before the deadline.",
        "2. For digital content not supplied on a tangible medium, the right of withdrawal does not apply once the Seller has started performance with the consumer's express prior consent, after the consumer was told they would lose the right of withdrawal and acknowledged it, and the Seller sent a confirmation. You give this consent by ticking the box before going to payment; the confirmation comes by email.",
        "3. Withdrawal from the Premium subscription as a digital service, including any pro-rata settlement, is pending legal review. [TO BE REVIEWED]",
        "4. After a valid withdrawal we refund the payment without delay and within 14 days at the latest, using the same payment method, and access to the paid material ends.",
      ],
    },
    {
      id: "complaints",
      heading: "8. Complaints",
      paragraphs: [
        `The Seller is responsible for the digital content conforming to the contract. If something does not work or does not match its description, write to ${CONTACT_EN} describing the problem and giving your account's email address.`,
        "We answer complaints within 14 days. If the content does not conform, a consumer may ask for it to be brought into conformity and, where the law provides, for a price reduction or to withdraw from the contract.",
      ],
    },
    {
      id: "licence",
      heading: "9. Copyright and licence",
      paragraphs: [
        "All material is protected by copyright. A licence allows personal, non-commercial study on your own account only. It may not be copied, resold or shared with others.",
      ],
    },
    {
      id: "disputes",
      heading: "10. Out-of-court dispute resolution",
      paragraphs: [
        "Consumers in Poland can get free help from municipal or district consumer ombudsmen, consumer organisations and the regional Trade Inspection offices. Information is available at prawakonsumenta.uokik.gov.pl.",
      ],
    },
    {
      id: "privacy",
      heading: "11. Personal data",
      paragraphs: [
        "How personal data is handled is described in the Privacy notice in the footer.",
      ],
    },
    {
      id: "final",
      heading: "12. Final provisions",
      paragraphs: [
        "We announce changes to these terms at least 14 days in advance. Changes do not affect contracts already made to a consumer's disadvantage unless the consumer agrees.",
        "These terms are governed by Polish law. They do not limit a consumer's rights under mandatory law, including the law of the consumer's country of habitual residence.",
      ],
    },
    {
      id: "withdrawal-form",
      heading: "Annex — model withdrawal form",
      paragraphs: [
        "(complete and return this form only if you wish to withdraw from the contract)",
        `To: ${SELLER_EN}, ${CONTACT_EN}`,
        "I/We(*) hereby give notice that I/we(*) withdraw from my/our(*) contract for the supply of the following digital content / digital service(*): …",
        "Contract date: … · Name of consumer(s): … · Account email: … · Date: …",
        "(*) Delete as appropriate.",
      ],
    },
  ],
};
