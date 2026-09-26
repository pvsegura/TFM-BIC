CREATE TABLE "newsletter_subscriptions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"unsubscribe_key" text NOT NULL,
	"consent_version" text NOT NULL,
	"consent_source" text NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"confirmation_token_hash" text,
	"confirmation_expires_at" timestamp with time zone,
	"confirmation_sent_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "newsletter_subscriptions_status" CHECK ("newsletter_subscriptions"."status" IN ('pending', 'subscribed', 'unsubscribed')),
	CONSTRAINT "newsletter_subscriptions_consent_source" CHECK ("newsletter_subscriptions"."consent_source" IN ('settings')),
	CONSTRAINT "newsletter_subscriptions_subscribed_confirmed" CHECK ("newsletter_subscriptions"."status" <> 'subscribed' OR "newsletter_subscriptions"."confirmed_at" IS NOT NULL),
	CONSTRAINT "newsletter_subscriptions_unsubscribed_dated" CHECK ("newsletter_subscriptions"."status" <> 'unsubscribed' OR "newsletter_subscriptions"."unsubscribed_at" IS NOT NULL),
	CONSTRAINT "newsletter_subscriptions_token_has_expiry" CHECK (("newsletter_subscriptions"."confirmation_token_hash" IS NULL) = ("newsletter_subscriptions"."confirmation_expires_at" IS NULL)),
	CONSTRAINT "newsletter_subscriptions_token_only_pending" CHECK ("newsletter_subscriptions"."confirmation_token_hash" IS NULL OR "newsletter_subscriptions"."status" = 'pending')
);
--> statement-breakpoint
ALTER TABLE "newsletter_subscriptions" ADD CONSTRAINT "newsletter_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscriptions_unsubscribe_key_key" ON "newsletter_subscriptions" USING btree ("unsubscribe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscriptions_confirmation_token_hash_key" ON "newsletter_subscriptions" USING btree ("confirmation_token_hash");--> statement-breakpoint
CREATE INDEX "newsletter_subscriptions_subscribed_idx" ON "newsletter_subscriptions" USING btree ("user_id") WHERE "newsletter_subscriptions"."status" = 'subscribed';