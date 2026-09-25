import {
  teacherOverviewResponseSchema,
  teacherStudentDetailResponseSchema,
  teacherStudentListQuerySchema,
  teacherStudentsResponseSchema,
  type TeacherOverviewResponse,
  type TeacherStudentDetailResponse,
  type TeacherStudentsResponse,
} from "@tfm-bic/contracts";

import { requestJson } from "./api-request.js";

/**
 * The teacher dashboard is **read-only** and identity-free on the client: every request carries
 * the session cookie and nothing else identifies the teacher, so there is no teacher id to
 * tamper with. What a teacher may see is decided by the API; this module only asks and validates
 * the answer against the shared contract (an allowlist, so an unexpected field never reaches a
 * component).
 */

/** The allowed values come from the shared contract — the same lists the API validates against. */
const { shape } = teacherStudentListQuerySchema;
const ACTIVITY = shape.activity.unwrap().options;
const SORTS = shape.sort.unwrap().options;
const DIRECTIONS = shape.direction.unwrap().options;

export type StudentActivityFilter = (typeof ACTIVITY)[number];
export type StudentSortField = (typeof SORTS)[number];
export type StudentSortDirection = (typeof DIRECTIONS)[number];

export interface StudentListParams {
  q?: string;
  activity?: StudentActivityFilter;
  sort?: StudentSortField;
  direction?: StudentSortDirection;
  page?: number;
}

const oneOf = <T extends string>(values: readonly T[], value: string | null): T | undefined =>
  values.find((candidate) => candidate === value);

/**
 * The list parameters a page URL asks for, keeping only values the API documents (so a pasted or
 * hand-edited URL never produces a request the API would refuse). The API validates again.
 */
export function studentListSearch(search: URLSearchParams): StudentListParams {
  const params: StudentListParams = {};
  const q = search.get("q")?.trim();
  if (q) {
    params.q = q.slice(0, 50);
  }
  const activity = oneOf(ACTIVITY, search.get("activity"));
  if (activity) {
    params.activity = activity;
  }
  const sort = oneOf(SORTS, search.get("sort"));
  if (sort) {
    params.sort = sort;
  }
  const direction = oneOf(DIRECTIONS, search.get("direction"));
  if (direction) {
    params.direction = direction;
  }
  const page = Number(search.get("page"));
  if (Number.isInteger(page) && page > 1 && page <= 1000) {
    params.page = page;
  }
  return params;
}

export async function fetchTeacherOverview(): Promise<TeacherOverviewResponse> {
  return teacherOverviewResponseSchema.parse(await requestJson("/teacher-dashboard/overview"));
}

export async function fetchTeacherStudents(
  params: StudentListParams,
): Promise<TeacherStudentsResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }
  const suffix = query.size === 0 ? "" : `?${query.toString()}`;
  return teacherStudentsResponseSchema.parse(
    await requestJson(`/teacher-dashboard/students${suffix}`),
  );
}

export async function fetchTeacherStudent(
  studentId: string,
): Promise<TeacherStudentDetailResponse> {
  return teacherStudentDetailResponseSchema.parse(
    await requestJson(`/teacher-dashboard/students/${encodeURIComponent(studentId)}`),
  );
}
