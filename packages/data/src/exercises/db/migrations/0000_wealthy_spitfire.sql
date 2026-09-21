CREATE TABLE "exercise_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exercise_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"submitted_answer" jsonb NOT NULL,
	"correct" boolean NOT NULL,
	"answered_at" timestamp with time zone NOT NULL,
	CONSTRAINT "exercise_attempts_exercise_id_valid" CHECK (char_length("exercise_attempts"."exercise_id") <= 64 AND "exercise_attempts"."exercise_id" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
	CONSTRAINT "exercise_attempts_answer_bounded" CHECK (octet_length("exercise_attempts"."submitted_answer"::text) <= 4096)
);
--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "exercise_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_attempts_user_exercise_answered_idx" ON "exercise_attempts" USING btree ("user_id","exercise_id","answered_at");