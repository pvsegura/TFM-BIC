import {
  activeSince,
  defaultDirectionFor,
  MAX_ROSTER_PAGE,
  MAX_ROSTER_PAGE_SIZE,
  requireRole,
  type RosterActivityFilter,
  type RosterSortDirection,
  type RosterSortField,
} from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type { TeacherDashboardReadModel } from "../ports/teacher-dashboard-read-model.js";
import { toRosterStudentView, type RosterStudentView, type TeachingViewer } from "../views.js";

export interface ListTeacherStudentsInput {
  viewer: TeachingViewer;
  page: number;
  pageSize: number;
  search?: string | undefined;
  activity?: RosterActivityFilter | undefined;
  sort?: RosterSortField | undefined;
  direction?: RosterSortDirection | undefined;
}

export interface TeacherStudentsPage {
  students: RosterStudentView[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort: { field: RosterSortField; direction: RosterSortDirection };
}

/**
 * One page of the teacher's students. Offset paging (page/pageSize) rather than the keyset cursor
 * other lists use, because the sortable measures are aggregates computed for the teacher's whole
 * roster anyway — see ADR-024. The bounds are checked here too, not only by the contract.
 */
export class ListTeacherStudentsUseCase {
  constructor(
    private readonly readModel: TeacherDashboardReadModel,
    private readonly clock: Clock,
  ) {}

  async execute(input: ListTeacherStudentsInput): Promise<TeacherStudentsPage> {
    requireRole(input.viewer.role, ["TEACHER"]);
    const { page, pageSize } = input;
    if (!Number.isInteger(page) || page < 1 || page > MAX_ROSTER_PAGE) {
      throw new RangeError("Page is out of range.");
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_ROSTER_PAGE_SIZE) {
      throw new RangeError("Page size is out of range.");
    }

    const now = this.clock.now();
    const sort = input.sort ?? "name";
    const direction = input.direction ?? defaultDirectionFor(sort);
    const result = await this.readModel.listStudents(input.viewer.id, {
      activeSince: activeSince(now),
      ...(input.search === undefined ? {} : { search: input.search }),
      ...(input.activity === undefined ? {} : { activity: input.activity }),
      sort,
      direction,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      students: result.students.map((record) => toRosterStudentView(record, now)),
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
      sort: { field: sort, direction },
    };
  }
}
