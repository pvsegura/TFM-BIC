/**
 * What a student submits and what is stored for an attempt: a JSON-representable
 * value whose shape depends on the exercise type (multiple choice: the chosen
 * option id; text answer: the typed text; true/false: a boolean). A type that
 * needs a richer answer widens this in one place.
 */
export type ExerciseAnswerValue = string | boolean;
