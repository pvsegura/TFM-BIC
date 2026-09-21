import { isLesson, type LanguageId, type LevelId } from "@tfm-bic/domain";

import type {
  ContentSummary,
  ListContentUseCase,
} from "../../content/use-cases/list-content.use-case.js";
import type { LessonProgressRepository } from "../ports/lesson-progress-repository.js";
import { toProgressView, type LessonProgressView } from "../progress-view.js";

export interface ListLessonsInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  languageId: LanguageId;
  levelId: LevelId;
}

/** What a lesson card needs: list metadata plus this student's progress. No blocks, no status. */
export type LessonSummary = Omit<ContentSummary, "type"> & { progress: LessonProgressView };

/**
 * The lessons a student can open for one language and level, in explicit order,
 * each with the student's own progress. Which items are visible (published,
 * active language, available level) is `ListContentUseCase`'s rule and is
 * reused as it is; this adds only "it is a lesson" and the progress lookup —
 * one query for the whole list, so the cost does not grow with the number of
 * lessons. Reading never writes.
 */
export class ListLessonsUseCase {
  constructor(
    private readonly listContent: ListContentUseCase,
    private readonly progressRepository: LessonProgressRepository,
  ) {}

  async execute(input: ListLessonsInput): Promise<LessonSummary[]> {
    const items = await this.listContent.execute({
      languageId: input.languageId,
      levelId: input.levelId,
    });
    const lessons = items.filter(isLesson);

    const progress = await this.progressRepository.findByUserAndLessons(
      input.userId,
      lessons.map((lesson) => lesson.id),
    );
    const progressByLesson = new Map(progress.map((record) => [record.lessonId, record]));

    return lessons.map((lesson) => ({
      id: lesson.id,
      languageId: lesson.languageId,
      levelId: lesson.levelId,
      title: lesson.title,
      description: lesson.description,
      order: lesson.order,
      instructionLanguage: lesson.instructionLanguage,
      progress: toProgressView(progressByLesson.get(lesson.id) ?? null),
    }));
  }
}
