import { m } from "../i18n/index.js";
import { Link } from "./app-link.js";

/**
 * Public contact channels, set at build time (no code change needed):
 *   VITE_CONTACT_WHATSAPP — international number, digits only (e.g. 48500100200)
 *   VITE_CONTACT_EMAIL    — e.g. kontakt@verbysia.com
 * Until they are set, every contact button leads to the /kontakt page, which says the details
 * are coming soon — never to a made-up number or address.
 */
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const WHATSAPP_DIGITS = (env.VITE_CONTACT_WHATSAPP ?? "").replace(/\D/g, "");
const EMAIL = (env.VITE_CONTACT_EMAIL ?? "").trim();

export const contactChannels = {
  whatsappHref: WHATSAPP_DIGITS.length >= 8 ? `https://wa.me/${WHATSAPP_DIGITS}` : null,
  whatsappDisplay: WHATSAPP_DIGITS.length >= 8 ? `+${WHATSAPP_DIGITS}` : null,
  emailHref: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(EMAIL) ? `mailto:${EMAIL}` : null,
  emailDisplay: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(EMAIL) ? EMAIL : null,
};

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.2.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

const base =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2";

/** A channel button: the real link when configured, otherwise the contact page. */
function ChannelButton({
  href,
  label,
  icon,
  className,
}: {
  href: string | null;
  label: string;
  icon: React.ReactNode;
  className: string;
}) {
  if (href) {
    const external = href.startsWith("https://");
    return (
      <a
        href={href}
        className={`${base} ${className}`}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {icon}
        {label}
      </a>
    );
  }
  return (
    <Link to="/kontakt" className={`${base} ${className}`}>
      {icon}
      {label}
    </Link>
  );
}

export function WhatsAppButton({ compact = false }: { compact?: boolean }) {
  return (
    <ChannelButton
      href={contactChannels.whatsappHref}
      label={compact ? m.marketing.contact.whatsapp : m.marketing.contact.floatingLabel}
      icon={<WhatsAppIcon />}
      className="bg-[#25D366] text-[#0b3d1f] hover:brightness-95"
    />
  );
}

export function EmailButton() {
  return (
    <ChannelButton
      href={contactChannels.emailHref}
      label={m.marketing.contact.email}
      icon={<MailIcon />}
      className="border border-primary hover:bg-primary/5 dark:border-surface dark:hover:bg-surface/10"
    />
  );
}

/** Both channels side by side (hero, footer, contact page). */
export function ContactButtons({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <WhatsAppButton compact={compact} />
      <EmailButton />
    </div>
  );
}

/** The always-visible WhatsApp bubble in the bottom-right corner. */
export function FloatingWhatsApp() {
  const href = contactChannels.whatsappHref;
  const label = m.marketing.contact.floatingLabel;
  const className =
    "fixed bottom-4 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-[#0b3d1f] shadow-lg hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2";
  const icon = (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.2.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={className}
    >
      {icon}
    </a>
  ) : (
    <Link to="/kontakt" aria-label={label} title={label} className={className}>
      {icon}
    </Link>
  );
}
