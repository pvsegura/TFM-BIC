import { UnsupportedExerciseTypeError } from "./errors/unsupported-exercise-type.error.js";
import type { EvaluationResult } from "./evaluation-result.js";
import type { ExerciseAnswerValue } from "./exercise-answer.js";
import type { ExerciseEvaluator, ExercisePresenter } from "./exercise-evaluator.js";
import type { Exercise, PresentedExercise } from "./exercise.js";
import type { ExerciseType } from "./exercise-type.js";
import { multipleChoiceEvaluator, multipleChoicePresenter } from "./types/multiple-choice.js";
import { textAnswerEvaluator, textAnswerPresenter } from "./types/text-answer.js";
import { trueFalseEvaluator, trueFalsePresenter } from "./types/true-false.js";

/** A judged answer: the validated answer (what an attempt stores) and the verdict. */
export interface EvaluatedAnswer {
  answer: ExerciseAnswerValue;
  evaluation: EvaluationResult;
}

/**
 * One exercise type as the registry holds it: typed inside, uniform outside. The
 * generic types of a single evaluator (`MultipleChoiceExercise`, a string
 * answer, …) are erased here, and the one place that narrows an `Exercise`
 * back to its own type checks `exercise.type` first.
 */
export interface RegisteredExerciseType {
  readonly type: ExerciseType;
  evaluate(exercise: Exercise, input: unknown): EvaluatedAnswer;
  present(exercise: Exercise): PresentedExercise;
}

export function registerExerciseType<
  TExercise extends Exercise,
  TAnswer extends ExerciseAnswerValue,
>(registration: {
  evaluator: ExerciseEvaluator<TExercise, TAnswer>;
  presenter: ExercisePresenter<TExercise, PresentedExercise>;
}): RegisteredExerciseType {
  const { evaluator, presenter } = registration;
  if (evaluator.type !== presenter.type) {
    throw new Error(
      `An exercise type's evaluator and presenter must be for the same type (got "${evaluator.type}" and "${presenter.type}").`,
    );
  }

  const isOwnType = (exercise: Exercise): exercise is TExercise => exercise.type === evaluator.type;
  const own = (exercise: Exercise): TExercise => {
    if (!isOwnType(exercise)) {
      // Unreachable through the registry, which routes by `type`.
      throw new UnsupportedExerciseTypeError(exercise.type);
    }
    return exercise;
  };

  return {
    type: evaluator.type,
    evaluate(exercise, input) {
      const typed = own(exercise);
      const answer = evaluator.parseAnswer(typed, input);
      return { answer, evaluation: evaluator.evaluate(typed, answer) };
    },
    present: (exercise) => presenter.present(own(exercise)),
  };
}

/**
 * The application's own list of exercise types it can evaluate and present.
 * Only what was registered here can ever run: the type comes from validated
 * content, a request cannot name an evaluator, and nothing is looked up by a
 * string that could resolve to an inherited property or a module path.
 */
export class ExerciseTypeRegistry {
  private readonly byType = new Map<string, RegisteredExerciseType>();

  constructor(registrations: readonly RegisteredExerciseType[]) {
    for (const registration of registrations) {
      if (this.byType.has(registration.type)) {
        throw new Error(
          `An evaluator for exercise type "${registration.type}" is already registered.`,
        );
      }
      this.byType.set(registration.type, registration);
    }
  }

  supports(type: string): boolean {
    return this.byType.has(type);
  }

  /** Validates the answer's shape for this exercise, then judges it. */
  evaluate(exercise: Exercise, input: unknown): EvaluatedAnswer {
    return this.registered(exercise).evaluate(exercise, input);
  }

  present(exercise: Exercise): PresentedExercise {
    return this.registered(exercise).present(exercise);
  }

  private registered(exercise: Exercise): RegisteredExerciseType {
    const registered = this.byType.get(exercise.type);
    if (!registered) {
      throw new UnsupportedExerciseTypeError(exercise.type);
    }
    return registered;
  }
}

/** Every exercise type M7 ships. A new type is one more line here. */
export function createDefaultExerciseTypeRegistry(): ExerciseTypeRegistry {
  return new ExerciseTypeRegistry([
    registerExerciseType({
      evaluator: multipleChoiceEvaluator,
      presenter: multipleChoicePresenter,
    }),
    registerExerciseType({ evaluator: textAnswerEvaluator, presenter: textAnswerPresenter }),
    registerExerciseType({ evaluator: trueFalseEvaluator, presenter: trueFalsePresenter }),
  ]);
}
