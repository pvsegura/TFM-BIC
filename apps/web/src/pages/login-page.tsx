import { zodResolver } from "@hookform/resolvers/zod";
import { loginRequestSchema, type LoginRequest } from "@tfm-bic/contracts";
import { Button, TextField } from "@tfm-bic/ui";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, type Location } from "react-router";

import { useLogin } from "../hooks/use-login.js";
import { ApiError } from "../services/api-error.js";

interface LocationState {
  from?: Location;
}

export function LoginPage() {
  const loginMutation = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({ resolver: zodResolver(loginRequestSchema) });

  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname ?? "/dashboard";

  return (
    <section aria-labelledby="login-heading" className="mx-auto max-w-md py-12">
      <h1 id="login-heading" className="text-2xl font-semibold">
        Log in
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
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...registerField("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...registerField("password")}
        />

        {loginMutation.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {loginMutation.error instanceof ApiError
              ? loginMutation.error.message
              : "Something went wrong. Please try again."}
          </p>
        ) : null}

        <Button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-4 flex flex-col gap-1 text-sm">
        <Link to="/register" className="text-accent hover:underline">
          Don&apos;t have an account? Register
        </Link>
        <Link to="/forgot-password" className="text-accent hover:underline">
          Forgot your password?
        </Link>
      </p>
    </section>
  );
}
