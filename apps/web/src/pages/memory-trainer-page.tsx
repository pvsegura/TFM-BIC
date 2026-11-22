import {
  MEMORY_GRADES,
  type MemoryCardResponse,
  type MemoryGrade,
  type MemoryReviewRequest,
  type MemoryStatsResponse,
} from "@verbysia/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { Link } from "../components/app-link.js";
import { useUserScopedQuery } from "../hooks/use-user-scoped-query.js";
import { formatPercent, m } from "../i18n/index.js";
import { errorMessage } from "../services/api-error.js";
import {
  fetchMemorySession,
  fetchMemoryStats,
  submitMemoryReview,
} from "../services/memory-api.js";

const t = m.memory;
const STATS_KEY = ["memory", "stats"] as const;
const SESSION_KEY = ["memory", "session"] as const;

/**
 * The PUENTE memory trainer. Recall first, then reveal, then grade honestly. Each answer is saved
 * immediately with a client-generated id, so a retry after a failed request is counted once, and
 * an interrupted session simply resumes: answered cards are no longer due on the server.
 */
export function MemoryTrainerPage() {
  const stats = useUserScopedQuery(STATS_KEY, fetchMemoryStats);
  const [inSession, setInSession] = useState(false);

  return (
    <section aria-labelledby="memory-heading" className="py-8">
      <h1 id="memory-heading" className="font-display text-3xl font-bold">
        {t.title}
      </h1>
      <p className="mt-2 max-w-2xl text-primary/80 dark:text-surface/80">{t.lead}</p>

      {inSession ? (
        <StudySession onFinished={() => setInSession(false)} />
      ) : (
        <>
          {stats.isError ? <p role="alert">{errorMessage(stats.error)}</p> : null}
          {stats.data ? (
            <StatsPanel stats={stats.data} />
          ) : (
            <p className="mt-6">{m.common.loading}</p>
          )}
          {stats.data && stats.data.dueNow + stats.data.newAvailable > 0 ? (
            <button
              type="button"
              className="mt-6 rounded-full bg-accent px-6 py-3 font-display font-bold text-primary"
              onClick={() => setInSession(true)}
            >
              {t.start}
            </button>
          ) : stats.data ? (
            <EmptyState />
          ) : null}
          <p className="mt-4 text-sm text-primary/70 dark:text-surface/70">{t.resumeNote}</p>
        </>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-2xl border border-primary/10 p-5 dark:border-surface/10">
      <h2 className="font-display text-xl font-bold">{t.emptyTitle}</h2>
      <p className="mt-1">{t.emptyBody}</p>
      <Link
        to="/wyzwanie-7-dni"
        className="mt-3 inline-block font-bold underline underline-offset-2"
      >
        {t.emptyCta}
      </Link>
    </div>
  );
}

function StatsPanel({ stats }: { stats: MemoryStatsResponse }) {
  const tiles = [
    [t.stats.dueNow, String(stats.dueNow)],
    [t.stats.newAvailable, String(stats.newAvailable)],
    [t.stats.learning, String(stats.learning)],
    [t.stats.mature, String(stats.mature)],
    [t.stats.difficult, String(stats.difficult)],
    [t.stats.reviewsToday, String(stats.reviewsToday)],
    [t.stats.retention, stats.retention30d === null ? "—" : formatPercent(stats.retention30d)],
    [t.stats.streak, String(stats.streakDays)],
  ] as const;
  const max = Math.max(1, ...stats.forecast);
  return (
    <div className="mt-6">
      <h2 className="sr-only">{t.statsTitle}</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-primary/10 p-3 dark:border-surface/10"
          >
            <dt className="text-sm text-primary/70 dark:text-surface/70">{label}</dt>
            <dd className="font-display text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-6 font-display font-bold">{t.stats.forecastTitle}</h3>
      <ol className="mt-2 flex h-24 items-end gap-2" aria-label={t.stats.forecastTitle}>
        {stats.forecast.map((count, index) => (
          <li key={index} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs">{count}</span>
            <span
              className="w-full rounded-t bg-accent"
              style={{ height: `${String(Math.round((count / max) * 64))}px` }}
              aria-hidden="true"
            />
            <span className="text-xs text-primary/70 dark:text-surface/70">
              {index === 0 ? t.stats.today : t.stats.inDays(index + 1)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function newReviewId(): string {
  return crypto.randomUUID();
}

function StudySession({ onFinished }: { onFinished: () => void }) {
  const queryClient = useQueryClient();
  const session = useUserScopedQuery(SESSION_KEY, () => fetchMemorySession(20));
  const [queue, setQueue] = useState<MemoryCardResponse[] | null>(null);
  const [done, setDone] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  // One id per answer attempt: reused on retry so the server counts the answer once.
  const pendingReviewId = useRef<string | null>(null);

  const review = useMutation({
    mutationFn: (body: MemoryReviewRequest) => submitMemoryReview(body),
  });

  const cards = queue ?? session.data?.cards ?? null;
  if (session.isError) return <p role="alert">{errorMessage(session.error)}</p>;
  if (!cards) return <p className="mt-6">{m.common.loading}</p>;

  const card = cards[0];
  if (!card) {
    return (
      <div
        className="mt-6 rounded-2xl border border-primary/10 p-5 dark:border-surface/10"
        role="status"
      >
        <h2 className="font-display text-xl font-bold">{t.sessionDone}</h2>
        <p className="mt-1">{t.sessionDoneBody}</p>
        <button
          type="button"
          className="mt-4 font-bold underline underline-offset-2"
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: ["memory"] });
            onFinished();
          }}
        >
          {t.anotherSession}
        </button>
      </div>
    );
  }

  function grade(value: MemoryGrade) {
    if (!card) return;
    pendingReviewId.current ??= newReviewId();
    review.mutate(
      {
        vocabularyItemId: card.vocabularyItemId,
        grade: value,
        clientReviewId: pendingReviewId.current,
        usedHint: hintShown,
      },
      {
        onSuccess: () => {
          pendingReviewId.current = null;
          const rest = cards!.slice(1);
          // "Nie pamiętam" brings the card back at the end of this session.
          setQueue(value === "again" ? [...rest, { ...card, isNew: false }] : rest);
          if (value !== "again") setDone((n) => n + 1);
          setRevealed(false);
          setHintShown(false);
        },
      },
    );
  }

  const total = done + cards.length;
  const hint = card.lemma.replace(/^(el|la|los|las)\s+/i, "").slice(0, 2);

  return (
    <div className="mt-6 max-w-xl">
      <p className="text-sm text-primary/70 dark:text-surface/70" aria-live="polite">
        {t.progress(done, total)}
      </p>
      <progress className="mt-1 h-2 w-full accent-accent" max={total} value={done} />

      <article className="mt-4 rounded-3xl border border-primary/10 bg-white/70 p-6 shadow-sm dark:border-surface/10 dark:bg-night-paper/70">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-ink dark:text-accent">
          {card.categoryTitle}
          {card.isNew ? ` · ${t.cardNew}` : ""}
          {card.difficult ? ` · ${t.cardDifficult}` : ""}
        </p>
        <p className="mt-3 text-sm">{t.prompt}</p>
        <p className="mt-1 font-display text-3xl font-bold">{card.translation}</p>
        {card.gender ? (
          <p className="mt-1 text-sm text-primary/70 dark:text-surface/70">
            {t.gender[card.gender as keyof typeof t.gender] ?? card.gender}
          </p>
        ) : null}

        {hintShown && !revealed ? (
          <p className="mt-3 text-sm">
            {t.hintLabel}:{" "}
            <span lang="es" className="font-bold">
              {hint}…
            </span>
          </p>
        ) : null}

        {revealed ? (
          <div
            className="mt-5 border-t border-primary/10 pt-4 dark:border-surface/10"
            role="status"
          >
            <p
              lang="es"
              className="font-display text-3xl font-bold text-accent-ink dark:text-accent"
            >
              {card.lemma}
            </p>
            {card.note ? <p className="mt-2">{card.note}</p> : null}
            {card.example ? (
              <p className="mt-2 text-sm">
                {t.example}: <span lang="es">{card.example.text}</span> — {card.example.translation}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-primary px-5 py-3 font-display font-bold text-surface dark:bg-surface dark:text-primary"
              onClick={() => setRevealed(true)}
            >
              {t.reveal}
            </button>
            {!hintShown ? (
              <button
                type="button"
                className="font-bold underline underline-offset-2"
                onClick={() => setHintShown(true)}
              >
                {t.hint}
              </button>
            ) : null}
          </div>
        )}
      </article>

      {revealed ? (
        <fieldset className="mt-4" disabled={review.isPending}>
          <legend className="font-display font-bold">{t.gradeQuestion}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MEMORY_GRADES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => grade(value)}
                className="rounded-xl border border-primary/20 px-3 py-3 text-left hover:bg-primary/5 disabled:opacity-50 dark:border-surface/20 dark:hover:bg-surface/10"
              >
                <span className="block font-bold">{t.grades[value].label}</span>
                <span className="block text-xs text-primary/70 dark:text-surface/70">
                  {t.grades[value].help}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      {review.isError ? (
        <p role="alert" className="mt-3 text-danger">
          {t.saveError}
        </p>
      ) : null}
    </div>
  );
}
