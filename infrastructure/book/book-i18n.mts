/**
 * Every fixed text printed in the books, per **instruction language** (the learner's language:
 * Polish for "Spanish for Polish speakers", Spanish for a future "Polish for Spanish speakers").
 * The course content itself comes from content/; this is only the book's own furniture.
 */
import type { UnitSectionPhase } from "../../packages/domain/src/index.js";

export interface BookText {
  /** Name of the language being learned, as a title word ("Hiszpański"). */
  languageName: Record<string, string>;
  methodTitle: (language: string) => string;
  books: { podrecznik: string; zeszyt: string };
  phases: Record<UnitSectionPhase, string>;
  blocks: {
    reading: string;
    culture: string;
    pitfall: string;
    mission: string;
    summary: string;
    canDo: string;
  };
  unit: (n: number) => string;
  starterUnit: string;
  /** Prefix the course content puts before unit titles ("Jednostka 3. "), stripped in the book. */
  unitTitlePrefix: RegExp;
  goals: string;
  qrUnitTitle: string;
  qrUnitText: string;
  contents: string;
  edition: string;
  sameCourse: (site: string) => string;
  creditsPlaceholder: string;
  publisherPlaceholder: string;
  howTextbookTitle: string;
  howTextbook: (phases: string) => string[];
  howWorkbookTitle: string;
  howWorkbook: string[];
  grammarTables: string;
  thematicVocabulary: string;
  crossword: { title: string; across: string; down: string; hint: string; key: string };
  glossary: (target: string) => string;
  answerKey: string;
  transcripts: string;
  trueLabel: string;
  falseLabel: string;
  modelAnswer: string;
  cover: {
    textbookHeadline: string;
    workbookHeadline: string;
    textbookBlurb: string;
    workbookBlurb: string;
    levelLine: (level: string) => string;
    qrLine: string;
    pairLine: (other: string) => string;
    foot: string;
  };
}

const PL: BookText = {
  languageName: { es: "Hiszpański", pl: "Polski", en: "Angielski" },
  methodTitle: (language) => `${language} metodą PUENTE`,
  books: { podrecznik: "Podręcznik", zeszyt: "Zeszyt ćwiczeń" },
  phases: {
    perceive: "P · Słuchaj i rozumiej",
    connect: "U · Łącz i zapamiętuj",
    structure: "E · Buduj zdania",
    sound: "Wymowa i pisownia",
    culture: "Czytanie i kultura",
    transform: "T · Przekształcaj",
    express: "E · Mów i pisz",
    review: "N · Utrwalaj",
  },
  blocks: {
    reading: "Czytanie",
    culture: "Kultura",
    pitfall: "Pułapka",
    mission: "Misja",
    summary: "Ściąga",
    canDo: "Potrafię…",
  },
  unit: (n) => `Jednostka ${String(n)}`,
  starterUnit: "Wyzwanie: 7 dni, żeby zacząć mówić",
  unitTitlePrefix: /^Jednostka \d+[A-Z]?\.\s*/,
  goals: "Po tej jednostce potrafisz:",
  qrUnitTitle: "Ta jednostka w aplikacji",
  qrUnitText: "nagrania, ćwiczenia, trener pamięci",
  contents: "Spis treści",
  edition: "Wydanie 1 · 2026 · © Verbysia. Wszelkie prawa zastrzeżone.",
  sameCourse: (site) =>
    `Książka i kurs w aplikacji ${site} to jeden kurs: te same jednostki, te same numery ćwiczeń i nagrań.`,
  creditsPlaceholder:
    "Ilustracje: [ŹRÓDŁA I LICENCJE DO UZUPEŁNIENIA]. Ikony: Tabler Icons (licencja MIT).",
  publisherPlaceholder: "[DANE WYDAWCY I ISBN DO UZUPEŁNIENIA]",
  howTextbookTitle: "Jak korzystać z podręcznika",
  howTextbook: (phases) => [
    `Każda jednostka prowadzi przez fazy metody PUENTE: ${phases}.`,
    "Kod QR na początku jednostki otwiera ją w aplikacji: nagrania, ćwiczenia z natychmiastową korektą, trener pamięci i asystent AI. Ćwiczenia do tej jednostki znajdziesz w Zeszycie ćwiczeń pod tym samym numerem.",
    "Na końcu: tabele gramatyczne i słowniczek.",
  ],
  howWorkbookTitle: "Jak korzystać z zeszytu",
  howWorkbook: [
    "Ćwiczenia mają te same numery co w aplikacji (np. 3.14 = jednostka 3, ćwiczenie 14). Możesz je rozwiązać tutaj albo w aplikacji, gdzie odpowiedź sprawdzi się od razu.",
    "Kod QR przy jednostce otwiera jej ćwiczenia w aplikacji. Rozwiązania i transkrypcje nagrań są na końcu zeszytu.",
  ],
  grammarTables: "Tabele gramatyczne",
  thematicVocabulary: "Słownictwo tematyczne",
  crossword: {
    title: "Krzyżówka",
    across: "Poziomo",
    down: "Pionowo",
    hint: "Wpisz hiszpańskie słowa z tej jednostki, wielkimi literami i bez akcentów (ñ zostaje).",
    key: "Krzyżówka",
  },
  glossary: (target) => `Słowniczek: ${target.toLowerCase()} — polski`,
  answerKey: "Rozwiązania",
  transcripts: "Transkrypcje nagrań",
  trueLabel: "Prawda",
  falseLabel: "Fałsz",
  modelAnswer: "Przykład",
  cover: {
    textbookHeadline: "Od podstaw — z wyjaśnieniami po polsku",
    workbookHeadline: "Ćwiczenia do każdej jednostki",
    textbookBlurb:
      "Podręcznik kursu Verbysia: dialogi, słownictwo, gramatyka z porównaniem do polskiego, typowe błędy Polaków, czytanki i zadania do mówienia.",
    workbookBlurb:
      "Zeszyt ćwiczeń kursu Verbysia: ćwiczenia ponumerowane tak samo jak w aplikacji, powtórki, rozwiązania i transkrypcje nagrań.",
    levelLine: (level) => `poziom ${level} według ESOKJ`,
    qrLine: "kody QR do nagrań i ćwiczeń w aplikacji",
    pairLine: (other) => `razem z publikacją „${other}” tworzy pełny kurs`,
    foot: "Wyjaśnienia po polsku · kody QR do lekcji i ćwiczeń",
  },
};

