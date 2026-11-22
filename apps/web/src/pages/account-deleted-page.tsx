import { Link } from "../components/app-link.js";
import { m } from "../i18n/index.js";

const t = m.auth.accountDeleted;

/** Shown after a successful account deletion (M15). Public: the session no longer exists. */
export function AccountDeletedPage() {
  return (
    <section aria-labelledby="account-deleted-heading" className="mx-auto max-w-2xl py-12">
      <h1 id="account-deleted-heading" className="text-2xl font-semibold">
        {t.title}
      </h1>
      <p className="mt-4">{t.body}</p>
      <Link to="/" className="mt-6 inline-block text-accent underline">
        {t.home}
      </Link>
    </section>
  );
}
