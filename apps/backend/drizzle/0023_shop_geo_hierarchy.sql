CREATE TABLE "shop_geo_countries" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_geo_regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "shop_geo_regions_country_name_unique" UNIQUE("country_code","name")
);
--> statement-breakpoint
CREATE TABLE "shop_geo_cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" text NOT NULL,
	"region_id" integer,
	"name" text NOT NULL,
	CONSTRAINT "shop_geo_cities_country_region_name_unique" UNIQUE("country_code","region_id","name")
);
--> statement-breakpoint
CREATE TABLE "shop_headquarters" (
	"shop_id" integer PRIMARY KEY NOT NULL,
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
ALTER TABLE "shop_geo_regions" ADD CONSTRAINT "shop_geo_regions_country_code_shop_geo_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."shop_geo_countries"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_geo_cities" ADD CONSTRAINT "shop_geo_cities_country_code_shop_geo_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."shop_geo_countries"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_geo_cities" ADD CONSTRAINT "shop_geo_cities_region_id_shop_geo_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."shop_geo_regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_headquarters" ADD CONSTRAINT "shop_headquarters_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_headquarters" ADD CONSTRAINT "shop_headquarters_country_code_shop_geo_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."shop_geo_countries"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_headquarters" ADD CONSTRAINT "shop_headquarters_region_id_shop_geo_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."shop_geo_regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_headquarters" ADD CONSTRAINT "shop_headquarters_city_id_shop_geo_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."shop_geo_cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_shop_geo_regions_country" ON "shop_geo_regions" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idx_shop_geo_cities_country" ON "shop_geo_cities" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idx_shop_geo_cities_region" ON "shop_geo_cities" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "idx_shop_headquarters_country" ON "shop_headquarters" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idx_shop_headquarters_region" ON "shop_headquarters" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "idx_shop_headquarters_city" ON "shop_headquarters" USING btree ("city_id");
