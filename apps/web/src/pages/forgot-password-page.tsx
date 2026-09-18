import { zodResolver } from "@hookform/resolvers/zod";
import { passwordResetRequestSchema, type PasswordResetRequest } from "@tfm-bic/contracts";
import { Button, TextField } from "@tfm-bic/ui";
import { useForm } from "react-hook-form";
import { Link } from "react-router";

import { useRequestPasswordReset } from "../hooks/use-request-password-reset.js";
import { ApiError } from "../services/api-error.js";

export function ForgotPasswordPage() {
  const requestReset = useRequestPasswordReset();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequest>({ resolver: zodResolver(passwordResetRequestSchema) });

  if (requestReset.isSuccess) {
    return (
      <section aria-labelledby="forgot-password-heading" className="mx-auto max-w-md py-12">
        <h1 id="forgot-password-heading" className="text-2xl font-semibold">
          Check your email
        </h1>
        <p className="mt-4">{requestReset.data.message}</p>
        <Link to="/login" className="mt-6 inline-block text-sm text-accent hover:underline">
          Back to log in
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="forgot-password-heading" className="mx-auto max-w-md py-12">
      <h1 id="forgot-password-heading" className="text-2xl font-semibold">
        Forgot your password?
      </h1>
      <p className="mt-2 text-sm text-primary/70 dark:text-surface/70">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <form
        className="mt-6 flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          void handleSubmit((data) => requestReset.mutate(data))(event);
        }}
      >
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...registerField("email")}
        />

        {requestReset.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {requestReset.error instanceof ApiError
              ? requestReset.error.message
              : "Something went wrong. Please try again."}
          </p>
        ) : null}

        <Button type="submit" disabled={requestReset.isPending}>
          {requestReset.isPending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <Link to="/login" className="mt-4 inline-block text-sm text-accent hover:underline">
        Back to log in
      </Link>
    </section>
  );
}
