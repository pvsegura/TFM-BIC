/**
 * Where each bounded context records its applied migrations — `migrations.table` in its own
 * drizzle.<context>.config.ts (a test keeps the two in step). Identity uses drizzle's default
 * table (drizzle.config.ts), so it is not listed. Each context has its own table because drizzle
 * applies only migrations newer than the latest one recorded: sharing a table could silently skip
 * one.
 */
export const MIGRATION_TABLES = {
  profile: "__drizzle_migrations_profile",
  lessons: "__drizzle_migrations_lessons",
  exercises: "__drizzle_migrations_exercises",
  gamification: "__drizzle_migrations_gamification",
  vocabulary: "__drizzle_migrations_vocabulary",
  phonetics: "__drizzle_migrations_phonetics",
  video: "__drizzle_migrations_video",
  teaching: "__drizzle_migrations_teaching",
  newsletter: "__drizzle_migrations_newsletter",
} as const;

/** A context with its own migration set, migrated after Identity. */
export type MigratedContext = keyof typeof MIGRATION_TABLES;
