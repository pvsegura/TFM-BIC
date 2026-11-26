/**
 * The courses Verbysia offers, each named and described in the language of the people who take
 * it (a Spanish speaker reads "Polaco para hispanohablantes" whatever the interface language),
 * so every visitor recognises their own course at a glance. Keyed `{language}-{instruction}`;
 * the page shows only the courses the content catalog actually serves.
 */
export interface CourseLabel {
  /** The language being learned. */
  language: string;
  /** The learner's language: the course explains itself in it. */
  instruction: string;
  name: string;
  description: string;
}

export const COURSES: readonly CourseLabel[] = [
  {
    language: "es",
    instruction: "pl",
    name: "Hiszpański dla Polaków",
    description:
      "Kurs główny Verbysii — metoda PUENTE, wyjaśnienia po polsku, podręcznik i zeszyt ćwiczeń.",
  },
  {
    language: "pl",
    instruction: "es",
    name: "Polaco para hispanohablantes",
    description:
      "Método PUENTE, explicaciones en español, libro y cuaderno de ejercicios. En construcción: nuevas lecciones cada semana.",
  },
  {
    language: "pl",
    instruction: "en",
    name: "Polish for English speakers",
    description: "Explanations in English, levels A1–C2.",
  },
  {
    language: "en",
    instruction: "es",
    name: "Inglés para hispanohablantes",
    description: "Explicaciones en español.",
  },
];
