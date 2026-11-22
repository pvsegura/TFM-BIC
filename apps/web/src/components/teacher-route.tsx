import { Outlet } from "react-router";
import { Link } from "./app-link.js";

import { useCurrentUser } from "../hooks/use-current-user.js";
import { m } from "../i18n/index.js";

/**
 * Shows the teacher pages only to a signed-in TEACHER. This is **UX, not security**: it saves a
 * student a page of refused requests, but every teacher-dashboard request is authorised by the API
 * itself (role and teacher–student link), whatever this component shows. Sits inside
 * ProtectedRoute, which has already sent anonymous visitors to the login page.
 */
export function TeacherRoute() {
  const { data: user, isPending } = useCurrentUser();

  if (isPending) {
    return <p role="status">{m.common.loading}</p>;
  }

  if (user?.role !== "TEACHER") {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <h1 className="text-2xl font-semibold">{m.account.teacherOnly.title}</h1>
        <p className="mt-2 text-primary/80 dark:text-surface/80">{m.account.teacherOnly.body}</p>
        <Link to="/dashboard" className="mt-3 inline-block text-sm underline underline-offset-2">
          {m.account.teacherOnly.goDashboard}
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
