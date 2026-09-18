import { Navigate, Outlet, useLocation } from "react-router";

import { useCurrentUser } from "../hooks/use-current-user.js";

/**
 * Frontend route protection is NOT authorization — the backend remains
 * authoritative on every request (see docs/adr/adr-006-authentication.md).
 * This only avoids showing a page whose data a `GET /auth/me`-authenticated
 * fetch would fail against anyway, and avoids a flash of protected content
 * while the session is still being restored.
 */
export function ProtectedRoute() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return <p role="status">Loading…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
