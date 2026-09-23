CREATE TABLE "user_phonetic_progress" (
	"user_id" uuid NOT NULL,
	"phonetic_representation_id" text NOT NULL,
	"status" text NOT NULL,
	"first_viewed_at" timestamp with time zone NOT NULL,
	"last_viewed_at" timestamp with time zone NOT NULL,
	"practiced_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "user_phonetic_progress_pk" PRIMARY KEY("user_id","phonetic_representation_id"),
	CONSTRAINT "user_phonetic_progress_status_valid" CHECK ("user_phonetic_progress"."status" IN ('viewed', 'practiced', 'completed')),
	CONSTRAINT "user_phonetic_progress_completed_consistent" CHECK (("user_phonetic_progress"."status" = 'completed') = ("user_phonetic_progress"."completed_at" IS NOT NULL)),
	CONSTRAINT "user_phonetic_progress_representation_id_valid" CHECK (char_length("user_phonetic_progress"."phonetic_representation_id") <= 64 AND "user_phonetic_progress"."phonetic_representation_id" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "user_phonetic_progress" ADD CONSTRAINT "user_phonetic_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;