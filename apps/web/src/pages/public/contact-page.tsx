import { ContactButtons, contactChannels } from "../../components/contact-links.js";
import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { m } from "../../i18n/index.js";
import { Card, PageHero } from "./public-parts.js";

const t = m.marketing.contact;

export function ContactPage() {
  useDocumentMeta(`${t.title} — Verbysia`, t.metaDescription);
  const configured = contactChannels.whatsappHref !== null || contactChannels.emailHref !== null;

  return (
    <div className="pb-10">
      <PageHero title={t.title} lead={t.lead} />
      <Card className="max-w-xl">
        <ContactButtons compact />
        {configured ? (
          <dl className="mt-4 space-y-1 text-sm">
            {contactChannels.whatsappDisplay ? (
              <div>
                <dt className="inline font-bold">{t.whatsapp}: </dt>
                <dd className="inline">{contactChannels.whatsappDisplay}</dd>
              </div>
            ) : null}
            {contactChannels.emailDisplay ? (
              <div>
                <dt className="inline font-bold">{t.email}: </dt>
                <dd className="inline">{contactChannels.emailDisplay}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-4 text-sm text-primary/70 dark:text-surface/70" role="note">
            {t.pending}
          </p>
        )}
      </Card>
    </div>
  );
}
