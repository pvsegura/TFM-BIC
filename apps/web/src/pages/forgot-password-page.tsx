import { zodResolver } from "@hookform/resolvers/zod";
import { Button, TextField } from "@verbysia/ui";
import { useForm } from "react-hook-form";

import { Link } from "../components/app-link.js";
import { forgotFormSchema, type ForgotForm } from "../components/auth-form-schemas.js";
import { useRequestPasswordReset } from "../hooks/use-request-password-reset.js";
import { m } from "../i18n/index.js";
import { errorMessage } from "../services/api-error.js";

const t = m.auth;

export function ForgotPasswordPage() {
  const requestReset = useRequestPasswordReset();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({ resolver: zodResolver(forgotFormSchema) });

  if (requestReset.isSuccess) {
    return (
      <section aria-labelledby="forgot-password-heading" className="mx-auto max-w-md py-12">
        <h1 id="forgot-password-heading" className="text-2xl font-semibold">
          {t.forgot.successTitle}
        </h1>
        <p className="mt-4">{t.forgot.successBody}</p>
        <Link to="/login" className="mt-6 inline-block text-sm text-accent hover:underline">
          {t.backToLogin}
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="forgot-password-heading" className="mx-auto max-w-md py-12">
      <h1 id="forgot-password-heading" className="text-2xl font-semibold">
        {t.forgot.title}
      </h1>
      <p className="mt-2 text-sm text-primary/70 dark:text-surface/70">{t.forgot.lead}</p>

      <form
        className="mt-6 flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          void handleSubmit((data) => requestReset.mutate(data))(event);
        }}
      >
        <TextField
          label={t.email}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...registerField("email")}
        />

        {requestReset.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {errorMessage(requestReset.error)}
          </p>
        ) : null}

        <Button type="submit" disabled={requestReset.isPending}>
          {requestReset.isPending ? t.forgot.pending : t.forgot.submit}
        </Button>
      </form>

      <Link to="/login" className="mt-4 inline-block text-sm text-accent hover:underline">
        {t.backToLogin}
      </Link>
    </section>
  );
}
