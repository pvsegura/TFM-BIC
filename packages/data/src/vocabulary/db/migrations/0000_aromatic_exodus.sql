CREATE TABLE "user_vocabulary" (
	"user_id" uuid NOT NULL,
	"vocabulary_item_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"learned_at" timestamp with time zone,
	CONSTRAINT "user_vocabulary_pk" PRIMARY KEY("user_id","vocabulary_item_id"),
	CONSTRAINT "user_vocabulary_status_valid" CHECK ("user_vocabulary"."status" IN ('saved', 'learning', 'learned')),
	CONSTRAINT "user_vocabulary_learned_consistent" CHECK (("user_vocabulary"."status" = 'learned') = ("user_vocabulary"."learned_at" IS NOT NULL)),
	CONSTRAINT "user_vocabulary_item_id_valid" CHECK (char_length("user_vocabulary"."vocabulary_item_id") <= 64 AND "user_vocabulary"."vocabulary_item_id" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "user_vocabulary" ADD CONSTRAINT "user_vocabulary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;