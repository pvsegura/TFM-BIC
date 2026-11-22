import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { m } from "../../i18n/index.js";
import { PhasesGrid } from "./phases-grid.js";
import { Card, CheckList, PageHero, PrimaryLink, Section } from "./public-parts.js";

const t = m.marketing.method;

export function MethodPage() {
  useDocumentMeta(t.metaTitle, t.metaDescription);
  return (
    <div>
      <PageHero eyebrow="POLSKI → ESPAÑOL" title={t.title} lead={t.lead}>
        <PrimaryLink to="/wyzwanie-7-dni">{t.cta}</PrimaryLink>
      </PageHero>

      <Section
        id="method-phases"
        title={m.marketing.home.phasesTitle}
        lead={m.marketing.home.phasesLead}
      >
        <PhasesGrid />
      </Section>

      <Section id="method-evidence" title={t.evidenceTitle} lead={t.evidenceLead}>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="font-display text-lg font-bold">{t.evidenceStrongTitle}</h3>
            <div className="mt-3">
              <CheckList items={t.evidenceStrong} />
            </div>
          </Card>
          <Card>
            <h3 className="font-display text-lg font-bold">{t.evidenceSupportTitle}</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {t.evidenceSupport.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section id="method-polish" title={t.polishTitle} lead={t.polishLead}>
        <CheckList items={t.polishPoints} />
        <p className="mt-6 text-sm text-primary/60 dark:text-surface/60">{t.nameNote}</p>
      </Section>
    </div>
  );
}
