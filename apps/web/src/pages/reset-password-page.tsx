import { zodResolver } from "@hookform/resolvers/zod";
import { passwordResetConfirmSchema } from "@tfm-bic/contracts";
import { Button, TextField } from "@tfm-bic/ui";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";

import { useConfirmPasswordReset } from "../hooks/use-confirm-password-reset.js";
import { ApiError } from "../services/api-error.js";

/** Only the field the user actually fills in — `token` comes from the URL,
 * not the form, but reuses the same password-policy rule as the shared
 * contract (single source of truth, see packages/contracts). */
const newPasswordFormSchema = z.object({
  newPassword: passwordResetConfirmSchema.shape.newPassword,
});
type NewPasswordForm = z.infer<typeof newPasswordFormSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const confirmReset = useConfirmPasswordReset();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordForm>({ resolver: zodResolver(newPasswordFormSchema) });

  if (!token) {
    return (
      <section aria-labelledby="reset-password-heading" className="mx-auto max-w-md py-12">
        <h1 id="reset-password-heading" className="text-2xl font-semibold">
          Reset your password
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          This password reset link is invalid.
        </p>
      </section>
    );
  }

  if (confirmReset.isSuccess) {
    return (
      <section aria-labelledby="reset-password-heading" className="mx-auto max-w-md py-12">
        <h1 id="reset-password-heading" className="text-2xl font-semibold">
          Reset your password
        </h1>
        <p className="mt-4">{confirmReset.data.message}</p>
        <Link to="/login" className="mt-6 inline-block text-sm text-accent hover:underline">
          Log in
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="reset-password-heading" className="mx-auto max-w-md py-12">
      <h1 id="reset-password-heading" className="text-2xl font-semibold">
        Reset your password
      </h1>

      <form
        className="mt-6 flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          void handleSubmit((data) =>
            confirmReset.mutate({ token, newPassword: data.newPassword }),
          )(event);
        }}
      >
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...registerField("newPassword")}
        />

        {confirmReset.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {confirmReset.error instanceof ApiError
              ? confirmReset.error.message
              : "Something went wrong. Please try again."}
          </p>
        ) : null}

        <Button type="submit" disabled={confirmReset.isPending}>
          {confirmReset.isPending ? "Resetting…" : "Reset password"}
        </Button>
      </form>
    </section>
  );
}
