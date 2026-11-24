import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";

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
 * "Buy": signed-out visitors go to registration first; signed-in learners are sent to Stripe's
 * hosted checkout. Access is granted by the server when Stripe confirms the payment — never by
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
        disabled={disabled || checkout.isPending || checkout.isSuccess}
        className={className}
        onClick={() => {
          if (!user) {
            void navigate("/register", { state: { from: { pathname: "/cennik" } } });
            return;
          }
          checkout.mutate();
        }}
      >
        {checkout.isPending || checkout.isSuccess ? t.redirecting : label}
      </button>
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
