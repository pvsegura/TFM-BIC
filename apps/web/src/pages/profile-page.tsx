import { Button } from "@tfm-bic/ui";
import type { ReactNode } from "react";

import { ProfileForm } from "../components/profile-form.js";
import { useCurrentProfile } from "../hooks/use-current-profile.js";

/**
 * Loads the signed-in student's profile and renders the form once it is
 * available. Behind `ProtectedRoute` (frontend UX gate only — the API
 * authorizes every request on its own).
 */
export function ProfilePage() {
  const profileQuery = useCurrentProfile();

  let body: ReactNode;
  if (profileQuery.isPending) {
    body = (
      <p role="status" className="mt-6">
        Loading your profile…
      </p>
    );
  } else if (profileQuery.isError) {
    body = (
      <div className="mt-6">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          We couldn&apos;t load your profile. Please try again.
        </p>
        <Button className="mt-4" onClick={() => void profileQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    body = <ProfileForm profile={profileQuery.data} />;
  }

  return (
    <section aria-labelledby="profile-heading" className="mx-auto max-w-2xl py-8">
      <h1 id="profile-heading" className="text-2xl font-semibold">
        Your profile
      </h1>
      {body}
    </section>
  );
}
