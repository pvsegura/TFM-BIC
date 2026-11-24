import { useMutation } from "@tanstack/react-query";

import { m } from "../i18n/index.js";
import { ApiError, errorMessage } from "../services/api-error.js";
import { openBillingPortal } from "../services/commerce-api.js";

const t = m.marketing.payments;

/** Profile section: opens Stripe's customer portal (change card, invoices, cancel subscription). */
export function BillingSection() {
  const portal = useMutation({
    mutationFn: openBillingPortal,
    onSuccess: (url) => {
      window.location.assign(url);
    },
  });
  return (
    <section aria-labelledby="billing-heading" className="mt-10">
      <h2 id="billing-heading" className="text-xl font-semibold">
        {t.manageTitle}
      </h2>
      <p className="mt-2 text-sm text-primary/80 dark:text-surface/80">{t.manageBody}</p>
      <button
        type="button"
        disabled={portal.isPending || portal.isSuccess}
        onClick={() => portal.mutate()}
        className="mt-3 rounded-md border border-primary px-4 py-2 text-sm font-medium dark:border-surface"
      >
        {portal.isPending || portal.isSuccess ? t.redirecting : t.manageCta}
      </button>
      {portal.isError ? (
        <p role="alert" className="mt-2 text-sm">
          {portal.error instanceof ApiError && portal.error.status === 404
            ? t.manageNone
            : portal.error instanceof ApiError && portal.error.status === 503
              ? t.unavailable
              : errorMessage(portal.error)}
        </p>
      ) : null}
    </section>
  );
}
