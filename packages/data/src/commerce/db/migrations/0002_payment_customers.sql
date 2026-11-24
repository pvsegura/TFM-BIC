CREATE TABLE "payment_customers" (
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"customer_ref" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payment_customers_pk" PRIMARY KEY("user_id","provider")
);
--> statement-breakpoint
ALTER TABLE "payment_customers" ADD CONSTRAINT "payment_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_customers_ref_unique" ON "payment_customers" USING btree ("provider","customer_ref");