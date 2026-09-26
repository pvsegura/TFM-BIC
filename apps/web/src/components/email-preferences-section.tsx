import type { NewsletterPreferenceResponse } from "@tfm-bic/contracts";
import { Button } from "@tfm-bic/ui";
import { useId, useState, type FormEvent, type ReactNode } from "react";

import {
  useEmailPreferences,
  useSubscribeToNewsletter,
  useUnsubscribeFromNewsletter,
} from "../hooks/use-email-preferences.js";
import { ApiError } from "../services/api-error.js";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const DATE_FORMAT = new Intl.DateTimeFormat("en", { dateStyle: "long" });

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR;
}

function formatSince(since: string | null): string {
  return since ? ` since ${DATE_FORMAT.format(new Date(since))}` : "";
}

/**
 * Email preferences (M14, ADR-025). Two categories that are deliberately not presented alike:
 * essential (transactional) email is described as always on — there is no control for it — and
 * the newsletter is an explicit, unticked opt-in confirmed by email (double opt-in).
 */
export function EmailPreferencesSection() {
  const preferencesQuery = useEmailPreferences();

  let body: ReactNode;
  if (preferencesQuery.isPending) {
    body = <p role="status">Loading your email preferences…</p>;
  } else if (preferencesQuery.isError) {
    body = (
      <div>
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          We couldn&apos;t load your email preferences.
        </p>
        <Button className="mt-4" onClick={() => void preferencesQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    body = (
      <>
        <fieldset className="mt-4 rounded-md border border-primary/20 p-4">
          <legend className="px-1 font-medium">Essential emails</legend>
          <p className="text-sm">
            <strong>Always on.</strong> Account and security emails — email verification, password
            resets and other messages about your account. They are needed to use your account and
            are never marketing, so they can&apos;t be turned off here.
          </p>
        </fieldset>
        <NewsletterPreference newsletter={preferencesQuery.data.newsletter} />
      </>
    );
  }

  return (
    <section aria-labelledby="email-preferences-heading" className="mt-10">
      <h2 id="email-preferences-heading" className="text-xl font-semibold">
        Email preferences
      </h2>
      {body}
    </section>
  );
}

function NewsletterPreference({ newsletter }: { newsletter: NewsletterPreferenceResponse }) {
  const subscribe = useSubscribeToNewsletter();
  const unsubscribe = useUnsubscribeFromNewsletter();
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentMissing, setConsentMissing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const ids = { description: useId(), error: useId(), consent: useId() };
  const busy = subscribe.isPending || unsubscribe.isPending;
  const error = subscribe.error ?? unsubscribe.error;

  function requestSubscription() {
    setNotice(null);
    unsubscribe.reset();
    subscribe.mutate(undefined, {
      onSuccess: (result) => {
        setNotice(
          result.newsletter.status === "subscribed"
            ? "You are already subscribed."
            : result.confirmationEmailSent
              ? "We sent a confirmation link to your email address. Your subscription starts once you open it."
              : "A confirmation link was sent a moment ago — please check your inbox.",
        );
      },
    });
  }

  function onSubscribe(event: FormEvent) {
    event.preventDefault();
    if (!consentGiven) {
      setConsentMissing(true);
      return;
    }
    setConsentMissing(false);
    requestSubscription();
  }

  function onUnsubscribe() {
    setNotice(null);
    subscribe.reset();
    unsubscribe.mutate(undefined, {
      onSuccess: () => {
        setConsentGiven(false);
        setNotice(
          "You have unsubscribed from the newsletter. You will still receive essential account emails.",
        );
      },
    });
  }

  let content: ReactNode;
  if (newsletter.status === "subscribed") {
    content = (
      <>
        <p className="text-sm">{`Subscribed${formatSince(newsletter.since)}.`}</p>
        <Button className="mt-3" variant="secondary" disabled={busy} onClick={onUnsubscribe}>
          Unsubscribe
        </Button>
      </>
    );
  } else if (newsletter.status === "pending") {
    content = (
      <>
        <p className="text-sm">
          Waiting for your confirmation. Open the link we emailed you to start your subscription.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button disabled={busy} onClick={requestSubscription}>
            Resend confirmation email
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onUnsubscribe}>
            Cancel request
          </Button>
        </div>
      </>
    );
  } else {
    content = (
      <form noValidate onSubmit={onSubscribe}>
        <p className="text-sm">Not subscribed.</p>
        <div className="mt-3 flex items-start gap-2">
          <input
            id={ids.consent}
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={consentGiven}
            onChange={(event) => {
              setConsentGiven(event.target.checked);
              if (event.target.checked) {
                setConsentMissing(false);
              }
            }}
            aria-invalid={consentMissing}
            aria-describedby={consentMissing ? `${ids.description} ${ids.error}` : ids.description}
          />
          <label htmlFor={ids.consent} className="text-sm">
            I want to receive the newsletter by email: occasional news about new lessons and
            features.
          </label>
        </div>
        <p id={ids.description} className="mt-2 text-xs text-primary/70 dark:text-surface/70">
          We will first email you a link to confirm. You can unsubscribe at any time here or with
          the link in every newsletter.
        </p>
        {consentMissing ? (
          <p id={ids.error} role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            Please tick the box to confirm you want the newsletter.
          </p>
        ) : null}
        <Button type="submit" className="mt-3" disabled={busy}>
          Subscribe
        </Button>
      </form>
    );
  }

  return (
    <fieldset className="mt-4 rounded-md border border-primary/20 p-4">
      <legend className="px-1 font-medium">Newsletter</legend>
      {content}
      {notice ? (
        <p role="status" className="mt-3 text-sm">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {messageOf(error)}
        </p>
      ) : null}
    </fieldset>
  );
}
