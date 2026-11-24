import { Button } from "@verbysia/ui";
import type { ReactNode } from "react";

import { BillingSection } from "../components/billing-section.js";
import { DataManagementSection } from "../components/data-management-section.js";
import { EmailPreferencesSection } from "../components/email-preferences-section.js";
import { ProfileForm } from "../components/profile-form.js";
import { useCurrentProfile } from "../hooks/use-current-profile.js";
import { m } from "../i18n/index.js";

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
        {m.account.profile.loading}
      </p>
    );
  } else if (profileQuery.isError) {
    body = (
      <div className="mt-6">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {m.account.profile.error}
        </p>
        <Button className="mt-4" onClick={() => void profileQuery.refetch()}>
          {m.account.profile.tryAgain}
        </Button>
      </div>
    );
  } else {
    body = <ProfileForm profile={profileQuery.data} />;
  }

  return (
    <section aria-labelledby="profile-heading" className="mx-auto max-w-2xl py-8">
      <h1 id="profile-heading" className="text-2xl font-semibold">
        {m.account.profile.title}
      </h1>
      {body}
      <EmailPreferencesSection />
      <BillingSection />
      <DataManagementSection />
    </section>
  );
}
