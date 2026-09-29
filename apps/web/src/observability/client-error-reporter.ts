import { clientErrorReportSchema, type ClientErrorReport } from "@tfm-bic/contracts";

export type ClientErrorKind = ClientErrorReport["kind"];
export type ReportClientError = (kind: ClientErrorKind, error: unknown) => void;

/** Enough to see that something is wrong; a crash loop must not flood the API or the logs. */
const DEFAULT_LIMIT = 5;

const SAFE_NAME = /^[A-Za-z_$][A-Za-z0-9_$.]{0,63}$/;

/**
 * Reports an unhandled SPA error to the API's `POST /client-errors` (M18, ADR-029). Sends **only**
 * the kind, the error's class name and the page's path — never the message or stack (they can
 * contain what a user typed), never a query string (reset/unsubscribe links carry tokens there),
 * never cookies or storage. Same origin, so the CSP needs no change and no third party sees it.
 * Deduplicated, capped per page load, and it never throws: reporting is best effort.
 */
export function createClientErrorReporter(options: {
  fetch: typeof fetch;
  currentPath: () => string;
  limit?: number;
}): ReportClientError {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const seen = new Set<string>();

  return (kind, error) => {
    try {
      const rawName = error instanceof Error ? error.name : "NonError";
      const name = SAFE_NAME.test(rawName) ? rawName : "Error";
      const candidate = { kind, name, path: options.currentPath() };
      const report = clientErrorReportSchema.safeParse(candidate).success
        ? candidate
        : { ...candidate, path: "/" };
      const key = `${report.kind}|${report.name}|${report.path}`;
      if (seen.has(key) || seen.size >= limit) {
        return;
      }
      seen.add(key);
      void options
        .fetch("/client-errors", {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(report),
        })
        .catch(() => undefined);
    } catch {
      // Best effort: an error while reporting an error is dropped.
    }
  };
}

/** Uncaught errors and unhandled promise rejections anywhere in the page. Returns an uninstaller. */
export function installGlobalErrorHandlers(
  target: EventTarget,
  report: ReportClientError,
): () => void {
  const onError = (event: Event) => {
    report("uncaught", (event as ErrorEvent).error);
  };
  const onRejection = (event: Event) => {
    report("unhandled_rejection", (event as PromiseRejectionEvent).reason);
  };
  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onRejection);
  };
}

/** The page's reporter. `window.fetch` is read at call time, so tests can stub it. */
export const reportClientError: ReportClientError = createClientErrorReporter({
  fetch: (...args) => window.fetch(...args),
  currentPath: () => window.location.pathname,
});
