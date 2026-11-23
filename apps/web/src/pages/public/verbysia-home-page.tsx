import type { PublicProduct } from "@verbysia/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ContactButtons } from "../../components/contact-links.js";
import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { useCurrentUser } from "../../hooks/use-current-user.js";
import { formatPrice, m } from "../../i18n/index.js";
import { fetchProducts } from "../../services/commerce-api.js";
import { PhasesGrid } from "./phases-grid.js";
import { Card, PageHero, PrimaryLink, SecondaryLink, Section } from "./public-parts.js";

const t = m.marketing.home;

function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: fetchProducts });
}

function suffix(product: PublicProduct): string {
  const p = m.marketing.pricing;
  if (product.billing === "monthly") return p.perMonth;
  if (product.billing === "yearly") return p.perYear;
  return p.oneOff;
}

/**
 * The public homepage, in the order of the reference model (docs/product/verbysia/PLAN-MODELO-TRADUES.md):
 * hero with prices and contact → "use only what you need" → products → playable demo → why for Poles →
 * the six PUENTE phases → challenge → A1 programme → levels → FAQ → final call to action. All content
 * is our own.
 */
export function VerbysiaHomePage() {
  useDocumentMeta(t.metaTitle, t.metaDescription);
  const { data: user } = useCurrentUser();
  const startTo = user ? "/wyzwanie-7-dni" : "/register";

  return (
    <div>
      <div className="grid items-center gap-6 lg:grid-cols-[1.4fr_1fr]">
        <PageHero eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
          <PrimaryLink to={startTo}>{t.primaryCta}</PrimaryLink>
          <SecondaryLink to="/metoda-puente">{t.secondaryCta}</SecondaryLink>
          <p className="basis-full text-sm text-primary/70 dark:text-surface/70">{t.trust}</p>
          <div className="basis-full">
            <ContactButtons compact />
          </div>
        </PageHero>
        <HeroPrices />
      </div>

      <Section id="home-use" title={t.useTitle} lead={t.useLead}>
        <ol className="grid gap-4 md:grid-cols-3">
          {t.useCards.map((card, index) => (
            <li key={card.title}>
              <Card className="flex h-full flex-col">
                <span className="font-display text-4xl font-bold text-accent-ink dark:text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold">{card.title}</h3>
                <p className="mt-1 grow text-primary/80 dark:text-surface/80">{card.body}</p>
                <div className="mt-4">
                  <SecondaryLink to={card.to}>{card.cta}</SecondaryLink>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="home-products" title={t.productsTitle}>
        <ProductCards />
        <div className="mt-4">
          <SecondaryLink to="/cennik">{t.productsCta}</SecondaryLink>
        </div>
      </Section>

      <Section id="home-demo" title={t.demoTitle} lead={t.demoLead}>
        <DemoQuiz ctaTo={startTo} />
      </Section>

      <Section
        id="home-listening"
        title={m.marketing.listening.homeTitle}
        lead={m.marketing.listening.homeLead}
      >
        <PrimaryLink to="/test-sluchu">{m.marketing.listening.homeCta}</PrimaryLink>
      </Section>

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

      <Section id="home-challenge" title={t.challengeTitle}>
        <p className="max-w-2xl text-primary/80 dark:text-surface/80">{t.challengeBody}</p>
        <div className="mt-4">
          <PrimaryLink to="/wyzwanie-7-dni">{t.challengeCta}</PrimaryLink>
        </div>
      </Section>

      <Section id="home-program" title={t.programTitle}>
        <ol className="grid gap-2 sm:grid-cols-2">
          {m.marketing.courseA1.units.map((unit, index) => (
            <li
              key={unit}
              className="flex gap-3 rounded-xl border border-primary/10 px-3 py-2 dark:border-surface/10"
            >
              <span className="font-display font-bold text-accent-ink dark:text-accent">
                {index + 1}
              </span>
              <span>{unit}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <SecondaryLink to="/kurs-a1">{t.programCta}</SecondaryLink>
        </div>
      </Section>

      <Section id="home-courses" title={t.coursesTitle}>
        <CourseLevels />
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
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <PrimaryLink to={startTo}>{t.finalCta}</PrimaryLink>
          <ContactButtons compact />
        </div>
      </section>
    </div>
  );
}

/** Two price cards in the hero: the A1 course and Premium monthly, from the server's price list. */
function HeroPrices() {
  const products = useProducts();
  const a1 = products.data?.find((p) => p.licenceKind === "COURSE_A1");
  const premium = products.data?.find((p) => p.billing === "monthly");
  const cards = [
    { product: a1, label: t.heroPriceA1 },
    { product: premium, label: t.heroPricePremium },
  ];
  return (
    <aside aria-label={t.heroPricesLabel} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {cards.map(({ product, label }) =>
        product ? (
          <Card key={label}>
            <p className="text-xs font-bold uppercase tracking-widest text-accent-ink dark:text-accent">
              {label}
            </p>
            <p className="mt-1">
              <span className="font-display text-3xl font-bold">
                {formatPrice(product.priceMinor, product.currency)}
              </span>{" "}
              <span className="text-primary/70 dark:text-surface/70">{suffix(product)}</span>
            </p>
            <p className="mt-1 text-sm text-primary/80 dark:text-surface/80">
              {product.description}
            </p>
          </Card>
        ) : null,
      )}
    </aside>
  );
}

/** Compact product cards: the free plan plus every active product from the server. */
function ProductCards() {
  const products = useProducts();
  const list = (products.data ?? []).filter((p) => p.status === "active");
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <li>
        <Card className="h-full">
          <h3 className="font-display text-lg font-bold">{m.marketing.pricing.freeName}</h3>
          <p className="mt-1 font-display text-2xl font-bold">{m.marketing.pricing.freePrice}</p>
          <p className="mt-1 text-sm">{m.marketing.pricing.freeFeatures.join(" · ")}</p>
        </Card>
      </li>
      {list.map((product) => (
        <li key={product.id}>
          <Card className={`h-full ${product.billing === "yearly" ? "ring-2 ring-accent" : ""}`}>
            <h3 className="font-display text-lg font-bold">{product.name}</h3>
            <p className="mt-1">
              <span className="font-display text-2xl font-bold">
                {formatPrice(product.priceMinor, product.currency)}
              </span>{" "}
              <span className="text-sm text-primary/70 dark:text-surface/70">
                {suffix(product)}
              </span>
            </p>
            <p className="mt-1 text-sm text-primary/80 dark:text-surface/80">
              {product.description}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  );
}

/** Three questions from the challenge, playable without an account (nothing is sent anywhere). */
function DemoQuiz({ ctaTo }: { ctaTo: string }) {
  const questions = t.demoQuestions;
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const question = questions[index];

  if (!question) {
    return (
      <Card className="max-w-xl">
        <p className="font-display text-xl font-bold" role="status">
          {t.demoScore(score, questions.length)}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PrimaryLink to={ctaTo}>{t.demoCta}</PrimaryLink>
          <button
            type="button"
            className="font-bold underline underline-offset-2"
            onClick={() => {
              setIndex(0);
              setChosen(null);
              setScore(0);
            }}
          >
            {t.demoRestart}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl">
      <p className="text-sm text-primary/70 dark:text-surface/70">
        {index + 1} / {questions.length}
      </p>
      <p className="mt-1 font-display text-lg font-bold">{question.q}</p>
      <ul className="mt-3 space-y-2" lang="es">
        {question.options.map((option, optionIndex) => {
          const isCorrect = optionIndex === question.correct;
          const tone =
            chosen === null
              ? "hover:bg-primary/5 dark:hover:bg-surface/10"
              : isCorrect
                ? "border-success bg-success/15"
                : chosen === optionIndex
                  ? "border-danger bg-danger/10"
                  : "opacity-60";
          return (
            <li key={option}>
              <button
                type="button"
                disabled={chosen !== null}
                onClick={() => {
                  setChosen(optionIndex);
                  if (isCorrect) setScore((s) => s + 1);
                }}
                className={`w-full rounded-lg border border-primary/15 px-3 py-2 text-left dark:border-surface/15 ${tone}`}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>
      {chosen !== null ? (
        <div className="mt-3" role="status">
          <p className="font-bold">{chosen === question.correct ? t.demoCorrect : t.demoWrong}</p>
          <p className="mt-1 text-sm">{question.explain}</p>
          <button
            type="button"
            className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-bold text-surface dark:bg-surface dark:text-primary"
            onClick={() => {
              setIndex((i) => i + 1);
              setChosen(null);
            }}
          >
            {t.demoNext}
          </button>
        </div>
      ) : null}
    </Card>
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
