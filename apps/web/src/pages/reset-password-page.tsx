import { zodResolver } from "@hookform/resolvers/zod";
import { Button, TextField } from "@verbysia/ui";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router";

import { Link } from "../components/app-link.js";
import { newPasswordFormSchema, type NewPasswordForm } from "../components/auth-form-schemas.js";
import { useConfirmPasswordReset } from "../hooks/use-confirm-password-reset.js";
import { m } from "../i18n/index.js";
import { ApiError, errorMessage } from "../services/api-error.js";

const t = m.auth;

function resetError(error: unknown): string {
  return error instanceof ApiError && error.status === 400
    ? t.reset.expiredLink
    : errorMessage(error);
}

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
          {t.reset.title}
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t.reset.invalidLink}
        </p>
      </section>
    );
  }

  if (confirmReset.isSuccess) {
    return (
      <section aria-labelledby="reset-password-heading" className="mx-auto max-w-md py-12">
        <h1 id="reset-password-heading" className="text-2xl font-semibold">
          {t.reset.title}
        </h1>
        <p className="mt-4">{t.reset.successBody}</p>
        <Link to="/login" className="mt-6 inline-block text-sm text-accent hover:underline">
          {t.login.title}
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="reset-password-heading" className="mx-auto max-w-md py-12">
      <h1 id="reset-password-heading" className="text-2xl font-semibold">
        {t.reset.title}
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
          label={t.newPassword}
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...registerField("newPassword")}
        />

        {confirmReset.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {resetError(confirmReset.error)}
          </p>
        ) : null}

        <Button type="submit" disabled={confirmReset.isPending}>
          {confirmReset.isPending ? t.reset.pending : t.reset.submit}
        </Button>
      </form>
    </section>
  );
}
