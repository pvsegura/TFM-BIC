CREATE TABLE "memory_cards" (
	"user_id" uuid NOT NULL,
	"vocabulary_item_id" text NOT NULL,
	"repetitions" integer NOT NULL,
	"interval_days" integer NOT NULL,
	"ease" real NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"lapses" integer NOT NULL,
	"version" integer NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "memory_cards_pk" PRIMARY KEY("user_id","vocabulary_item_id"),
	CONSTRAINT "memory_cards_item_id_valid" CHECK (char_length("memory_cards"."vocabulary_item_id") <= 64 AND "memory_cards"."vocabulary_item_id" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
	CONSTRAINT "memory_cards_ease_min" CHECK ("memory_cards"."ease" >= 1.3),
	CONSTRAINT "memory_cards_counts_non_negative" CHECK ("memory_cards"."repetitions" >= 0 AND "memory_cards"."interval_days" >= 0 AND "memory_cards"."lapses" >= 0)
);
--> statement-breakpoint
CREATE TABLE "memory_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vocabulary_item_id" text NOT NULL,
	"client_review_id" uuid NOT NULL,
	"grade" text NOT NULL,
	"used_hint" integer NOT NULL,
	"previous_interval_days" integer NOT NULL,
	"interval_days" integer NOT NULL,
	"ease" real NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "memory_reviews_grade_valid" CHECK ("memory_reviews"."grade" IN ('again', 'hard', 'good', 'easy')),
	CONSTRAINT "memory_reviews_hint_flag" CHECK ("memory_reviews"."used_hint" IN (0, 1))
);
--> statement-breakpoint
ALTER TABLE "memory_cards" ADD CONSTRAINT "memory_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_reviews" ADD CONSTRAINT "memory_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memory_cards_due_idx" ON "memory_cards" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_reviews_client_unique" ON "memory_reviews" USING btree ("user_id","client_review_id");--> statement-breakpoint
CREATE INDEX "memory_reviews_user_time_idx" ON "memory_reviews" USING btree ("user_id","reviewed_at");