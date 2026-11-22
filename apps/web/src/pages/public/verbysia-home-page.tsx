import { useState } from "react";

import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { m } from "../../i18n/index.js";
import { useCurrentUser } from "../../hooks/use-current-user.js";
import { PhasesGrid } from "./phases-grid.js";
import { Card, CheckList, PageHero, PrimaryLink, SecondaryLink, Section } from "./public-parts.js";

const t = m.marketing.home;

/** The public homepage (Verbysia): value proposition, method, challenge, courses, example, prices. */
export function VerbysiaHomePage() {
  useDocumentMeta(t.metaTitle, t.metaDescription);
  const { data: user } = useCurrentUser();
  const startTo = user ? "/wyzwanie-7-dni" : "/register";

  return (
    <div>
      <PageHero eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
        <PrimaryLink to={startTo}>{t.primaryCta}</PrimaryLink>
        <SecondaryLink to="/metoda-puente">{t.secondaryCta}</SecondaryLink>
        <p className="basis-full text-sm text-primary/70 dark:text-surface/70">{t.trust}</p>
      </PageHero>

      <Section id="home-why" title={t.whyTitle} lead={t.whyLead}>
        <div className="grid gap-4 sm:grid-cols-3">
          {t.whyPoints.map((point) => (
            <Card key={point.title}>
              <h3 className="font-display text-lg font-bold">{point.title}</h3>
              <p className="mt-2 text-primary/80 dark:text-surface/80">{point.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="home-phases" title={t.phasesTitle} lead={t.phasesLead}>
        <PhasesGrid />
      </Section>

      <Section id="home-how" title={t.howTitle}>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.howSteps.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <span className="font-display text-3xl font-bold text-accent-ink dark:text-accent">
                  {index + 1}
                </span>
                <h3 className="mt-1 font-display text-lg font-bold">{step.title}</h3>
                <p className="mt-1 text-primary/80 dark:text-surface/80">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="home-challenge" title={t.challengeTitle}>
        <p className="max-w-2xl text-primary/80 dark:text-surface/80">{t.challengeBody}</p>
        <div className="mt-4">
          <PrimaryLink to="/wyzwanie-7-dni">{t.challengeCta}</PrimaryLink>
        </div>
      </Section>

      <Section id="home-courses" title={t.coursesTitle}>
        <CourseLevels />
      </Section>

      <Section id="home-example" title={t.exampleTitle}>
        <ExampleExercise />
      </Section>

      <Section id="home-pricing" title={t.pricingTitle} lead={t.pricingBody}>
        <SecondaryLink to="/cennik">{t.pricingCta}</SecondaryLink>
      </Section>

      <Section id="home-faq" title={m.marketing.faq.title}>
        <dl className="space-y-4">
          {m.marketing.faq.items.slice(0, 4).map((item) => (
            <div key={item.q}>
              <dt className="font-display font-bold">{item.q}</dt>
              <dd className="mt-1 text-primary/80 dark:text-surface/80">{item.a}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <SecondaryLink to="/faq">{m.marketing.faq.title}</SecondaryLink>
        </div>
      </Section>

      <section className="my-10 rounded-3xl bg-primary px-6 py-10 text-surface dark:bg-night-paper">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{t.finalTitle}</h2>
        <div className="mt-5">
          <PrimaryLink to={startTo}>{t.finalCta}</PrimaryLink>
        </div>
      </section>
    </div>
  );
}

export function CourseLevels() {
  const levels = [
    { id: "a1", to: "/kurs-a1", available: true },
    { id: "a2", available: false },
    { id: "b1", available: false },
    { id: "b2", available: false },
  ] as const;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {levels.map((level) => (
        <li key={level.id}>
          <Card className={`h-full ${level.available ? "" : "opacity-70"}`}>
            <p className="font-display text-3xl font-bold">{level.id.toUpperCase()}</p>
            <p className="mt-1">{m.common.levels[level.id]}</p>
            <p
              className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-bold ${
                level.available ? "bg-accent text-primary" : "bg-primary/10 dark:bg-surface/10"
              }`}
            >
              {level.available ? m.common.available : m.common.comingSoon}
            </p>
            {"to" in level ? (
              <div className="mt-3">
                <SecondaryLink to={level.to}>{m.marketing.courseA1.title}</SecondaryLink>
              </div>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  );
}

function ExampleExercise() {
  const [revealed, setRevealed] = useState(false);
  return (
    <Card className="max-w-xl">
      <p className="font-display text-lg font-bold">{t.exampleQuestion}</p>
      <ul className="mt-3 space-y-2" lang="es">
        {t.exampleOptions.map((option) => (
          <li
            key={option}
            className="rounded-lg border border-primary/15 px-3 py-2 dark:border-surface/15"
          >
            {option}
          </li>
        ))}
      </ul>
      {revealed ? (
        <p className="mt-3 rounded-lg bg-success/15 px-3 py-2" role="status">
          {t.exampleAnswer}
        </p>
      ) : (
        <button
          type="button"
          className="mt-3 text-sm font-bold underline underline-offset-2"
          onClick={() => setRevealed(true)}
        >
          {t.exampleReveal}
        </button>
      )}
      <div className="mt-4">
        <CheckList items={m.marketing.method.evidenceStrong.slice(4, 5)} />
      </div>
    </Card>
  );
}
