import { VIDEO_GENERATION_STATUSES } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "../../identity/db/schema.js";

const STATUSES_SQL = VIDEO_GENERATION_STATUSES.map((status) => `'${status}'`).join(", ");

/** Mirrors the domain's slug pattern and length (`isValidVideoDefinitionId`). */
const VIDEO_DEFINITION_ID_PATTERN = "'^[a-z][a-z0-9]*(-[a-z0-9]+)*$'";

/**
 * One student's request to generate one video, and its lifecycle (`queued -> processing ->
 * completed|failed`) — M11's first mutable-status row in this codebase; every other bounded
 * context's per-student table is either append-only (exercise attempts, the points ledger) or an
 * upsert whose status only ever advances (phonetics/vocabulary progress). A row here is updated in
 * place as the domain's `startProcessing`/`completeGeneration`/`failGeneration` transition it.
 *
 * - `id` is server-generated (`defaultRandom()`), never client-supplied.
 * - `user_id` references `users` with `ON DELETE CASCADE`: a job can only exist for a real user and
 *   can never be orphaned. Every query is `WHERE id = ? AND user_id = ?`, which the primary key on
 *   `id` alone already serves for the lookup, with the CHECK-constrained `user_id` compared in the
 *   `WHERE` clause — so no secondary index exists, the same "no index until a query needs one"
 *   convention phonetics/vocabulary follow.
 * - `video_definition_id` is a content id held as validated text, *not* a foreign key: the
 *   referenced row is a file. The CHECK mirrors the domain's id pattern and length as defense in
 *   depth.
 * - `provider_job_reference`/`media_reference` are opaque strings from whichever
 *   `VideoGenerationService` handled the request — never a provider SDK type, and set only once
 *   `status` is `completed`. `error_category` is set only once `status` is `failed`.
 * - `completed_at` is set if and only if `status` is `completed` or `failed` (both are final).
 * - Every timestamp is written from the application's `Clock`, never the database's `now()`, so
 *   tests and production agree on what "now" is.
 */
export const videoGenerationJobs = pgTable(
  "video_generation_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoDefinitionId: text("video_definition_id").notNull(),
    status: text("status", { enum: VIDEO_GENERATION_STATUSES }).notNull(),
    providerJobReference: text("provider_job_reference"),
    mediaReference: text("media_reference"),
    errorCategory: text("error_category"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    check("video_generation_jobs_status_valid", sql`${table.status} IN (${sql.raw(STATUSES_SQL)})`),
    check(
      "video_generation_jobs_completed_consistent",
      sql`(${table.status} IN ('completed', 'failed')) = (${table.completedAt} IS NOT NULL)`,
    ),
    check(
      "video_generation_jobs_definition_id_valid",
      sql`char_length(${table.videoDefinitionId}) <= 64 AND ${table.videoDefinitionId} ~ ${sql.raw(VIDEO_DEFINITION_ID_PATTERN)}`,
    ),
  ],
);
