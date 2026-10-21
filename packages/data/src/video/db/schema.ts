/**
 * Video generation (M11) is retired: lesson videos are produced offline by the media pipeline
 * (M21, ADR-031) and served as published media, so there are no per-user generation jobs.
 *
 * This schema is intentionally empty. The migration set stays so that every existing database
 * runs the migration that drops `video_generation_jobs` (0001), in order, after the one that
 * created it (0000). Nothing in the application reads or writes this context any more.
 */
export {};
