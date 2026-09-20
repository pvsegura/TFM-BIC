export { createLanguageId, isValidLanguageId, type LanguageId } from "./language/language-id.js";
export { InvalidLanguageIdError } from "./language/invalid-language-id.error.js";

// Languages & Content (M5) — see docs/architecture/content-architecture.md.
export {
  isValidLocaleForLanguage,
  isValidTextDirection,
  TEXT_DIRECTIONS,
  type Language,
  type TextDirection,
} from "./language/language.js";
export {
  CEFR_LEVELS,
  createLevelId,
  getLevel,
  isValidLevelId,
  LEVEL_IDS,
  type Level,
  type LevelId,
} from "./language/level-id.js";
export {
  isLevelSelectable,
  isValidLevelStatus,
  LEVEL_STATUSES,
  type LanguageLevel,
  type LevelStatus,
} from "./language/language-level.js";
export { InvalidLevelIdError } from "./language/errors/invalid-level-id.error.js";
export { LanguageNotFoundError } from "./language/errors/language-not-found.error.js";
export { LevelNotAvailableError } from "./language/errors/level-not-available.error.js";
export { CONTENT_TYPES, isValidContentType, type ContentType } from "./content/content-type.js";
export {
  CONTENT_STATUSES,
  isPublished,
  isValidContentStatus,
  type ContentStatus,
} from "./content/content-status.js";
export {
  contentIdBelongsToLanguage,
  createContentId,
  isValidContentId,
  type ContentId,
} from "./content/content-id.js";
export { compareContentItems, sortContentItems } from "./content/content-ordering.js";
export type {
  ContentBlock,
  ContentBlockType,
  ContentItem,
  DialogueBlock,
  DialogueLine,
  ExampleBlock,
  ExplanationBlock,
} from "./content/content-item.js";
export {
  validateContentCatalog,
  type CatalogIssue,
  type ContentCatalog,
} from "./content/content-catalog.js";
export { InvalidContentIdError } from "./content/errors/invalid-content-id.error.js";
export { ContentNotFoundError } from "./content/errors/content-not-found.error.js";

// Identity & Authentication (M3) — see docs/architecture/domain-model.md.
export { createEmail, isValidEmail, normalizeEmail } from "./identity/email.js";
export {
  createPassword,
  isValidPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "./identity/password.js";
export { isValidRole, ROLES, type Role } from "./identity/role.js";
export { requireRole } from "./identity/authorization.js";
export { toSafeUser, type SafeUser, type User } from "./identity/user.js";
export { isSessionExpired, type Session } from "./identity/session.js";
export { isTokenUsable, type SecurityToken } from "./identity/security-token.js";
export type { EmailVerificationToken } from "./identity/email-verification-token.js";
export type { PasswordResetToken } from "./identity/password-reset-token.js";
export { InvalidEmailError } from "./identity/errors/invalid-email.error.js";
export { WeakPasswordError } from "./identity/errors/weak-password.error.js";
export { ForbiddenError } from "./identity/errors/forbidden.error.js";
export { InvalidCredentialsError } from "./identity/errors/invalid-credentials.error.js";
export { DuplicateEmailError } from "./identity/errors/duplicate-email.error.js";
export { InvalidTokenError } from "./identity/errors/invalid-token.error.js";
export { TokenExpiredError } from "./identity/errors/token-expired.error.js";
export { TokenAlreadyUsedError } from "./identity/errors/token-already-used.error.js";

// Media (M4) — the static avatar catalog.
export {
  AVATAR_CATALOG,
  AVATAR_IDS,
  isValidAvatarId,
  type AvatarDefinition,
  type AvatarId,
} from "./media/avatar-catalog.js";

// Student Profile (M4) — see docs/architecture/domain-model.md.
export type { StudentProfile } from "./profile/student-profile.js";
export {
  createProfileName,
  isValidProfileName,
  MAX_PROFILE_NAME_LENGTH,
  normalizeProfileName,
} from "./profile/profile-name.js";
export {
  createNickname,
  isValidNickname,
  MAX_NICKNAME_LENGTH,
  MIN_NICKNAME_LENGTH,
  normalizeNickname,
} from "./profile/nickname.js";
export { createAvatarId } from "./profile/avatar-selection.js";
export { InvalidProfileNameError } from "./profile/errors/invalid-profile-name.error.js";
export { InvalidNicknameError } from "./profile/errors/invalid-nickname.error.js";
export { InvalidAvatarIdError } from "./profile/errors/invalid-avatar-id.error.js";
