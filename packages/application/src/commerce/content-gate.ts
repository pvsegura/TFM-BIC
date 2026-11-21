import {
  contentAccessFor,
  createContentId,
  createExerciseId,
  isValidContentId,
  isValidExerciseId,
} from "@verbysia/domain";

import type { ContentRepository } from "../content/ports/content-repository.js";
import type { ExerciseRepository } from "../exercise/ports/exercise-repository.js";
import type { AccessPolicy } from "./access-policy.js";

export type GateDecision = "open" | "locked" | "unknown";

/**
 * Whether a learner may open a lesson/content item or an exercise (which inherits its lesson's
 * access). `unknown` means the id names nothing — the route carries on and answers its own 404,
 * so a locked item and a missing one are never confused with each other by the gate itself.
 * `userId` null = anonymous: only free items are open.
 */
export class ContentGate {
  constructor(
    private readonly content: ContentRepository,
    private readonly exercises: ExerciseRepository,
    private readonly accessPolicy: AccessPolicy,
  ) {}

  async checkContent(userId: string | null, contentId: string): Promise<GateDecision> {
    if (!isValidContentId(contentId)) return "unknown";
    const item = await this.content.findContent(createContentId(contentId));
    if (!item) return "unknown";
    const access = contentAccessFor(item.access, item.levelId);
    if (access.tier !== "course") return "open";
    if (userId === null) return "locked";
    return (await this.accessPolicy.canOpen(userId, access)) ? "open" : "locked";
  }

  async checkExercise(userId: string | null, exerciseId: string): Promise<GateDecision> {
    if (!isValidExerciseId(exerciseId)) return "unknown";
    const exercise = await this.exercises.findById(createExerciseId(exerciseId));
    if (!exercise) return "unknown";
    return this.checkContent(userId, exercise.lessonId);
  }
}