const ES: BookText = {
  languageName: { pl: "Polaco", es: "Español", en: "Inglés" },
  methodTitle: (language) => `${language} con el método PUENTE`,
  books: { podrecznik: "Libro del alumno", zeszyt: "Cuaderno de ejercicios" },
  phases: {
    perceive: "P · Escucha y entiende",
    connect: "U · Une y memoriza",
    structure: "E · Construye frases",
    sound: "Pronunciación y ortografía",
    culture: "Lectura y cultura",
    transform: "T · Transforma",
    express: "E · Habla y escribe",
    review: "N · Repasa",
  },
  blocks: {
    reading: "Lectura",
    culture: "Cultura",
    pitfall: "Trampa",
    mission: "Misión",
    summary: "Chuleta",
    canDo: "Sé…",
  },
  unit: (n) => `Unidad ${String(n)}`,
  starterUnit: "Reto: 7 días para empezar a hablar",
  unitTitlePrefix: /^Unidad \d+[A-Z]?\.\s*/,
  goals: "Al terminar esta unidad sabrás:",
  qrUnitTitle: "Esta unidad en la aplicación",
  qrUnitText: "audios, ejercicios, entrenador de memoria",
  contents: "Índice",
  edition: "Primera edición · 2026 · © Verbysia. Todos los derechos reservados.",
  sameCourse: (site) =>
    `El libro y el curso en ${site} son un mismo curso: las mismas unidades y los mismos números de ejercicios y audios.`,
  creditsPlaceholder:
    "Ilustraciones: [FUENTES Y LICENCIAS PENDIENTES]. Iconos: Tabler Icons (licencia MIT).",
  publisherPlaceholder: "[DATOS DEL EDITOR E ISBN PENDIENTES]",
  howTextbookTitle: "Cómo usar el libro",
  howTextbook: (phases) => [
    `Cada unidad recorre las fases del método PUENTE: ${phases}.`,
    "El código QR al principio de cada unidad la abre en la aplicación: audios, ejercicios con corrección inmediata, entrenador de memoria y asistente de IA. Los ejercicios de la unidad están en el cuaderno con el mismo número.",
    "Al final: tablas gramaticales y glosario.",
  ],
  howWorkbookTitle: "Cómo usar el cuaderno",
  howWorkbook: [
    "Los ejercicios tienen los mismos números que en la aplicación (3.14 = unidad 3, ejercicio 14). Puedes hacerlos aquí o en la aplicación, donde se corrigen al momento.",
    "El código QR de cada unidad abre sus ejercicios en la aplicación. Las soluciones y las transcripciones están al final del cuaderno.",
  ],
  grammarTables: "Tablas gramaticales",
  thematicVocabulary: "Vocabulario por temas",
  crossword: {
    title: "Autodefinido",
    across: "Horizontales",
    down: "Verticales",
    hint: "Escribe las palabras de esta unidad en mayúsculas y sin tildes.",
    key: "Autodefinido",
  },
  glossary: (target) => `Glosario: ${target.toLowerCase()} — español`,
  answerKey: "Soluciones",
  transcripts: "Transcripciones de los audios",
  trueLabel: "Verdadero",
  falseLabel: "Falso",
  modelAnswer: "Ejemplo",
  cover: {
    textbookHeadline: "Desde cero, con explicaciones en español",
    workbookHeadline: "Ejercicios para cada unidad",
    textbookBlurb:
      "Libro del alumno del curso Verbysia: diálogos, vocabulario, gramática comparada con el español, errores típicos, lecturas y tareas orales.",
    workbookBlurb:
      "Cuaderno de ejercicios del curso Verbysia: ejercicios numerados como en la aplicación, repasos, soluciones y transcripciones.",
    levelLine: (level) => `nivel ${level} del MCER`,
    qrLine: "códigos QR a los audios y ejercicios de la aplicación",
    pairLine: (other) => `junto con el «${other}» forma el curso completo`,
    foot: "Explicaciones en español · códigos QR a lecciones y ejercicios",
  },
};

