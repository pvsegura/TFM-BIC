import { sql } from "drizzle-orm";

import type { GamificationTestDbHandle } from "../../gamification/db/test-support/create-test-db.js";

/**
 * Test-only: one row in every user-owned table for `userId`, with fixed, recognisable values —
 * the fixture the erasure and export tests share. Raw inserts, so the tests do not depend on
 * each context's repository behaviour.
 */
export async function seedEveryUserTable(
  handle: GamificationTestDbHandle,
  userId: string,
  options: { teacherId?: string; tag?: string } = {},
): Promise<void> {
  const tag = options.tag ?? "a";
  const run = (query: ReturnType<typeof sql>) => handle.rawExecute(query);
  await run(sql`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (${userId}::uuid, ${`session-hash-${tag}`}, '2099-01-01T00:00:00Z')`);
  await run(sql`
    INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}::uuid, ${`verify-hash-${tag}`}, '2099-01-01T00:00:00Z')`);
  await run(sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}::uuid, ${`reset-hash-${tag}`}, '2099-01-01T00:00:00Z')`);
  await run(sql`
    INSERT INTO student_profiles (user_id, first_name, last_name, nickname)
    VALUES (${userId}::uuid, ${`First-${tag}`}, ${`Last-${tag}`}, ${`nick-${tag}`})`);
  await run(sql`
    INSERT INTO lesson_progress (user_id, lesson_id, status, started_at, completed_at, updated_at)
    VALUES (${userId}::uuid, 'pl-greetings', 'completed', '2026-02-01T00:00:00Z',
            '2026-02-02T00:00:00Z', '2026-02-02T00:00:00Z')`);
  await run(sql`
    INSERT INTO exercise_attempts (user_id, exercise_id, submitted_answer, correct, answered_at)
    VALUES (${userId}::uuid, 'pl-greetings-choice', ${JSON.stringify(`answer-${tag}`)}::jsonb, true,
            '2026-02-01T01:00:00Z')`);
  await run(sql`
    INSERT INTO point_transactions (user_id, reason, source_id, amount, created_at)
    VALUES (${userId}::uuid, 'exercise-completed', 'pl-greetings-choice', 10, '2026-02-01T01:00:00Z')`);
  await run(sql`
    INSERT INTO user_achievements (user_id, achievement_key, unlocked_at)
    VALUES (${userId}::uuid, 'first-lesson', '2026-02-02T00:00:00Z')`);
  await run(sql`
    INSERT INTO user_vocabulary (user_id, vocabulary_item_id, status, created_at, updated_at, learned_at)
    VALUES (${userId}::uuid, 'pl-vocab-dom', 'learned', '2026-02-03T00:00:00Z',
            '2026-02-04T00:00:00Z', '2026-02-04T00:00:00Z')`);
  await run(sql`
    INSERT INTO user_phonetic_progress (user_id, phonetic_representation_id, status, first_viewed_at, last_viewed_at)
    VALUES (${userId}::uuid, 'pl-ipa-onasal', 'viewed', '2026-02-05T00:00:00Z', '2026-02-06T00:00:00Z')`);
  await run(sql`
    INSERT INTO video_generation_jobs (user_id, video_definition_id, status, provider_job_reference,
                                       media_reference, created_at, updated_at, completed_at)
    VALUES (${userId}::uuid, 'pl-a1-nasal-vowels-demo', 'completed', ${`provider-ref-${tag}`},
            ${`/srv/media/output-${tag}.mp4`}, '2026-02-07T00:00:00Z', '2026-02-07T00:01:00Z',
            '2026-02-07T00:01:00Z')`);
  await run(sql`
    INSERT INTO newsletter_subscriptions (user_id, status, unsubscribe_key, consent_version,
                                          consent_source, requested_at, confirmed_at, updated_at)
    VALUES (${userId}::uuid, 'subscribed', ${`unsubscribe-key-${tag}`}, 'newsletter-consent-v1',
            'settings', '2026-03-01T00:00:00Z', '2026-03-01T01:00:00Z', '2026-03-01T01:00:00Z')`);
  if (options.teacherId !== undefined) {
    await run(sql`
      INSERT INTO teacher_students (teacher_id, student_id, linked_at)
      VALUES (${options.teacherId}::uuid, ${userId}::uuid, '2026-01-05T00:00:00Z')`);
  }
}
