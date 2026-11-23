import { Link } from "../../components/app-link.js";
import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { m } from "../../i18n/index.js";
import { useCurrentUser } from "../../hooks/use-current-user.js";
import { useLessons } from "../../hooks/use-lessons.js";
import { DEMO_DAYS } from "./demo-lesson-page.js";
import { Card, CheckList, PageHero, PrimaryLink, SecondaryLink, Section } from "./public-parts.js";

const t = m.marketing.challenge;

/**
 * The free 7-day challenge: public programme for visitors; for a signed-in learner the same page
 * shows each day's real progress (from the lessons API) and links straight into the lessons.
 */
export function ChallengePage() {
  useDocumentMeta(t.metaTitle, t.metaDescription);
  const { data: user } = useCurrentUser();
  const lessons = useLessons(user ? "es" : undefined, user ? "a1" : undefined);
  const statusById = new Map<string, string>(
    (lessons.data?.lessons ?? []).map((l) => [l.id, l.progress.status]),
  );
  const done = t.days.filter((day) => statusById.get(day.lessonId) === "completed").length;
  const firstDay = t.days[0];
  const nextDay = t.days.find((day) => statusById.get(day.lessonId) !== "completed") ?? firstDay;

  return (
    <div>
      <PageHero eyebrow={m.common.levels.a1} title={t.title} lead={t.lead}>
        {user && nextDay ? (
          <PrimaryLink to={`/learn/lessons/${nextDay.lessonId}`}>
            {`${t.dayLabel} ${String(nextDay.day)}: ${nextDay.title}`}
          </PrimaryLink>
        ) : (
          <>
            <PrimaryLink to="/register">{t.registerCta}</PrimaryLink>
            <SecondaryLink to={`/wyzwanie-7-dni/demo/${firstDay?.lessonId ?? ""}`}>
              {t.tryDemo}
            </SecondaryLink>
          </>
        )}
      </PageHero>

      <p className="max-w-2xl rounded-xl bg-accent/15 px-4 py-3">{t.honest}</p>

      {user ? (
        <div className="mt-6" aria-live="polite">
          <p className="font-display font-bold">
            {t.progressLabel}: {t.daysDone(done)}
          </p>
          <progress className="mt-2 h-3 w-full max-w-md accent-accent" max={7} value={done} />
        </div>
      ) : null}

      <Section id="challenge-days" title={t.daysTitle}>
        <ol className="grid gap-4 md:grid-cols-2">
          {t.days.map((day) => {
            const completed = statusById.get(day.lessonId) === "completed";
            return (
              <li key={day.day}>
                <Card className="h-full">
                  <p className="text-sm font-bold uppercase tracking-wider text-accent-ink dark:text-accent">
                    {t.dayLabel} {day.day}
                    {completed ? ` · ${t.dayDone}` : ""}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold">{day.title}</h3>
                  <p className="mt-1 text-primary/80 dark:text-surface/80">{day.body}</p>
                  {user ? (
                    <Link
                      to={`/learn/lessons/${day.lessonId}`}
                      className="mt-3 inline-block font-bold underline underline-offset-2"
                    >
                      {t.dayOpen}
                    </Link>
                  ) : day.day <= DEMO_DAYS ? (
                    <Link
                      to={`/wyzwanie-7-dni/demo/${day.lessonId}`}
                      className="mt-3 inline-block rounded-full bg-accent px-4 py-2 font-bold text-primary"
                    >
                      {t.tryDemo}
                    </Link>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section id="challenge-each-day" title={t.eachDayTitle}>
        <CheckList items={t.eachDay} />
      </Section>
    </div>
  );
}
