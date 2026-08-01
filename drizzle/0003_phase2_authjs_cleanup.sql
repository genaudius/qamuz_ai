-- Final legacy Auth.js backfill before cleanup.
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

-- Preserve pending email verification links when moving to Better Auth verification table.
INSERT INTO "betterAuthVerification" (
	"identifier",
	"value",
	"expiresAt"
)
SELECT
	v."identifier",
	v."token",
	v."expires"
FROM "verificationToken" v
ON CONFLICT DO NOTHING;
--> statement-breakpoint

ALTER TABLE "account" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "authenticator" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verificationToken" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "account" CASCADE;--> statement-breakpoint
DROP TABLE "authenticator" CASCADE;--> statement-breakpoint
DROP TABLE "session" CASCADE;--> statement-breakpoint
DROP TABLE "verificationToken" CASCADE;--> statement-breakpoint
