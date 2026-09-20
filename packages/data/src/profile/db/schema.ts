import { MAX_NICKNAME_LENGTH, MAX_PROFILE_NAME_LENGTH, MIN_NICKNAME_LENGTH } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "../../identity/db/schema.js";

/**
 * A student's profile: personal display data only. Authentication identity
 * (email, role, password state) lives on `users` and is never copied here —
 * the profile is keyed by, and owned by, exactly one user (1:1).
 *
 * - `user_id` is both primary key and foreign key: at most one profile per
 *   user, enforced by the database, and a profile can only exist for a real
 *   user. `ON DELETE CASCADE` means deleting a user can never leave orphaned
 *   profile data (the full account-deletion workflow is a later milestone).
 * - The CHECK constraints mirror the domain validation rules as defense in
 *   depth against any writer that bypasses the application layer. They are
 *   never looser than the domain rules: `char_length` counts code points, so
 *   it accepts everything the (UTF-16 length based) domain check accepts.
 * - `avatar_id` is deliberately unconstrained text: which ids are valid is
 *   owned by the avatar catalog in code and validated server-side, so adding
 *   an avatar never needs a migration.
 */
export const studentProfiles = pgTable(
  "student_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: text("first_name"),
    lastName: text("last_name"),
    nickname: text("nickname"),
    avatarId: text("avatar_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "student_profiles_first_name_valid",
      sql`${table.firstName} IS NULL OR (char_length(${table.firstName}) BETWEEN 1 AND ${sql.raw(String(MAX_PROFILE_NAME_LENGTH))} AND ${table.firstName} = btrim(${table.firstName}))`,
    ),
    check(
      "student_profiles_last_name_valid",
      sql`${table.lastName} IS NULL OR (char_length(${table.lastName}) BETWEEN 1 AND ${sql.raw(String(MAX_PROFILE_NAME_LENGTH))} AND ${table.lastName} = btrim(${table.lastName}))`,
    ),
    check(
      "student_profiles_nickname_valid",
      sql`${table.nickname} IS NULL OR (char_length(${table.nickname}) BETWEEN ${sql.raw(String(MIN_NICKNAME_LENGTH))} AND ${sql.raw(String(MAX_NICKNAME_LENGTH))} AND ${table.nickname} = btrim(${table.nickname}))`,
    ),
  ],
);
