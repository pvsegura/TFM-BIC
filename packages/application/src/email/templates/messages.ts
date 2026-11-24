/**
 * Email wording, kept apart from rendering and from the use cases (M14). One entry per locale.
 * Polish is the default: Verbysia's learners are Polish speakers and the interface is Polish.
 * Adding a locale means adding an entry here — no template or use case changes.
 */
export const EMAIL_LOCALES = ["pl", "en"] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];
export const DEFAULT_EMAIL_LOCALE: EmailLocale = "pl";

interface ActionCopy {
  readonly subject: string;
  readonly heading: string;
  readonly body: string;
  readonly action: string;
  readonly note: string;
}

export interface EmailMessages {
  readonly productName: string;
  readonly footerTransactional: string;
  readonly footerMarketing: string;
  readonly unsubscribeLabel: string;
  readonly linkFallback: string;
  readonly emailVerification: ActionCopy;
  readonly passwordReset: ActionCopy;
  readonly newsletterConfirmation: ActionCopy;
  /** `{product}` and `{amount}` are replaced with escaped values. */
  readonly purchaseConfirmation: ActionCopy & { readonly amountLabel: string };
  /** `{product}` is replaced with the escaped product name. */
  readonly paymentFailed: ActionCopy;
  /** `{product}` is replaced with the escaped product name. */
  readonly subscriptionEnded: ActionCopy;
}

export const EMAIL_MESSAGES: Record<EmailLocale, EmailMessages> = {
  pl: {
    productName: "Verbysia",
    footerTransactional:
      "To wiadomość dotycząca Twojego konta. Wysyłamy ją w związku z działaniem na koncie — to nie jest newsletter.",
    footerMarketing:
      "Otrzymujesz ten newsletter, bo zapisałeś(-aś) się i potwierdziłeś(-aś) zapis.",
    unsubscribeLabel: "Wypisz się",
    linkFallback: "Jeśli przycisk nie działa, skopiuj ten link do przeglądarki:",
    emailVerification: {
      subject: "Potwierdź swój adres e-mail",
      heading: "Potwierdź adres e-mail",
      body: "Dziękujemy za założenie konta w Verbysii. Potwierdź, że ten adres e-mail należy do Ciebie.",
      action: "Potwierdzam adres e-mail",
      note: "Link jest ważny 24 godziny. Jeśli nie zakładałeś(-aś) konta, zignoruj tę wiadomość.",
    },
    passwordReset: {
      subject: "Zmiana hasła",
      heading: "Ustaw nowe hasło",
      body: "Ktoś poprosił o zmianę hasła do Twojego konta. Kliknij poniżej, aby ustawić nowe.",
      action: "Ustaw nowe hasło",
      note: "Link jest ważny 1 godzinę i działa jeden raz. Jeśli to nie Ty, zignoruj tę wiadomość — hasło się nie zmieni.",
    },
    newsletterConfirmation: {
      subject: "Potwierdź zapis do newslettera",
      heading: "Potwierdź zapis do newslettera",
      body: "Poprosiłeś(-aś) o newsletter Verbysii z nowymi lekcjami i wskazówkami do nauki hiszpańskiego. Potwierdź zapis.",
      action: "Potwierdzam zapis",
      note: "Link jest ważny 48 godzin. Jeśli to nie Ty, zignoruj tę wiadomość — nie zapiszemy Cię.",
    },
    purchaseConfirmation: {
      subject: "Dziękujemy za zakup: {product}",
      heading: "Twój dostęp jest aktywny",
      body: "Płatność za „{product}” została przyjęta. Dostęp do materiałów jest już aktywny na Twoim koncie. Potwierdzamy, że przed zakupem zaakceptowałeś(-aś) Regulamin i zażądałeś(-aś) udostępnienia treści cyfrowych od razu, przyjmując do wiadomości, że z chwilą udostępnienia tracisz prawo odstąpienia od umowy.",
      amountLabel: "Kwota",
      action: "Przejdź do kursu",
      note: "Fakturę lub potwierdzenie płatności znajdziesz w ustawieniach konta (Płatności). Masz pytania? Odpowiedz na tę wiadomość.",
    },
    paymentFailed: {
      subject: "Nie udało się pobrać płatności: {product}",
      heading: "Problem z płatnością",
      body: "Nie udało nam się pobrać płatności za „{product}”. Dostęp pozostaje aktywny jeszcze przez kilka dni — zaktualizuj kartę, aby go nie stracić.",
      action: "Zaktualizuj płatność",
      note: "Jeśli płatność została już poprawiona, zignoruj tę wiadomość.",
    },
    subscriptionEnded: {
      subject: "Subskrypcja zakończona: {product}",
      heading: "Twoja subskrypcja się zakończyła",
      body: "Subskrypcja „{product}” została zakończona. Twoje postępy i słówka zostają na koncie — bezpłatne materiały są nadal dostępne.",
      action: "Zobacz cennik",
      note: "Jeśli to pomyłka, możesz wznowić dostęp w każdej chwili.",
    },
  },
  en: {
    productName: "Verbysia",
    footerTransactional:
      "This is an account email. It is sent because of an action on your account and is not a newsletter.",
    footerMarketing:
      "You receive this newsletter because you subscribed and confirmed your subscription.",
    unsubscribeLabel: "Unsubscribe",
    linkFallback: "If the button does not work, copy this link into your browser:",
    emailVerification: {
      subject: "Verify your email address",
      heading: "Confirm your email address",
      body: "Thanks for creating an account. Please confirm that this email address is yours.",
      action: "Verify email address",
      note: "This link expires in 24 hours. If you did not create an account, you can ignore this email.",
    },
    passwordReset: {
      subject: "Reset your password",
      heading: "Reset your password",
      body: "Someone asked to reset the password for your account. Use the link below to choose a new one.",
      action: "Choose a new password",
      note: "This link expires in 1 hour and can be used once. If you did not request a reset, you can ignore this email — your password will not change.",
    },
    newsletterConfirmation: {
      subject: "Confirm your newsletter subscription",
      heading: "Confirm your newsletter subscription",
      body: "You asked to receive our newsletter with news about lessons and features. Please confirm this request.",
      action: "Confirm subscription",
      note: "This link expires in 48 hours. If you did not ask for this, ignore this email — you will not be subscribed.",
    },
    purchaseConfirmation: {
      subject: "Thank you for your purchase: {product}",
      heading: "Your access is active",
      body: "Your payment for “{product}” was received. Your access is already active on your account. We confirm that before buying you accepted the terms of sale and asked for the digital content to be made available straight away, acknowledging that you lose the right of withdrawal once it is made available.",
      amountLabel: "Amount",
      action: "Go to the course",
      note: "Invoices and payment receipts are in your account settings (Payments). Questions? Just reply to this email.",
    },
    paymentFailed: {
      subject: "We could not take your payment: {product}",
      heading: "Payment problem",
      body: "We could not take the payment for “{product}”. Your access stays active for a few more days — update your card to keep it.",
      action: "Update payment",
      note: "If you have already fixed the payment, you can ignore this email.",
    },
    subscriptionEnded: {
      subject: "Subscription ended: {product}",
      heading: "Your subscription has ended",
      body: "Your “{product}” subscription has ended. Your progress and words stay on your account, and the free material is still available.",
      action: "See prices",
      note: "If this was a mistake, you can restart your access at any time.",
    },
  },
};
