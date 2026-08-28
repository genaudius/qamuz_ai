-- usage_tracking ON CONFLICT (userId, month, year) requires this unique.
-- Present in schema.ts and 0000, missing on some live databases created via push.

DELETE FROM usage_tracking a
USING usage_tracking b
WHERE a."userId" = b."userId"
	AND a."month" = b."month"
	AND a."year" = b."year"
	AND a."id" < b."id";

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'user_month_year_unique'
	) THEN
		ALTER TABLE "usage_tracking"
			ADD CONSTRAINT "user_month_year_unique" UNIQUE ("userId", "month", "year");
	END IF;
END $$;
