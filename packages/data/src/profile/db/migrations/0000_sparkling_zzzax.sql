CREATE TABLE "student_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"nickname" text,
	"avatar_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_first_name_valid" CHECK ("student_profiles"."first_name" IS NULL OR (char_length("student_profiles"."first_name") BETWEEN 1 AND 100 AND "student_profiles"."first_name" = btrim("student_profiles"."first_name"))),
	CONSTRAINT "student_profiles_last_name_valid" CHECK ("student_profiles"."last_name" IS NULL OR (char_length("student_profiles"."last_name") BETWEEN 1 AND 100 AND "student_profiles"."last_name" = btrim("student_profiles"."last_name"))),
	CONSTRAINT "student_profiles_nickname_valid" CHECK ("student_profiles"."nickname" IS NULL OR (char_length("student_profiles"."nickname") BETWEEN 2 AND 30 AND "student_profiles"."nickname" = btrim("student_profiles"."nickname")))
);
--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;