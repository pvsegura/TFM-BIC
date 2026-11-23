import type { ExerciseAnswerResponse, ExerciseResponse } from "@verbysia/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router";

import { Link } from "../../components/app-link.js";
import { ContentBlocks, type LearningLanguage } from "../../components/content-blocks.js";
import { ExerciseRenderer } from "../../components/exercise-renderer.js";
import { ExerciseResult } from "../../components/exercise-result.js";
import { describeCorrectAnswer } from "../../components/exercise-view-registry.js";
import type { SubmittedAnswer } from "../../components/exercise-view-types.js";
import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { m } from "../../i18n/index.js";
import { fetchContent } from "../../services/catalog-api.js";
import {
  fetchDemoExercise,
  fetchDemoExercises,
  submitDemoAnswer,
} from "../../services/demo-api.js";
import {
  readDemoProgress,
  recordDemoAnswer,
  recordDemoLessonCompleted,
} from "../../services/demo-progress.js";
import { Card, PrimaryLink } from "./public-parts.js";

const t = m.marketing.challenge;
/** The challenge days a visitor can try without an account (the plan's free demo: days 1–2). */
export const DEMO_DAYS = 2;
const SPANISH: LearningLanguage = { locale: "es-ES", direction: "ltr" };

function demoDay(lessonId: string | undefined) {
  return t.days.slice(0, DEMO_DAYS).find((day) => day.lessonId === lessonId);
}

/** One challenge day in demo mode: the lesson, its exercises (checked by the server, never stored) and local progress. */
export function DemoLessonPage() {
  const { lessonId } = useParams();
  const day = demoDay(lessonId);
  const lesson = useQuery({
    queryKey: ["demo", "content", lessonId],
    queryFn: () => fetchContent(lessonId ?? ""),
    enabled: day !== undefined,
  });
  const exercises = useQuery({
    queryKey: ["demo", "exercises", lessonId],
    queryFn: () => fetchDemoExercises(lessonId ?? ""),
    enabled: day !== undefined,
  });
  const [completed, setCompleted] = useState(() =>
    lessonId ? readDemoProgress().completedLessons.includes(lessonId) : false,
  );
  useDocumentMeta(
    `${day ? `${t.dayLabel} ${String(day.day)}: ${day.title}` : t.title} — Verbysia`,
    t.demoLead,
  );

  if (!day || !lessonId) {
    return (
      <Card className="my-10 max-w-xl">
        <p>{t.demoNotAvailable}</p>
        <div className="mt-4">
          <PrimaryLink to="/register">{t.registerCta}</PrimaryLink>
        </div>
      </Card>
    );
  }

  return (
    <article className="py-8">
      <p className="text-sm font-bold uppercase tracking-wider text-accent-ink dark:text-accent">
        {t.dayLabel} {day.day} · {t.demoBadge}
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold">{lesson.data?.title ?? day.title}</h1>
      <p className="mt-2 max-w-2xl rounded-xl bg-accent/15 px-4 py-3 text-sm">{t.demoLead}</p>

      {lesson.isPending ? <p className="mt-6">{t.demoLoading}</p> : null}
      {lesson.isError ? (
        <p role="alert" className="mt-6">
          {t.demoError}
        </p>
      ) : null}
      {lesson.data ? (
        <div className="mt-6">
          <ContentBlocks
            blocks={lesson.data.blocks}
            language={SPANISH}
            instructionLanguage={lesson.data.instructionLanguage}
          />
        </div>
      ) : null}

      <section aria-labelledby="demo-exercises" className="mt-10">
        <h2 id="demo-exercises" className="font-display text-2xl font-bold">
          {t.demoExercises}
        </h2>
        <ol className="mt-4 space-y-6">
          {(exercises.data?.exercises ?? []).map((summary) => (
            <li key={summary.id}>
              <DemoExercise exerciseId={summary.id} />
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10 rounded-2xl border border-primary/10 p-5 dark:border-surface/10">
        {completed ? (
          <p role="status" className="font-bold">
            {t.demoCompleted}
          </p>
        ) : (
          <button
            type="button"
            className="rounded-full bg-primary px-5 py-3 font-display font-bold text-surface dark:bg-surface dark:text-primary"
            onClick={() => {
              recordDemoLessonCompleted(lessonId);
              setCompleted(true);
            }}
          >
            {t.demoComplete}
          </button>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <PrimaryLink to="/register">{t.demoSaveCta}</PrimaryLink>
          <Link to="/wyzwanie-7-dni" className="font-bold underline underline-offset-2">
            {t.demoBack}
          </Link>
        </div>
      </div>
    </article>
  );
}

function DemoExercise({ exerciseId }: { exerciseId: string }) {
  const exercise = useQuery({
    queryKey: ["demo", "exercise", exerciseId],
    queryFn: () => fetchDemoExercise(exerciseId),
  });
  const [evaluation, setEvaluation] = useState<ExerciseAnswerResponse | undefined>(undefined);
  const check = useMutation({
    mutationFn: (answer: SubmittedAnswer) => submitDemoAnswer(exerciseId, answer),
    onSuccess: (result, answer) => {
      setEvaluation(result);
      recordDemoAnswer(exerciseId, answer);
    },
  });

  if (!exercise.data) return null;
  const data: ExerciseResponse = exercise.data;
  return (
    <Card>
      <ExerciseRenderer
        exercise={data}
        language={SPANISH}
        disabled={check.isPending || evaluation !== undefined}
        onSubmit={(answer) => check.mutate(answer)}
      />
      <ExerciseResult
        evaluation={evaluation}
        correctAnswerText={
          evaluation ? describeCorrectAnswer(data, evaluation.correctAnswer) : null
        }
        instructionLanguage={data.instructionLanguage}
        learningLanguage={SPANISH}
        isChecking={check.isPending}
        failed={check.isError}
        exerciseId={exerciseId}
      />
    </Card>
  );
}
