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
  lessonCompletionResponseSchema,
  lessonIdParamSchema,
  lessonListQuerySchema,
  lessonListResponseSchema,
  lessonProgressResponseSchema,
  lessonResponseSchema,
  lessonSummaryResponseSchema,
  type LessonCompletionResponse,
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
  gamificationQuerySchema,
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

// Vocabulary (M9): the on-disk category file format and the student-facing vocabulary API shapes.
export {
  vocabularyCategoryIdSchema,
  vocabularyItemIdSchema,
} from "./content/identifiers.schema.js";
export {
  MAX_VOCABULARY_ITEMS_PER_FILE,
  vocabularyFileSchema,
  type VocabularyFile,
} from "./vocabulary/vocabulary-file.schema.js";
export {
  MAX_VOCABULARY_PAGE_SIZE,
  MAX_VOCABULARY_SEARCH_LENGTH,
  userVocabularyQuerySchema,
  vocabularyActionRequestSchema,
  vocabularyCategoriesQuerySchema,
  vocabularyCategoriesResponseSchema,
  vocabularyCategoryResponseSchema,
  vocabularyIdParamSchema,
  vocabularyItemResponseSchema,
  vocabularyListQuerySchema,
  vocabularyListResponseSchema,
  vocabularyProgressResponseSchema,
  vocabularyStatusRequestSchema,
  vocabularyUserStateResponseSchema,
  type UserVocabularyQuery,
  type VocabularyCategoriesQuery,
  type VocabularyCategoriesResponse,
  type VocabularyCategoryResponse,
  type VocabularyItemResponse,
  type VocabularyListQuery,
  type VocabularyListResponse,
  type VocabularyProgressResponse,
  type VocabularyStatusRequest,
  type VocabularyUserStateResponse,
} from "./vocabulary/vocabulary-response.schema.js";

// Phonetics (M10): the on-disk topic file format and the student-facing phonetics API shapes.
// Independent of Vocabulary — no shared identifiers, no data reference between the two.
export {
  phoneticRepresentationIdSchema,
  phoneticTopicIdSchema,
} from "./content/identifiers.schema.js";
export {
  MAX_PHONETIC_REPRESENTATIONS_PER_FILE,
  phoneticFileSchema,
  type PhoneticFile,
} from "./phonetics/phonetic-file.schema.js";
export {
  MAX_PHONETIC_PAGE_SIZE,
  phoneticActionRequestSchema,
  phoneticIdParamSchema,
  phoneticListQuerySchema,
  phoneticListResponseSchema,
  phoneticRepresentationResponseSchema,
  phoneticTopicProgressResponseSchema,
  phoneticTopicResponseSchema,
  phoneticTopicsQuerySchema,
  phoneticTopicsResponseSchema,
  phoneticUserProgressResponseSchema,
  type PhoneticListQuery,
  type PhoneticListResponse,
  type PhoneticRepresentationResponse,
  type PhoneticTopicProgressResponse,
  type PhoneticTopicResponse,
  type PhoneticTopicsQuery,
  type PhoneticTopicsResponse,
  type PhoneticUserProgressResponse,
} from "./phonetics/phonetic-response.schema.js";

// Video (M11): the on-disk video definition file format and the video-generation API shapes.
// The render project a definition points to (`scriptPath`) is never parsed by any contract here —
// only the provider adapter (packages/data) reads it. See ADR-011/012.
export { videoDefinitionIdSchema } from "./content/identifiers.schema.js";
export { videoFileSchema, type VideoFile } from "./video/video-file.schema.js";
export {
  requestVideoGenerationRequestSchema,
  videoGenerationJobIdParamSchema,
  videoGenerationJobResponseSchema,
  type RequestVideoGenerationRequest,
  type VideoGenerationJobResponse,
} from "./video/video-generation.schema.js";

// Audio generation (M12, ADR-013): the client names content to hear, never the text itself.
export {
  AUDIO_RESPONSE_CONTENT_TYPES,
  audioGenerationRequestSchema,
  VOCABULARY_AUDIO_PART_VALUES,
  type AudioGenerationRequestBody,
} from "./audio/audio-generation.schema.js";
