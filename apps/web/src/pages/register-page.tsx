import { zodResolver } from "@hookform/resolvers/zod";
import { registerRequestSchema, type RegisterRequest } from "@tfm-bic/contracts";
import { Button, TextField } from "@tfm-bic/ui";
import { useForm } from "react-hook-form";
import { Link } from "react-router";

import { useRegister } from "../hooks/use-register.js";
import { ApiError } from "../services/api-error.js";

export function RegisterPage() {
  const registerMutation = useRegister();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterRequest>({ resolver: zodResolver(registerRequestSchema) });

  if (registerMutation.isSuccess) {
    return (
      <section aria-labelledby="register-heading" className="mx-auto max-w-md py-12">
        <h1 id="register-heading" className="text-2xl font-semibold">
          Check your email
        </h1>
        <p className="mt-4">{registerMutation.data.message}</p>
        <Link to="/login" className="mt-6 inline-block text-sm text-accent hover:underline">
          Back to log in
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="register-heading" className="mx-auto max-w-md py-12">
      <h1 id="register-heading" className="text-2xl font-semibold">
        Create your account
      </h1>

      <form
        className="mt-6 flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          void handleSubmit((data) => registerMutation.mutate(data))(event);
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...registerField("password")}
        />

        {registerMutation.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {registerMutation.error instanceof ApiError
              ? registerMutation.error.message
              : "Something went wrong. Please try again."}
          </p>
        ) : null}

        <Button type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link to="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
