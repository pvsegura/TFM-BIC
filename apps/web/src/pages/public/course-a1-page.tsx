import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { m } from "../../i18n/index.js";
import { CourseLevels } from "./verbysia-home-page.js";
import { PageHero, PrimaryLink, Section } from "./public-parts.js";

const t = m.marketing.courseA1;

export function CourseA1Page() {
  useDocumentMeta(t.metaTitle, t.metaDescription);
  return (
    <div>
      <PageHero eyebrow={m.common.levels.a1} title={t.title} lead={t.lead}>
        <PrimaryLink to="/wyzwanie-7-dni">{t.cta}</PrimaryLink>
      </PageHero>
      <p className="max-w-2xl rounded-xl bg-accent/15 px-4 py-3">{t.statusNow}</p>

      <Section id="course-units" title={t.unitsTitle}>
        <ol className="list-decimal space-y-2 pl-6">
          {t.units.map((unit) => (
            <li key={unit}>{unit}</li>
          ))}
        </ol>
      </Section>

      <Section id="course-levels" title={t.levelsTitle} lead={t.levelsBody}>
        <CourseLevels />
      </Section>
    </div>
  );
}
