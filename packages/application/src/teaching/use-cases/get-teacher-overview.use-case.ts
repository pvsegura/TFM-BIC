import { ACTIVE_WINDOW_DAYS, accuracyPercent, activeSince, requireRole } from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type { TeacherDashboardReadModel } from "../ports/teacher-dashboard-read-model.js";
import type { TeachingViewer } from "../views.js";

export interface GetTeacherOverviewInput {
  viewer: TeachingViewer;
}

export interface TeacherOverview {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  /** The window behind "active", so the page can say what it means. */
  activeWindowDays: number;
  lessonsCompleted: number;
  exerciseAttempts: number;
  /** Correct / all attempts across the teacher's students; `null` when there are none. */
  accuracyPercent: number | null;
  points: number;
}

/**
 * The teacher's summary: one grouped read over their own students. The role is checked here as
 * well as at the route, so no caller can reach the read model as a student.
 */
export class GetTeacherOverviewUseCase {
  constructor(
    private readonly readModel: TeacherDashboardReadModel,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetTeacherOverviewInput): Promise<TeacherOverview> {
    requireRole(input.viewer.role, ["TEACHER"]);
    const totals = await this.readModel.overview(input.viewer.id, activeSince(this.clock.now()));
    return {
      totalStudents: totals.totalStudents,
      activeStudents: totals.activeStudents,
      inactiveStudents: totals.totalStudents - totals.activeStudents,
      activeWindowDays: ACTIVE_WINDOW_DAYS,
      lessonsCompleted: totals.lessonsCompleted,
      exerciseAttempts: totals.exerciseAttempts,
      accuracyPercent: accuracyPercent(totals.correctAttempts, totals.exerciseAttempts),
      points: totals.points,
    };
  }
}
