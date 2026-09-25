import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchTeacherOverview,
  fetchTeacherStudent,
  fetchTeacherStudents,
  type StudentListParams,
} from "../services/teacher-dashboard-api.js";
import { endingSessionOnUnauthorized } from "./session-cache.js";

/**
 * Query-key root for the teacher dashboard. Everything under it is data the signed-in teacher is
 * allowed to see *because of who they are*, so it is user-scoped: `clearUserScopedCache` drops it
 * on logout and login, and it is never copied into Zustand. Retries are off so a refused request
 * (403/404) or an ended session shows straight away.
 */
export const TEACHER_QUERY_KEY_ROOT = "teacher";

export function useTeacherOverview() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [TEACHER_QUERY_KEY_ROOT, "overview"],
    queryFn: () => endingSessionOnUnauthorized(queryClient, fetchTeacherOverview),
    retry: false,
  });
}

/** One page of the roster. The previous page stays on screen while the next one loads. */
export function useTeacherStudents(params: StudentListParams) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [TEACHER_QUERY_KEY_ROOT, "students", params],
    queryFn: () => endingSessionOnUnauthorized(queryClient, () => fetchTeacherStudents(params)),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useTeacherStudent(studentId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [TEACHER_QUERY_KEY_ROOT, "student", studentId],
    queryFn: () => endingSessionOnUnauthorized(queryClient, () => fetchTeacherStudent(studentId)),
    retry: false,
  });
}
