import { zodResolver } from "@hookform/resolvers/zod";
import { Button, TextField } from "@verbysia/ui";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate, type Location } from "react-router";

import { Link } from "../components/app-link.js";
import { loginFormSchema, type LoginForm } from "../components/auth-form-schemas.js";
import { useLogin } from "../hooks/use-login.js";
import { m } from "../i18n/index.js";
import { ApiError, errorMessage } from "../services/api-error.js";

const t = m.auth;

interface LocationState {
  from?: Location;
}

function loginError(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return t.login.invalidCredentials;
  if (error instanceof ApiError && error.status === 403) return t.login.unverified;
  return errorMessage(error);
}

export function LoginPage() {
  const loginMutation = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginFormSchema) });

  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname ?? "/dashboard";

  return (
    <section aria-labelledby="login-heading" className="mx-auto max-w-md py-12">
      <h1 id="login-heading" className="text-2xl font-semibold">
        {t.login.title}
      </h1>

      <form
        className="mt-6 flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          void handleSubmit((data) => {
            loginMutation.mutate(data, {
              onSuccess: () => {
                void navigate(redirectTo, { replace: true });
              },
            });
          })(event);
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...registerField("password")}
        />

        {loginMutation.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {loginError(loginMutation.error)}
          </p>
        ) : null}

        <Button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? t.login.pending : t.login.submit}
        </Button>
      </form>

      <p className="mt-4 flex flex-col gap-1 text-sm">
        <Link to="/register" className="text-accent hover:underline">
          {t.login.noAccount}
        </Link>
        <Link to="/forgot-password" className="text-accent hover:underline">
          {t.login.forgot}
        </Link>
      </p>
    </section>
  );
}
