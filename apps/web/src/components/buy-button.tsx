import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useNavigate } from "react-router";

import { Link } from "./app-link.js";

import { useCurrentUser } from "../hooks/use-current-user.js";
import { m } from "../i18n/index.js";
import { ApiError, errorMessage } from "../services/api-error.js";
import { startCheckout } from "../services/commerce-api.js";

const t = m.marketing.payments;

function checkoutError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) return t.alreadyOwned;
  if (error instanceof ApiError && error.status === 503) return t.unavailable;
  return errorMessage(error);
}

/**
 * The two explicit consents Polish consumer law expects before digital content is delivered at
 * once: the terms of sale, and the immediate-delivery request with the acknowledged loss of the
 * withdrawal right. Neither box is pre-ticked; the server refuses a checkout without both.
 */
function ConsentPanel({
  pending,
  onContinue,
  onCancel,
}: {
  pending: boolean;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const [terms, setTerms] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const id = useId();
  return (
    <fieldset className="mt-3 rounded-md border border-primary/20 p-3 text-left text-sm dark:border-surface/20">
      <legend className="px-1 font-semibold">{t.consentTitle}</legend>
      <label htmlFor={`${id}-terms`} className="mt-1 flex gap-2">
        <input
          id={`${id}-terms`}
          type="checkbox"
          checked={terms}
          onChange={(event) => setTerms(event.target.checked)}
          className="mt-1"
        />
        <span>
          {t.consentTermsBefore}
          <Link to="/regulamin" className="text-accent underline">
            {t.consentTermsLink}
          </Link>
          {t.consentTermsAfter}
        </span>
      </label>
      <label htmlFor={`${id}-delivery`} className="mt-2 flex gap-2">
        <input
          id={`${id}-delivery`}
          type="checkbox"
          checked={delivery}
          onChange={(event) => setDelivery(event.target.checked)}
          className="mt-1"
        />
        <span>{t.consentDelivery}</span>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!terms || !delivery || pending}
          onClick={onContinue}
          className="rounded-md bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {pending ? t.redirecting : t.consentContinue}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 underline">
          {t.consentCancel}
        </button>
      </div>
    </fieldset>
  );
}

/**
 * "Buy": signed-out visitors go to registration first; signed-in learners confirm the two
 * consents and are then sent to Stripe's hosted checkout. Access is granted by the server when Stripe confirms the payment — never by
 * coming back to the success page.
 */
export function BuyButton({
  productId,
  label,
  disabled,
  className,
}: {
  productId: string;
  label: string;
  disabled: boolean;
  className: string;
}) {
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const checkout = useMutation({
    mutationFn: () => startCheckout(productId),
    onSuccess: (url) => {
      window.location.assign(url);
    },
  });

  return (
    <>
      <button
        type="button"
        disabled={disabled || confirming || checkout.isPending || checkout.isSuccess}
        className={className}
        onClick={() => {
          if (!user) {
            void navigate("/register", { state: { from: { pathname: "/cennik" } } });
            return;
          }
          setConfirming(true);
        }}
      >
        {checkout.isPending || checkout.isSuccess ? t.redirecting : label}
      </button>
      {confirming && user ? (
        <ConsentPanel
          pending={checkout.isPending || checkout.isSuccess}
          onContinue={() => checkout.mutate()}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
      {!user && !disabled ? (
        <p className="mt-2 text-xs text-primary/70 dark:text-surface/70">{t.loginFirst}</p>
      ) : null}
      {checkout.isError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {checkoutError(checkout.error)}
        </p>
      ) : null}
    </>
  );
}
