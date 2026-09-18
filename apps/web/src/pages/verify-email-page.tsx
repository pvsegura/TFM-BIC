import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";

import { useVerifyEmail } from "../hooks/use-verify-email.js";
import { ApiError } from "../services/api-error.js";

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
        Email verification
      </h1>

      <div className="mt-6">
        {!token ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            This verification link is invalid.
          </p>
        ) : verifyEmailMutation.isPending ? (
          <p role="status">Verifying your email…</p>
        ) : verifyEmailMutation.isSuccess ? (
          <>
            <p>{verifyEmailMutation.data.message}</p>
            <Link to="/login" className="mt-4 inline-block text-sm text-accent hover:underline">
              Continue to log in
            </Link>
          </>
        ) : verifyEmailMutation.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {verifyEmailMutation.error instanceof ApiError
              ? verifyEmailMutation.error.message
              : "Something went wrong. Please try again."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
