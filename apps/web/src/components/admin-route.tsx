import { Outlet } from "react-router";

import { useCurrentUser } from "../hooks/use-current-user.js";
import { m } from "../i18n/index.js";
import { Link } from "./app-link.js";

/**
 * Shows the admin panel only to a signed-in ADMIN. UX, not security: every /admin request is
 * authorised by the API itself (role ADMIN) and every change is audited there.
 */
export function AdminRoute() {
  const { data: user, isPending } = useCurrentUser();

  if (isPending) return <p role="status">{m.common.loading}</p>;

  if (user?.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <h1 className="text-2xl font-semibold">{m.admin.onlyAdminsTitle}</h1>
        <p className="mt-2 text-primary/80 dark:text-surface/80">{m.admin.onlyAdminsBody}</p>
        <Link to="/dashboard" className="mt-3 inline-block text-sm underline underline-offset-2">
          {m.admin.goDashboard}
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
