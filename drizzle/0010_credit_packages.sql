CREATE TABLE IF NOT EXISTS "credit_package" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"credits" integer NOT NULL,
	"priceAmount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"badgeText" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_package_credits_positive" CHECK ("credits" > 0),
	CONSTRAINT "credit_package_price_positive" CHECK ("priceAmount" > 0)
);

INSERT INTO "credit_package" ("id", "name", "credits", "priceAmount", "currency", "badgeText")
VALUES
	('credits-100', '100 Credits', 100, 500, 'usd', NULL),
	('credits-250', '250 Credits', 250, 1000, 'usd', 'Best value'),
	('credits-600', '600 Credits', 600, 2000, 'usd', 'Most popular')
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"credits" = EXCLUDED."credits",
	"priceAmount" = EXCLUDED."priceAmount",
	"currency" = EXCLUDED."currency",
	"badgeText" = EXCLUDED."badgeText",
	"isActive" = true,
	"updatedAt" = now();
