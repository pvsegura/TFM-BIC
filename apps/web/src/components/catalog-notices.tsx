import { Button } from "@tfm-bic/ui";
import { Link } from "react-router";

/** Safe not-found state: a fixed message (never the requested code or id) and
 * a way back to the start of the catalog. */
export function NotFoundNotice({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-6 rounded-lg border border-primary/20 px-4 py-4 dark:border-surface/20">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-primary/70 dark:text-surface/70">{message}</p>
      <Link to="/learn" className="mt-3 inline-block text-sm underline underline-offset-2">
        Choose a language
      </Link>
    </div>
  );
}

/** A failed load that is worth retrying (network, server) — as opposed to not-found. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-4">
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {message}
      </p>
      <Button className="mt-3" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
