import { Link } from "../../components/app-link.js";
import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { useLanguages } from "../../hooks/use-catalog.js";
import { COURSES } from "../../i18n/courses.js";
import { m } from "../../i18n/index.js";
import { chooseCourse } from "../../services/course-choice.js";
import { Card, PageHero } from "./public-parts.js";

const t = m.learn.otherCourses;
/** The main course (Spanish for Polish speakers) is the paid one; every other course is free. */
const MAIN_COURSE = "es";
const enc = encodeURIComponent;

/**
 * "Our courses": every course the catalog serves, each named in its learners' language
 * ("Polaco para hispanohablantes", "Polish for English speakers"…). Opening a course remembers
 * it, so a language taught in several languages shows the chosen course's lessons.
 */
export function OtherCoursesPage() {
  useDocumentMeta(`${t.title} — Verbysia`, t.lead);
  const languages = useLanguages();
  const served = languages.data?.languages ?? [];
  const courses = COURSES.filter((course) => {
    const language = served.find((l) => l.code === course.language);
    return (
      language !== undefined &&
      (language.courses?.some((code) => code === course.instruction) ?? true)
    );
  });

  return (
    <div className="pb-10">
      <PageHero title={t.title} lead={t.lead} />
      {languages.isPending ? <p role="status">{t.loading}</p> : null}
      {languages.isSuccess && courses.length === 0 ? <p>{t.empty}</p> : null}
      <ul className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => {
          const choose = () => chooseCourse(course.language, course.instruction);
          return (
            <li key={`${course.language}-${course.instruction}`}>
              <Card className="h-full">
                <p className="text-xs font-bold uppercase tracking-wide text-primary/70 dark:text-surface/70">
                  {course.language === MAIN_COURSE ? t.main : t.free}
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold" lang={course.instruction}>
                  {course.name}
                </h2>
                <p className="mt-2 text-primary/80 dark:text-surface/80" lang={course.instruction}>
                  {course.description}
                </p>
                <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-bold">
                  <Link
                    to={`/learn/${enc(course.language)}`}
                    onClick={choose}
                    className="underline underline-offset-2"
                  >
                    {t.browse}
                  </Link>
                  <Link
                    to={`/learn/lessons?language=${enc(course.language)}&level=a1`}
                    onClick={choose}
                    className="underline underline-offset-2"
                  >
                    {t.lessons}
                  </Link>
                </p>
              </Card>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-sm text-primary/70 dark:text-surface/70">{t.note}</p>
    </div>
  );
}
