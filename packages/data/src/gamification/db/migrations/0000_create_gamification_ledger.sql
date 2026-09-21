CREATE TABLE "point_transactions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "point_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"source_id" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "point_transactions_reward_identity" UNIQUE("user_id","reason","source_id"),
	CONSTRAINT "point_transactions_reason_valid" CHECK ("point_transactions"."reason" IN ('exercise-completed', 'lesson-completed', 'achievement-unlocked')),
	CONSTRAINT "point_transactions_source_id_valid" CHECK (char_length("point_transactions"."source_id") <= 64 AND "point_transactions"."source_id" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
	CONSTRAINT "point_transactions_amount_valid" CHECK ("point_transactions"."amount" >= 1 AND "point_transactions"."amount" <= 10000)
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"user_id" uuid NOT NULL,
	"achievement_key" text NOT NULL,
	"unlocked_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_achievements_pk" PRIMARY KEY("user_id","achievement_key"),
	CONSTRAINT "user_achievements_key_valid" CHECK (char_length("user_achievements"."achievement_key") <= 64 AND "user_achievements"."achievement_key" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "point_transactions_user_id_idx" ON "point_transactions" USING btree ("user_id","id");