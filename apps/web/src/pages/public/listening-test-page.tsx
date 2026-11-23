import { useEffect, useRef, useState } from "react";

import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { m } from "../../i18n/index.js";
import {
  bandFor,
  LISTENING_TEST,
  type ListeningSituation,
} from "../../listening-test/listening-test-data.js";
import { Card, PageHero, PrimaryLink } from "./public-parts.js";

const t = m.marketing.listening;

function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** A Spanish voice if the device has one (Spain first), otherwise the browser default with lang es-ES. */
function spanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === "es-ES") ?? voices.find((v) => v.lang.startsWith("es"));
}

/**
 * The public listening test (no account): play each situation, answer ten questions, see a
 * percentage and an approximate band. Nothing is sent to the server; the result stays on screen.
 */
export function ListeningTestPage() {
  useDocumentMeta(t.metaTitle, t.metaDescription);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const situation = LISTENING_TEST[index];

  if (!situation) {
    const total = LISTENING_TEST.reduce((sum, s) => sum + s.questions.length, 0);
    const correct = scores.reduce((sum, s) => sum + s, 0);
    const ratio = total === 0 ? 0 : correct / total;
    return (
      <div className="pb-10">
        <PageHero title={t.resultTitle} lead={t.resultPercent(Math.round(ratio * 100))} />
        <Card className="max-w-2xl">
          <p role="status" className="text-lg">
            {t.bands[bandFor(ratio)]}
          </p>
          <p className="mt-3 text-sm text-primary/70 dark:text-surface/70">{t.disclaimer}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <PrimaryLink to="/wyzwanie-7-dni">{t.cta}</PrimaryLink>
            <button
              type="button"
              className="font-bold underline underline-offset-2"
              onClick={() => {
                setScores([]);
                setIndex(0);
              }}
            >
              {t.restart}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHero title={t.title} lead={t.lead} />
      <p className="mb-6 max-w-3xl text-sm text-primary/70 dark:text-surface/70">
        {t.disclaimer} {t.voiceNote}
      </p>
      <SituationPanel
        key={situation.id}
        situation={situation}
        position={index + 1}
        isLast={index === LISTENING_TEST.length - 1}
        onDone={(score) => {
          setScores((previous) => [...previous, score]);
          setIndex((i) => i + 1);
        }}
      />
    </div>
  );
}

function SituationPanel({
  situation,
  position,
  isLast,
  onDone,
}: {
  situation: ListeningSituation;
  position: number;
  isLast: boolean;
  onDone: (score: number) => void;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    situation.questions.map(() => null),
  );
  const [checked, setChecked] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [missing, setMissing] = useState(false);
  const score = situation.questions.filter((q, i) => answers[i] === q.correct).length;

  return (
    <section aria-labelledby={`situation-${situation.id}`}>
      <p className="text-sm font-bold uppercase tracking-wider text-accent-ink dark:text-accent">
        {t.situationLabel(position, LISTENING_TEST.length)}
      </p>
      <h2 id={`situation-${situation.id}`} className="mt-1 font-display text-2xl font-bold">
        {situation.title}
      </h2>

      <Player situation={situation} />

      <button
        type="button"
        className="mt-3 text-sm font-bold underline underline-offset-2"
        aria-expanded={showTranscript}
        onClick={() => setShowTranscript((v) => !v)}
      >
        {showTranscript ? t.hideTranscript : t.showTranscript}
      </button>
      {showTranscript ? (
        <ol
          className="mt-2 space-y-1 rounded-xl border border-primary/10 p-4 dark:border-surface/10"
          lang="es"
        >
          {situation.lines.map((line, i) => (
            <li key={i}>
              <span className="font-bold">{line.speaker}:</span> {line.text}
            </li>
          ))}
        </ol>
      ) : null}

      <h3 className="mt-6 font-display text-lg font-bold">{t.questions}</h3>
      <ol className="mt-3 space-y-4">
        {situation.questions.map((question, qi) => (
          <li key={question.prompt}>
            <fieldset>
              <legend className="font-bold">
                {qi + 1}. {question.prompt}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {question.options.map((option, oi) => {
                  const selected = answers[qi] === oi;
                  const tone = checked
                    ? oi === question.correct
                      ? "border-success bg-success/15"
                      : selected
                        ? "border-danger bg-danger/10"
                        : "opacity-60"
                    : selected
                      ? "border-primary bg-primary/10 dark:border-surface dark:bg-surface/15"
                      : "";
                  return (
                    <label
                      key={option}
                      className={`cursor-pointer rounded-lg border border-primary/20 px-3 py-2 dark:border-surface/20 ${tone}`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`${situation.id}-${String(qi)}`}
                        checked={selected}
                        disabled={checked}
                        onChange={() =>
                          setAnswers((previous) => previous.map((a, i) => (i === qi ? oi : a)))
                        }
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      {checked ? (
        <div className="mt-6" role="status">
          <p className="font-display text-xl font-bold">
            {t.situationScore(score, situation.questions.length)}
          </p>
          <button
            type="button"
            className="mt-3 rounded-full bg-primary px-5 py-3 font-display font-bold text-surface dark:bg-surface dark:text-primary"
            onClick={() => onDone(score)}
          >
            {isLast ? t.finish : t.next}
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <button
            type="button"
            className="rounded-full bg-accent px-5 py-3 font-display font-bold text-primary"
            onClick={() => {
              if (answers.some((a) => a === null)) {
                setMissing(true);
                return;
              }
              setMissing(false);
              setChecked(true);
              setShowTranscript(true);
            }}
          >
            {t.check}
          </button>
          {missing ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {t.answerAll}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

/** Reads the dialogue line by line with the device's Spanish voice; two pitches tell the speakers apart. */
function Player({ situation }: { situation: ListeningSituation }) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.9);
  const cancelled = useRef(false);
  const available = speechAvailable();

  useEffect(() => {
    return () => {
      if (speechAvailable()) window.speechSynthesis.cancel();
    };
  }, []);

  if (!available) {
    return <p className="mt-3 text-sm">{t.noSpeech}</p>;
  }

  function play() {
    const synth = window.speechSynthesis;
    synth.cancel();
    cancelled.current = false;
    const speakers = [...new Set(situation.lines.map((l) => l.speaker))];
    const voice = spanishVoice();
    setPlaying(true);
    situation.lines.forEach((line, i) => {
      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.lang = "es-ES";
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = speakers.indexOf(line.speaker) % 2 === 0 ? 1.1 : 0.85;
      if (i === situation.lines.length - 1) {
        utterance.onend = () => setPlaying(false);
      }
      synth.speak(utterance);
    });
  }

  function stop() {
    cancelled.current = true;
    window.speechSynthesis.cancel();
    setPlaying(false);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {playing ? (
        <button
          type="button"
          onClick={stop}
          className="rounded-full border border-primary px-5 py-3 font-bold dark:border-surface"
        >
          ■ {t.stop}
        </button>
      ) : (
        <button
          type="button"
          onClick={play}
          className="rounded-full bg-primary px-5 py-3 font-bold text-surface dark:bg-surface dark:text-primary"
        >
          ▶ {t.play}
        </button>
      )}
      <span className="text-sm">{t.speed}:</span>
      {[
        { value: 0.75, label: t.slow },
        { value: 0.9, label: t.normal },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={rate === option.value}
          onClick={() => setRate(option.value)}
          className={`rounded-full px-3 py-1 text-sm ${rate === option.value ? "bg-accent font-bold text-primary" : "border border-primary/30 dark:border-surface/30"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
