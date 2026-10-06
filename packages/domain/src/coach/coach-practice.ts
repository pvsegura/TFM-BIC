/**
 * A small practice activity the coach generated for one learner, in the moment.
 *
 * This is **not** an exercise (M7). An exercise is authored content with a stable id, a registered
 * type, a pure evaluator and an append-only attempt history; a generated activity is disposable,
 * has no id, is never stored, never scored by the server, never awarded points, and never appears
 * in progress. Keeping the two types apart is what stops generated text from ever being mistaken
 * for authoritative content (ADR-034, decision 4).
 *
 * The shape is deliberately narrow — a prompt, a few options, the index of the answer, one line of
 * explanation — because the UI renders it as plain text in fixed components and nothing in it may
 * become markup.
 */

/** Items per generated activity. Enough for retrieval practice (M22 principle 1), small enough to
 * keep generation cheap and the learner's working memory free (principle 5). */
export const PRACTICE_MIN_ITEMS = 1;
export const PRACTICE_MAX_ITEMS = 5;

/** Options per item; 2 is a true/false-shaped choice, 4 is a typical multiple choice. */
export const PRACTICE_MIN_OPTIONS = 2;
export const PRACTICE_MAX_OPTIONS = 4;

export const PRACTICE_PROMPT_MAX_LENGTH = 300;
export const PRACTICE_OPTION_MAX_LENGTH = 120;
export const PRACTICE_EXPLANATION_MAX_LENGTH = 400;
export const PRACTICE_TITLE_MAX_LENGTH = 120;

export interface GeneratedPracticeItem {
  /** The question, in the learner's instruction language unless the activity is in the target language. */
  readonly prompt: string;
  readonly options: readonly string[];
  /** Index into `options`. Validated to be in range before the activity leaves the server. */
  readonly answerIndex: number;
  /** Why that answer is right — the pedagogical feedback (M22 principle 9), one or two sentences. */
  readonly explanation: string;
}

export interface GeneratedPractice {
  readonly title: string;
  readonly items: readonly GeneratedPracticeItem[];
}

/**
 * Whether a model's structured output is usable as an activity. Everything the model produces is
 * checked here — length, counts, and above all that `answerIndex` names an option that exists, so
 * the UI can never be asked to reveal an answer that is not there.
 *
 * Returns the reasons rather than throwing: a malformed activity is reported back to the model so
 * it can try once more (or answer in prose instead), which is more useful to a learner than an
 * error page.
 */
export function validateGeneratedPractice(candidate: GeneratedPractice): readonly string[] {
  const problems: string[] = [];
  if (candidate.title.trim() === "" || candidate.title.length > PRACTICE_TITLE_MAX_LENGTH) {
    problems.push("title must be 1–120 characters");
  }
  if (candidate.items.length < PRACTICE_MIN_ITEMS || candidate.items.length > PRACTICE_MAX_ITEMS) {
    problems.push(`items must number ${PRACTICE_MIN_ITEMS}–${PRACTICE_MAX_ITEMS}`);
  }
  candidate.items.forEach((item, index) => {
    const at = `item ${index + 1}`;
    if (item.prompt.trim() === "" || item.prompt.length > PRACTICE_PROMPT_MAX_LENGTH) {
      problems.push(`${at}: prompt must be 1–${PRACTICE_PROMPT_MAX_LENGTH} characters`);
    }
    if (
      item.options.length < PRACTICE_MIN_OPTIONS ||
      item.options.length > PRACTICE_MAX_OPTIONS ||
      item.options.some(
        (option) => option.trim() === "" || option.length > PRACTICE_OPTION_MAX_LENGTH,
      )
    ) {
      problems.push(
        `${at}: options must number ${PRACTICE_MIN_OPTIONS}–${PRACTICE_MAX_OPTIONS}, each 1–${PRACTICE_OPTION_MAX_LENGTH} characters`,
      );
    }
    if (!Number.isInteger(item.answerIndex) || !(item.answerIndex in item.options)) {
      problems.push(`${at}: answerIndex must name one of the options`);
    }
    if (
      item.explanation.trim() === "" ||
      item.explanation.length > PRACTICE_EXPLANATION_MAX_LENGTH
    ) {
      problems.push(`${at}: explanation must be 1–${PRACTICE_EXPLANATION_MAX_LENGTH} characters`);
    }
  });
  return problems;
}
