CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"source" text NOT NULL,
	"source_id" text,
	"note" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "licences_kind_valid" CHECK ("licences"."kind" IN ('FREE', 'CHALLENGE_7D', 'COURSE_A1', 'COURSE_A2', 'COURSE_B1', 'COURSE_B2', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY')),
	CONSTRAINT "licences_source_valid" CHECK ("licences"."source" IN ('purchase', 'subscription', 'admin')),
	CONSTRAINT "licences_period_valid" CHECK ("licences"."ends_at" IS NULL OR "licences"."ends_at" > "licences"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payment_events_pk" PRIMARY KEY("provider","event_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"licence_kind" text NOT NULL,
	"billing" text NOT NULL,
	"status" text NOT NULL,
	"name_pl" text NOT NULL,
	"description_pl" text NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"access_days" integer,
	"provider_price_id" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "products_id_valid" CHECK ("products"."id" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
	CONSTRAINT "products_licence_kind_valid" CHECK ("products"."licence_kind" IN ('FREE', 'CHALLENGE_7D', 'COURSE_A1', 'COURSE_A2', 'COURSE_B1', 'COURSE_B2', 'PREMIUM_MONTHLY', 'PREMIUM_YEARLY')),
	CONSTRAINT "products_billing_valid" CHECK ("products"."billing" IN ('one_off', 'monthly', 'yearly')),
	CONSTRAINT "products_status_valid" CHECK ("products"."status" IN ('draft', 'active', 'archived')),
	CONSTRAINT "products_price_non_negative" CHECK ("products"."price_minor" >= 0),
	CONSTRAINT "products_currency_valid" CHECK ("products"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "products_access_days_positive" CHECK ("products"."access_days" IS NULL OR "products"."access_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"status" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"created_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	CONSTRAINT "purchases_status_valid" CHECK ("purchases"."status" IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
	CONSTRAINT "purchases_amount_non_negative" CHECK ("purchases"."amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "subscriptions_status_valid" CHECK ("subscriptions"."status" IN ('active', 'past_due', 'cancelled', 'expired'))
);
--> statement-breakpoint
ALTER TABLE "licences" ADD CONSTRAINT "licences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "licences_user_idx" ON "licences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_provider_ref_unique" ON "purchases" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE INDEX "purchases_user_idx" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_ref_unique" ON "subscriptions" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");