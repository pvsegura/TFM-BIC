import { useEffect } from "react";
import { useRouteError } from "react-router";

import {
  reportClientError,
  type ReportClientError,
} from "../observability/client-error-reporter.js";

/**
 * The SPA's error boundary (M18): React Router renders this in place of any route whose element
 * throws while rendering. It replaces the router's default developer screen, which prints the
 * error's message and stack to the user. The error is reported (kind and class name only — see
 * client-error-reporter.ts) and the user gets a way out; nothing about the error is shown.
 */
export function RouteErrorFallback({ report = reportClientError }: { report?: ReportClientError }) {
  const error = useRouteError();

  useEffect(() => {
    report("render", error);
  }, [error, report]);

  return (
    <section role="alert" aria-labelledby="route-error-heading" className="mx-auto max-w-2xl py-12">
      <h1 id="route-error-heading" className="text-2xl font-semibold">
        Something went wrong
      </h1>
      <p className="mt-2 text-primary/70 dark:text-surface/70">
        This page could not be displayed. Please try again.
      </p>
      <div className="mt-6 flex gap-4">
        <button
          type="button"
          className="rounded bg-primary px-4 py-2 text-surface"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload the page
        </button>
        <a href="/" className="px-4 py-2 underline">
          Go to the home page
        </a>
      </div>
    </section>
  );
}
