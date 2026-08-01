CREATE TABLE "betterAuthAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "better_auth_account_provider_account_unique" UNIQUE("accountId","providerId")
);
--> statement-breakpoint
CREATE TABLE "betterAuthSession" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "betterAuthSession_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "betterAuthVerification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "emailVerifiedBool" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "betterAuthAccount" ADD CONSTRAINT "betterAuthAccount_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "betterAuthSession" ADD CONSTRAINT "betterAuthSession_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "better_auth_account_user_idx" ON "betterAuthAccount" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "better_auth_session_user_idx" ON "betterAuthSession" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "better_auth_verification_identifier_idx" ON "betterAuthVerification" USING btree ("identifier");--> statement-breakpoint

-- Backfill email verified flag from existing Auth.js-compatible column.
UPDATE "user"
SET "emailVerifiedBool" = CASE
	WHEN "emailVerified" IS NULL THEN false
	ELSE true
END;
--> statement-breakpoint

-- Preserve OAuth account links for Better Auth.
INSERT INTO "betterAuthAccount" (
	"id",
	"accountId",
	"providerId",
	"userId",
	"accessToken",
	"refreshToken",
	"idToken",
	"accessTokenExpiresAt",
	"scope",
	"createdAt",
	"updatedAt"
)
SELECT
	'legacy-' || a."provider" || '-' || a."providerAccountId" AS "id",
	a."providerAccountId" AS "accountId",
	a."provider" AS "providerId",
	a."userId",
	a."access_token" AS "accessToken",
	a."refresh_token" AS "refreshToken",
	a."id_token" AS "idToken",
	CASE
		WHEN a."expires_at" IS NULL THEN NULL
		ELSE to_timestamp(a."expires_at")
	END AS "accessTokenExpiresAt",
	a."scope",
	now() AS "createdAt",
	now() AS "updatedAt"
FROM "account" a
ON CONFLICT ("accountId", "providerId") DO NOTHING;
--> statement-breakpoint

-- Backfill credential accounts from existing user.password hashes.
INSERT INTO "betterAuthAccount" (
	"id",
	"accountId",
	"providerId",
	"userId",
	"password",
	"createdAt",
	"updatedAt"
)
SELECT
	'credential-' || u."id" AS "id",
	u."id" AS "accountId",
	'credential' AS "providerId",
	u."id" AS "userId",
	u."password" AS "password",
	now() AS "createdAt",
	now() AS "updatedAt"
FROM "user" u
WHERE u."password" IS NOT NULL
ON CONFLICT ("accountId", "providerId") DO NOTHING;
--> statement-breakpoint

-- Keep social users verified after migration.
UPDATE "user" u
SET
	"emailVerifiedBool" = true,
	"emailVerified" = COALESCE(u."emailVerified", now())
WHERE EXISTS (
	SELECT 1
	FROM "account" a
	WHERE a."userId" = u."id"
	AND a."provider" <> 'credentials'
);
