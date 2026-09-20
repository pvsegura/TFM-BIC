export { healthResponseSchema, type HealthResponse } from "./health/health-response.schema.js";

// Identity & Authentication (M3).
export { registerRequestSchema, type RegisterRequest } from "./auth/register-request.schema.js";
export { loginRequestSchema, type LoginRequest } from "./auth/login-request.schema.js";
export { authUserResponseSchema, type AuthUserResponse } from "./auth/auth-user-response.schema.js";
export {
  verifyEmailRequestSchema,
  type VerifyEmailRequest,
} from "./auth/verify-email-request.schema.js";
export {
  resendVerificationRequestSchema,
  type ResendVerificationRequest,
} from "./auth/resend-verification-request.schema.js";
export {
  passwordResetRequestSchema,
  type PasswordResetRequest,
} from "./auth/password-reset-request.schema.js";
export {
  passwordResetConfirmSchema,
  type PasswordResetConfirm,
} from "./auth/password-reset-confirm.schema.js";
export { messageResponseSchema, type MessageResponse } from "./auth/message-response.schema.js";

// Student Profile (M4).
export { AVATAR_CATALOG, avatarIdSchema, type AvatarId } from "./profile/avatar-catalog.schema.js";
export {
  updateProfileRequestSchema,
  type UpdateProfileRequest,
} from "./profile/update-profile-request.schema.js";
export { profileResponseSchema, type ProfileResponse } from "./profile/profile-response.schema.js";
