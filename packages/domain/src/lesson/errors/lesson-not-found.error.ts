/** No published lesson has this id. Does not reveal whether an unpublished item, or content that is not a lesson, exists under it. */
export class LessonNotFoundError extends Error {
  constructor(lessonId: string) {
    super(`Lesson "${lessonId}" was not found.`);
    this.name = "LessonNotFoundError";
  }
}
