CREATE TABLE "submission_headquarters" (
	"submission_id" integer PRIMARY KEY NOT NULL,
	"country_code" text NOT NULL,
	"region_id" integer,
	"city_id" integer,
	"street" text,
	"postal_code" text,
	"latitude" double precision,
	"longitude" double precision,
	"address_source" text,
	"geo_source" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission_headquarters" ADD CONSTRAINT "submission_headquarters_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_headquarters" ADD CONSTRAINT "submission_headquarters_country_code_shop_geo_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."shop_geo_countries"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_headquarters" ADD CONSTRAINT "submission_headquarters_region_id_shop_geo_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."shop_geo_regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_headquarters" ADD CONSTRAINT "submission_headquarters_city_id_shop_geo_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."shop_geo_cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_submission_headquarters_country" ON "submission_headquarters" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idx_submission_headquarters_region" ON "submission_headquarters" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "idx_submission_headquarters_city" ON "submission_headquarters" USING btree ("city_id");
