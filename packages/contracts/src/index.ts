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

// Languages & Content (M5): the on-disk content file format and the public discovery API shapes.
export { languageIdSchema, levelIdSchema, contentIdSchema } from "./content/identifiers.schema.js";
export { contentBlockSchema, plainText } from "./content/content-block.schema.js";
export {
  CONTENT_SCHEMA_VERSION,
  languageFileSchema,
  type LanguageFile,
} from "./content/language-file.schema.js";
export { contentFileSchema, type ContentFile } from "./content/content-file.schema.js";
export {
  catalogErrorResponseSchema,
  contentIdParamSchema,
  contentListQuerySchema,
  contentListResponseSchema,
  contentResponseSchema,
  contentSummaryResponseSchema,
  languageCodeParamSchema,
  languageLevelsResponseSchema,
  languageResponseSchema,
  languagesResponseSchema,
  levelResponseSchema,
  type CatalogErrorResponse,
  type ContentListQuery,
  type ContentListResponse,
  type ContentResponse,
  type ContentSummaryResponse,
  type LanguageLevelsResponse,
  type LanguageResponse,
  type LanguagesResponse,
  type LevelResponse,
} from "./content/catalog-response.schema.js";

// Lessons (M6): student-facing lesson list, lesson and progress shapes.
export {
  lessonActionRequestSchema,
  lessonIdParamSchema,
  lessonListQuerySchema,
  lessonListResponseSchema,
  lessonProgressResponseSchema,
  lessonResponseSchema,
  lessonSummaryResponseSchema,
  type LessonListQuery,
  type LessonListResponse,
  type LessonProgressResponse,
  type LessonResponse,
  type LessonSummaryResponse,
} from "./lesson/lesson-response.schema.js";

// Student Profile (M4).
export { AVATAR_CATALOG, avatarIdSchema, type AvatarId } from "./profile/avatar-catalog.schema.js";
export {
  updateProfileRequestSchema,
  type UpdateProfileRequest,
} from "./profile/update-profile-request.schema.js";
export { profileResponseSchema, type ProfileResponse } from "./profile/profile-response.schema.js";
export {
  profileValidationErrorResponseSchema,
  type ProfileValidationErrorResponse,
} from "./profile/profile-validation-error.schema.js";

// Exercises (M7): the on-disk exercise file format and the student-facing exercise API shapes.
export { exerciseIdSchema } from "./content/identifiers.schema.js";
export { exerciseFileSchema, type ExerciseFile } from "./exercise/exercise-file.schema.js";
export {
  MAX_TEXT_ANSWER_LENGTH,
  exerciseAnswerRequestSchema,
  exerciseAnswerResponseSchema,
  exerciseIdParamSchema,
  exerciseListResponseSchema,
  exerciseResponseSchema,
  exerciseResultResponseSchema,
  exerciseSummaryResponseSchema,
  type ExerciseAnswerRequest,
  type ExerciseAnswerResponse,
  type ExerciseListResponse,
  type ExerciseResponse,
  type ExerciseResultResponse,
  type ExerciseSummaryResponse,
} from "./exercise/exercise-response.schema.js";

// Gamification (M8): read-only shapes for points, achievements and rewards. No request shape
// exists that would let a client award points.
export {
  achievementProgressResponseSchema,
  achievementResponseSchema,
  achievementsResponseSchema,
  gamificationSummaryResponseSchema,
  MAX_HISTORY_PAGE_SIZE,
  pointHistoryQuerySchema,
  pointHistoryResponseSchema,
  pointTransactionResponseSchema,
  rewardsResponseSchema,
  unlockedAchievementResponseSchema,
  type AchievementResponse,
  type AchievementsResponse,
  type GamificationSummaryResponse,
  type PointHistoryQuery,
  type PointHistoryResponse,
  type PointTransactionResponse,
  type RewardsResponse,
  type UnlockedAchievementResponse,
} from "./gamification/gamification-response.schema.js";
