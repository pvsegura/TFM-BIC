import { Link } from "react-router";

/** Shown after a successful account deletion (M15). Public: the session no longer exists. */
export function AccountDeletedPage() {
  return (
    <section aria-labelledby="account-deleted-heading" className="mx-auto max-w-2xl py-12">
      <h1 id="account-deleted-heading" className="text-2xl font-semibold">
        Your account has been deleted
      </h1>
      <p className="mt-4">
        Your account and the data stored with it have been deleted, and you have been signed out.
      </p>
      <Link to="/" className="mt-6 inline-block text-accent underline">
        Go to the home page
      </Link>
    </section>
  );
}
