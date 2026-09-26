import { Button } from "@tfm-bic/ui";
import { useSearchParams } from "react-router";

import { useUnsubscribeWithToken } from "../hooks/use-email-preferences.js";
import { ApiError } from "../services/api-error.js";

/**
 * Unsubscribe from the link in a newsletter (M14). No login and no password: the signed token in
 * the link is enough, and all it can do is withdraw newsletter consent. One explicit click, so a
 * link scanner opening the page does not unsubscribe anyone. Mail clients that support one-click
 * unsubscribe call the API directly and never show this page.
 */
export function NewsletterUnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const unsubscribe = useUnsubscribeWithToken();

  let content;
  if (!token) {
    content = (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        This unsubscribe link is invalid.
      </p>
    );
  } else if (unsubscribe.isSuccess) {
    content = (
      <p role="status">
        You have been unsubscribed from the newsletter. You will still receive essential account
        emails, such as password resets.
      </p>
    );
  } else {
    content = (
      <>
        <p>
          Stop receiving our newsletter? You will still receive essential account emails, such as
          password resets.
        </p>
        <Button
          className="mt-4"
          disabled={unsubscribe.isPending}
          onClick={() => unsubscribe.mutate(token)}
        >
          Unsubscribe
        </Button>
        {unsubscribe.isError ? (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {unsubscribe.error instanceof ApiError
              ? unsubscribe.error.message
              : "Something went wrong. Please try again."}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <section aria-labelledby="newsletter-unsubscribe-heading" className="mx-auto max-w-md py-12">
      <h1 id="newsletter-unsubscribe-heading" className="text-2xl font-semibold">
        Unsubscribe from the newsletter
      </h1>
      <div className="mt-6">{content}</div>
    </section>
  );
}
