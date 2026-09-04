CREATE TABLE IF NOT EXISTS "daw_session_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"userId" text NOT NULL,
	"revision" integer NOT NULL,
	"action" text DEFAULT 'autosave' NOT NULL,
	"snapshot" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daw_session_revision_session_fk" FOREIGN KEY ("sessionId") REFERENCES "daw_session"("id") ON DELETE CASCADE,
	CONSTRAINT "daw_session_revision_user_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
	CONSTRAINT "daw_session_revision_unique" UNIQUE("sessionId", "revision")
);
CREATE INDEX IF NOT EXISTS "daw_session_revision_user_idx" ON "daw_session_revision" ("userId", "createdAt");
