import { z } from "zod";

import { m } from "../i18n/index.js";

/**
 * The auth forms' client-side validation, with Polish messages. The shared contract schemas carry
 * English messages for the API; these mirror their rules (the API validates again regardless).
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const email = z
  .string()
  .trim()
  .min(1, m.auth.required)
  .max(254, m.auth.invalidEmail)
  .regex(EMAIL, m.auth.invalidEmail);

const newPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, m.auth.passwordTooShort(MIN_PASSWORD_LENGTH))
  .max(MAX_PASSWORD_LENGTH, m.auth.passwordTooLong(MAX_PASSWORD_LENGTH));

export const loginFormSchema = z.object({
  email,
  password: z.string().min(1, m.auth.required).max(MAX_PASSWORD_LENGTH),
});
export const registerFormSchema = z.object({ email, password: newPassword });
export const forgotFormSchema = z.object({ email });
export const newPasswordFormSchema = z.object({ newPassword });

export type LoginForm = z.infer<typeof loginFormSchema>;
export type RegisterForm = z.infer<typeof registerFormSchema>;
export type ForgotForm = z.infer<typeof forgotFormSchema>;
export type NewPasswordForm = z.infer<typeof newPasswordFormSchema>;
