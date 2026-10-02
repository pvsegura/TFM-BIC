import { Button } from "@tfm-bic/ui";
import { useSearchParams } from "react-router";
import { Link } from "../components/app-link.js";

import { useConfirmNewsletterSubscription } from "../hooks/use-email-preferences.js";
import { ApiError } from "../services/api-error.js";

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
        This confirmation link is invalid.
      </p>
    );
  } else if (confirm.isSuccess) {
    content = (
      <>
        <p role="status">Thank you — your newsletter subscription is confirmed.</p>
        <Link to="/profile" className="mt-4 inline-block text-sm text-accent hover:underline">
          Manage your email preferences
        </Link>
      </>
    );
  } else {
    content = (
      <>
        <p>Please confirm that you want to receive our newsletter by email.</p>
        <Button className="mt-4" disabled={confirm.isPending} onClick={() => confirm.mutate(token)}>
          Confirm subscription
        </Button>
        {confirm.isError ? (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {confirm.error instanceof ApiError
              ? confirm.error.message
              : "Something went wrong. Please try again."}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <section aria-labelledby="newsletter-confirm-heading" className="mx-auto max-w-md py-12">
      <h1 id="newsletter-confirm-heading" className="text-2xl font-semibold">
        Newsletter subscription
      </h1>
      <div className="mt-6">{content}</div>
    </section>
  );
}
