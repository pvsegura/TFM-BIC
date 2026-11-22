import { Button } from "@verbysia/ui";
import { useSearchParams } from "react-router";
import { Link } from "../components/app-link.js";

import { useConfirmNewsletterSubscription } from "../hooks/use-email-preferences.js";
import { errorMessage } from "../services/api-error.js";
import { m } from "../i18n/index.js";

/**
 * Double opt-in step 2 (M14), opened from the confirmation email. Public — the token is the
 * credential. Confirming takes an explicit click rather than happening on page load, so a mail
 * provider's link scanner opening the page cannot record consent on the user's behalf.
 */
export function NewsletterConfirmPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const confirm = useConfirmNewsletterSubscription();

  let content;
  if (!token) {
    content = (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {m.account.newsletter.confirmInvalid}
      </p>
    );
  } else if (confirm.isSuccess) {
    content = (
      <>
        <p role="status">{m.account.newsletter.confirmDone}</p>
        <Link to="/profile" className="mt-4 inline-block text-sm text-accent hover:underline">
          {m.account.newsletter.manage}
        </Link>
      </>
    );
  } else {
    content = (
      <>
        <p>{m.account.newsletter.confirmPrompt}</p>
        <Button className="mt-4" disabled={confirm.isPending} onClick={() => confirm.mutate(token)}>
          {m.account.newsletter.confirm}
        </Button>
        {confirm.isError ? (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {errorMessage(confirm.error)}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <section aria-labelledby="newsletter-confirm-heading" className="mx-auto max-w-md py-12">
      <h1 id="newsletter-confirm-heading" className="text-2xl font-semibold">
        {m.account.newsletter.confirmHeading}
      </h1>
      <div className="mt-6">{content}</div>
    </section>
  );
}
