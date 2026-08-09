CREATE TABLE "caliber_families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"brand" text DEFAULT 'Omega' NOT NULL,
	"description" text,
	"years_active" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "caliber_families_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "caliber_lubrication_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caliber_id" uuid NOT NULL,
	"lubricant_id" uuid,
	"location" text NOT NULL,
	"quantity" text,
	"notes" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caliber_relations" (
	"caliber_id" uuid NOT NULL,
	"related_caliber_id" uuid NOT NULL,
	"relation" text DEFAULT 'famille' NOT NULL,
	CONSTRAINT "caliber_relations_caliber_id_related_caliber_id_pk" PRIMARY KEY("caliber_id","related_caliber_id")
);
--> statement-breakpoint
CREATE TABLE "caliber_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caliber_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"unit" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caliber_tools" (
	"caliber_id" uuid NOT NULL,
	"tool_id" uuid NOT NULL,
	"notes" text,
	CONSTRAINT "caliber_tools_caliber_id_tool_id_pk" PRIMARY KEY("caliber_id","tool_id")
);
--> statement-breakpoint
CREATE TABLE "calibers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"brand" text DEFAULT 'Omega' NOT NULL,
	"reference" text NOT NULL,
	"name" text NOT NULL,
	"family_id" uuid,
	"introduced_year" integer,
	"discontinued_year" integer,
	"summary" text,
	"presentation" text,
	"history" text,
	"architecture" text,
	"data_status" text DEFAULT 'draft' NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calibers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"guide_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caliber_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"short_description" text,
	"price_cents" integer DEFAULT 1490 NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"r2_file_key" text,
	"cover_image_url" text,
	"preview_file_key" text,
	"page_count" integer,
	"included_in_subscription" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"stripe_price_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guides_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lubricants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"brand" text NOT NULL,
	"reference" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"viscosity" text,
	"usage" text,
	"color_hex" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lubricants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_id" uuid,
	"caliber_id" uuid,
	"source" text NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"image_url" text,
	"price_cents" integer,
	"currency" text,
	"condition" text,
	"seller_name" text,
	"location" text,
	"raw" jsonb,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"day" date NOT NULL,
	"path" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "page_views_day_path_pk" PRIMARY KEY("day","path")
);
--> statement-breakpoint
CREATE TABLE "part_calibers" (
	"part_id" uuid NOT NULL,
	"caliber_id" uuid NOT NULL,
	"position_number" text,
	"notes" text,
	CONSTRAINT "part_calibers_part_id_caliber_id_pk" PRIMARY KEY("part_id","caliber_id")
);
--> statement-breakpoint
CREATE TABLE "part_compatibilities" (
	"part_id" uuid NOT NULL,
	"compatible_part_id" uuid NOT NULL,
	"level" text DEFAULT 'identique' NOT NULL,
	"notes" text,
	CONSTRAINT "part_compatibilities_part_id_compatible_part_id_pk" PRIMARY KEY("part_id","compatible_part_id")
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"category" text,
	"description" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"guide_id" uuid NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"status" text NOT NULL,
	"plan" text DEFAULT 'atelier' NOT NULL,
	"interval" text DEFAULT 'month' NOT NULL,
	"price_cents" integer,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tools_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" text,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id")
);
--> statement-breakpoint
CREATE TABLE "visit_fingerprints" (
	"day" date NOT NULL,
	"fingerprint" text NOT NULL,
	CONSTRAINT "visit_fingerprints_day_fingerprint_pk" PRIMARY KEY("day","fingerprint")
);
--> statement-breakpoint
ALTER TABLE "caliber_lubrication_points" ADD CONSTRAINT "caliber_lubrication_points_caliber_id_calibers_id_fk" FOREIGN KEY ("caliber_id") REFERENCES "public"."calibers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caliber_lubrication_points" ADD CONSTRAINT "caliber_lubrication_points_lubricant_id_lubricants_id_fk" FOREIGN KEY ("lubricant_id") REFERENCES "public"."lubricants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caliber_relations" ADD CONSTRAINT "caliber_relations_caliber_id_calibers_id_fk" FOREIGN KEY ("caliber_id") REFERENCES "public"."calibers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caliber_relations" ADD CONSTRAINT "caliber_relations_related_caliber_id_calibers_id_fk" FOREIGN KEY ("related_caliber_id") REFERENCES "public"."calibers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caliber_specs" ADD CONSTRAINT "caliber_specs_caliber_id_calibers_id_fk" FOREIGN KEY ("caliber_id") REFERENCES "public"."calibers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caliber_tools" ADD CONSTRAINT "caliber_tools_caliber_id_calibers_id_fk" FOREIGN KEY ("caliber_id") REFERENCES "public"."calibers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caliber_tools" ADD CONSTRAINT "caliber_tools_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibers" ADD CONSTRAINT "calibers_family_id_caliber_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."caliber_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_unlocks" ADD CONSTRAINT "guide_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_unlocks" ADD CONSTRAINT "guide_unlocks_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_caliber_id_calibers_id_fk" FOREIGN KEY ("caliber_id") REFERENCES "public"."calibers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_caliber_id_calibers_id_fk" FOREIGN KEY ("caliber_id") REFERENCES "public"."calibers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_calibers" ADD CONSTRAINT "part_calibers_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_calibers" ADD CONSTRAINT "part_calibers_caliber_id_calibers_id_fk" FOREIGN KEY ("caliber_id") REFERENCES "public"."calibers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_compatibilities" ADD CONSTRAINT "part_compatibilities_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_compatibilities" ADD CONSTRAINT "part_compatibilities_compatible_part_id_parts_id_fk" FOREIGN KEY ("compatible_part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "caliber_specs_caliber_key" ON "caliber_specs" USING btree ("caliber_id","key");--> statement-breakpoint
CREATE INDEX "calibers_reference_idx" ON "calibers" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_entity_key" ON "favorites" USING btree ("user_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_unlocks_user_guide_key" ON "guide_unlocks" USING btree ("user_id","guide_id");--> statement-breakpoint
CREATE INDEX "guide_unlocks_period_idx" ON "guide_unlocks" USING btree ("user_id","period_start");--> statement-breakpoint
CREATE INDEX "guides_caliber_idx" ON "guides" USING btree ("caliber_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lubricants_brand_reference_key" ON "lubricants" USING btree ("brand","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_listings_source_external_key" ON "marketplace_listings" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "marketplace_listings_part_idx" ON "marketplace_listings" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "page_views_day_idx" ON "page_views" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "parts_reference_key" ON "parts" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_user_guide_key" ON "purchases" USING btree ("user_id","guide_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_checkout_session_key" ON "purchases" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");