const EN: BookText = {
  ...ES,
  languageName: { es: "Spanish", pl: "Polish", en: "English" },
  methodTitle: (language) => `${language} with the PUENTE method`,
  books: { podrecznik: "Student's Book", zeszyt: "Workbook" },
  phases: {
    perceive: "P · Listen and understand",
    connect: "U · Connect and remember",
    structure: "E · Build sentences",
    sound: "Pronunciation and spelling",
    culture: "Reading and culture",
    transform: "T · Transform",
    express: "E · Speak and write",
    review: "N · Review",
  },
  blocks: {
    reading: "Reading",
    culture: "Culture",
    pitfall: "Pitfall",
    mission: "Mission",
    summary: "Cheat sheet",
    canDo: "I can…",
  },
  unit: (n) => `Unit ${String(n)}`,
  starterUnit: "Challenge: 7 days to start speaking",
  unitTitlePrefix: /^Unit \d+[A-Z]?\.\s*/,
  goals: "After this unit you can:",
  qrUnitTitle: "This unit in the app",
  qrUnitText: "audio, exercises, memory trainer",
  contents: "Contents",
  edition: "First edition · 2026 · © Verbysia. All rights reserved.",
  sameCourse: (site) =>
    `The book and the course at ${site} are one course: the same units and the same exercise and audio numbers.`,
  creditsPlaceholder:
    "Illustrations: [SOURCES AND LICENCES TO BE ADDED]. Icons: Tabler Icons (MIT licence).",
  publisherPlaceholder: "[PUBLISHER DETAILS AND ISBN TO BE ADDED]",
  howTextbookTitle: "How to use this book",
  howTextbook: (phases) => [
    `Every unit goes through the phases of the PUENTE method: ${phases}.`,
    "The QR code at the start of each unit opens it in the app: audio, instantly corrected exercises, the memory trainer and the AI coach. The unit's exercises are in the Workbook under the same number.",
    "At the end: grammar tables and a glossary.",
  ],
  howWorkbookTitle: "How to use this workbook",
  howWorkbook: [
    "Exercises have the same numbers as in the app (3.14 = unit 3, exercise 14). Do them here or in the app, where they are corrected at once.",
    "The QR code next to each unit opens its exercises in the app. Answers and transcripts are at the end.",
  ],
  grammarTables: "Grammar tables",
  thematicVocabulary: "Vocabulary by topic",
  crossword: {
    title: "Crossword",
    across: "Across",
    down: "Down",
    hint: "Write the words from this unit in capitals, without accents.",
    key: "Crossword",
  },
  glossary: (target) => `Glossary: ${target} — English`,
  answerKey: "Answer key",
  transcripts: "Audio transcripts",
  trueLabel: "True",
  falseLabel: "False",
  modelAnswer: "Model answer",
  cover: {
    textbookHeadline: "From scratch, explained in English",
    workbookHeadline: "Exercises for every unit",
    textbookBlurb:
      "The Verbysia Student's Book: dialogues, vocabulary, grammar compared with English, typical mistakes, readings and speaking tasks.",
    workbookBlurb:
      "The Verbysia Workbook: exercises numbered as in the app, reviews, answer key and transcripts.",
    levelLine: (level) => `CEFR level ${level}`,
    qrLine: "QR codes to the app's audio and exercises",
    pairLine: (other) => `together with the ${other} it makes the full course`,
    foot: "Explained in English · QR codes to lessons and exercises",
  },
};

export const BOOK_TEXTS: Record<string, BookText> = { pl: PL, es: ES, en: EN };

export function bookTextFor(instructionLanguage: string): BookText {
  return BOOK_TEXTS[instructionLanguage] ?? EN;
}

/** Context every renderer needs: the learner's language texts and the target language code. */
export interface RenderContext {
  t: BookText;
  /** The language being learned (for lang="…" on its text). */
  target: string;
}

export const DEFAULT_CONTEXT: RenderContext = { t: PL, target: "es" };
