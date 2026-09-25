CREATE TABLE "video_generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_definition_id" text NOT NULL,
	"status" text NOT NULL,
	"provider_job_reference" text,
	"media_reference" text,
	"error_category" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "video_generation_jobs_status_valid" CHECK ("video_generation_jobs"."status" IN ('queued', 'processing', 'completed', 'failed')),
	CONSTRAINT "video_generation_jobs_completed_consistent" CHECK (("video_generation_jobs"."status" IN ('completed', 'failed')) = ("video_generation_jobs"."completed_at" IS NOT NULL)),
	CONSTRAINT "video_generation_jobs_definition_id_valid" CHECK (char_length("video_generation_jobs"."video_definition_id") <= 64 AND "video_generation_jobs"."video_definition_id" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "video_generation_jobs" ADD CONSTRAINT "video_generation_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;