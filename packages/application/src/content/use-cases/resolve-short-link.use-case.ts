import {
  createLanguageId,
  createLevelId,
  isValidLanguageId,
  isValidLevelId,
  sortContentItems,
  UNIT_SECTION_PHASES,
  type ContentItem,
  type UnitSectionPhase,
} from "@verbysia/domain";

import type { ExerciseRepository } from "../../exercise/ports/exercise-repository.js";
import type { ContentRepository } from "../ports/content-repository.js";

/**
 * Short, stable links printed as QR codes in the books (`/k/{language}-{level}/{unit}[/{target}]`).
 * A printed book cannot be updated, so the link names the course structure — unit, section,
 * workbook number — and this resolves it to wherever that lives in the app today.
 *
 * - `/k/es-a1/3`           → the unit's first lesson
 * - `/k/es-a1/3/structure` → the lesson section of that PUENTE phase
 * - `/k/es-a1/3/14`        → workbook exercise 3.14
 *
 * Only published content resolves. Anything unknown resolves to `null` (the route then sends the
 * reader to the lessons list rather than to an error).
 */
export interface ShortLinkInput {
  course: string;
  unit: string;
  target?: string | undefined;
}

const COURSE = /^([a-z]{2,3})-([a-z][0-9])$/;
const UNIT = /^\d{1,2}$/;
const EXERCISE_NUMBER = /^\d{1,3}$/;

function isPhase(value: string): value is UnitSectionPhase {
  return (UNIT_SECTION_PHASES as readonly string[]).includes(value);
}

export class ResolveShortLinkUseCase {
  constructor(
    private readonly content: ContentRepository,
    private readonly exercises: ExerciseRepository,
  ) {}

  async execute(input: ShortLinkInput): Promise<string | null> {
    const course = COURSE.exec(input.course);
    if (!course || !UNIT.test(input.unit)) return null;
    const [, language = "", level = ""] = course;
    if (!isValidLanguageId(language) || !isValidLevelId(level)) return null;
    const unit = Number(input.unit);

    const lessons = sortContentItems(
      (await this.content.listContent(createLanguageId(language), createLevelId(level))).filter(
        (item: ContentItem) =>
          item.type === "lesson" && item.status === "published" && item.unit === unit,
      ),
    );
    const first = lessons[0];
    if (!first) return null;

    const target = input.target;
    if (target === undefined) return `/learn/lessons/${first.id}`;

    if (isPhase(target)) {
      const withSection = lessons.find((lesson) =>
        lesson.blocks.some((block) => block.type === "section" && block.phase === target),
      );
      return withSection ? `/learn/lessons/${withSection.id}#section-${target}` : null;
    }

    if (EXERCISE_NUMBER.test(target)) {
      const number = Number(target);
      for (const lesson of lessons) {
        const match = (await this.exercises.listByLesson(lesson.id)).find(
          (exercise) =>
            exercise.status === "published" &&
            exercise.book?.unit === unit &&
            exercise.book.number === number,
        );
        if (match) return `/learn/exercises/${match.id}`;
      }
    }
    return null;
  }
}
