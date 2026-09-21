CREATE TABLE "lesson_progress" (
	"user_id" uuid NOT NULL,
	"lesson_id" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "lesson_progress_pk" PRIMARY KEY("user_id","lesson_id"),
	CONSTRAINT "lesson_progress_status_valid" CHECK ("lesson_progress"."status" IN ('in_progress', 'completed')),
	CONSTRAINT "lesson_progress_completion_consistent" CHECK (("lesson_progress"."status" = 'completed') = ("lesson_progress"."completed_at" IS NOT NULL)),
	CONSTRAINT "lesson_progress_lesson_id_valid" CHECK (char_length("lesson_progress"."lesson_id") <= 64 AND "lesson_progress"."lesson_id" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;