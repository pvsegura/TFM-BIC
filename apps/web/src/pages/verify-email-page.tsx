import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { Link } from "../components/app-link.js";

import { useVerifyEmail } from "../hooks/use-verify-email.js";
import { m } from "../i18n/index.js";
import { ApiError, errorMessage } from "../services/api-error.js";

const t = m.auth.verify;

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const verifyEmailMutation = useVerifyEmail();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (token && !hasStarted.current) {
      hasStarted.current = true;
      verifyEmailMutation.mutate({ token });
    }
    // Only ever runs once per mount for a given token — the mutation
    // object itself is stable enough for this effect's purposes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <section aria-labelledby="verify-email-heading" className="mx-auto max-w-md py-12">
      <h1 id="verify-email-heading" className="text-2xl font-semibold">
        {t.title}
      </h1>

      <div className="mt-6">
        {!token ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {t.invalidLink}
          </p>
        ) : verifyEmailMutation.isPending ? (
          <p role="status">{t.pending}</p>
        ) : verifyEmailMutation.isSuccess ? (
          <>
            <p>{t.successBody}</p>
            <Link to="/login" className="mt-4 inline-block text-sm text-accent hover:underline">
              {t.continue}
            </Link>
          </>
        ) : verifyEmailMutation.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {verifyEmailMutation.error instanceof ApiError &&
            verifyEmailMutation.error.status === 400
              ? t.expiredLink
              : errorMessage(verifyEmailMutation.error)}
          </p>
        ) : null}
      </div>
    </section>
  );
}
