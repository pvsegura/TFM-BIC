import { Link } from "../../components/app-link.js";
import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { useLanguages } from "../../hooks/use-catalog.js";
import { m } from "../../i18n/index.js";
import { Card, PageHero } from "./public-parts.js";

const t = m.learn.otherCourses;
/** The main course (Spanish for Polish speakers) has its own pages; this tab lists the rest. */
const MAIN_COURSE = "es";
const enc = encodeURIComponent;

/** "Other courses": the earlier, free Polish and English courses, kept apart from the main one. */
export function OtherCoursesPage() {
  useDocumentMeta(`${t.title} — Verbysia`, t.lead);
  const languages = useLanguages();
  const others = (languages.data?.languages ?? []).filter(
    (language) => language.code !== MAIN_COURSE,
  );

  return (
    <div className="pb-10">
      <PageHero title={t.title} lead={t.lead} />
      {languages.isPending ? <p role="status">{t.loading}</p> : null}
      {languages.isSuccess && others.length === 0 ? <p>{t.empty}</p> : null}
      <ul className="grid gap-4 md:grid-cols-2">
        {others.map((language) => (
          <li key={language.code}>
            <Card className="h-full">
              <h2 className="font-display text-2xl font-bold" lang={language.locale}>
                {language.nativeName}
              </h2>
              <p className="mt-2 text-primary/80 dark:text-surface/80">
                {t.descriptions[language.code] ?? ""}
              </p>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-bold">
                <Link to={`/learn/${enc(language.code)}`} className="underline underline-offset-2">
                  {t.browse}
                </Link>
                <Link
                  to={`/learn/lessons?language=${enc(language.code)}&level=a1`}
                  className="underline underline-offset-2"
                >
                  {t.lessons}
                </Link>
              </p>
            </Card>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-primary/70 dark:text-surface/70">{t.note}</p>
    </div>
  );
}
