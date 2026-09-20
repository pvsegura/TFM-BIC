export { SystemClock } from "./clock/system-clock.js";

// Identity & Authentication (M3) — see docs/adr/adr-005/006/014.
export { createIdentityDb, type IdentityDb, type IdentityDbHandle } from "./identity/db/client.js";
export { Argon2PasswordHasher } from "./identity/argon2-password-hasher.js";
export { CryptoTokenGenerator } from "./identity/crypto-token-generator.js";
export { InMemoryEmailService, type SentEmail } from "./identity/in-memory-email.service.js";
export { DrizzleUserRepository } from "./identity/user.repository.js";
export { DrizzleSessionRepository } from "./identity/session.repository.js";
export { DrizzleEmailVerificationTokenRepository } from "./identity/email-verification-token.repository.js";
export { DrizzlePasswordResetTokenRepository } from "./identity/password-reset-token.repository.js";

// Student Profile (M4).
export { createProfileDb, type ProfileDb, type ProfileDbHandle } from "./profile/db/client.js";
export { DrizzleProfileRepository } from "./profile/profile.repository.js";
