import { zodResolver } from "@hookform/resolvers/zod";
import { Button, TextField } from "@verbysia/ui";
import { useForm } from "react-hook-form";

import { Link } from "../components/app-link.js";
import { registerFormSchema, type RegisterForm } from "../components/auth-form-schemas.js";
import { useRegister } from "../hooks/use-register.js";
import { m } from "../i18n/index.js";
import { ApiError, errorMessage } from "../services/api-error.js";

const t = m.auth;

function registerError(error: unknown): string {
  return error instanceof ApiError && error.status === 409
    ? t.register.emailTaken
    : errorMessage(error);
}

export function RegisterPage() {
  const registerMutation = useRegister();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerFormSchema) });

  if (registerMutation.isSuccess) {
    return (
      <section aria-labelledby="register-heading" className="mx-auto max-w-md py-12">
        <h1 id="register-heading" className="text-2xl font-semibold">
          {t.register.successTitle}
        </h1>
        <p className="mt-4">{t.register.successBody}</p>
        <Link to="/login" className="mt-6 inline-block text-sm text-accent hover:underline">
          {t.backToLogin}
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="register-heading" className="mx-auto max-w-md py-12">
      <h1 id="register-heading" className="text-2xl font-semibold">
        {t.register.title}
      </h1>
      <p className="mt-2 text-sm text-primary/70 dark:text-surface/70">{t.register.lead}</p>

      <form
        className="mt-6 flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          void handleSubmit((data) => registerMutation.mutate(data))(event);
        }}
      >
        <TextField
          label={t.email}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...registerField("email")}
        />
        <TextField
          label={t.password}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...registerField("password")}
        />

        {registerMutation.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {registerError(registerMutation.error)}
          </p>
        ) : null}

        <Button type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? t.register.pending : t.register.submit}
        </Button>
      </form>

      <p className="mt-4 text-sm">
        {t.register.privacyBefore}
        <Link to="/privacy" className="text-accent hover:underline">
          {t.register.privacyLink}
        </Link>
        {t.register.privacyAfter}
      </p>

      <p className="mt-4 text-sm">
        {t.register.haveAccount}{" "}
        <Link to="/login" className="text-accent hover:underline">
          {t.register.loginLink}
        </Link>
      </p>
    </section>
  );
}
