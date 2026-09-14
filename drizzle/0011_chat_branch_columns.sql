-- Fix: chat branch/project columns exist in schema.ts but were never
-- materialized in the DB, causing PostgresError 42703 (column "isBranch"
-- does not exist) -> HTTP 500 on GET /api/chats.
-- Idempotent so it is safe to re-run on any environment.

ALTER TABLE "chat" ADD COLUMN IF NOT EXISTS "isBranch" boolean NOT NULL DEFAULT false;
ALTER TABLE "chat" ADD COLUMN IF NOT EXISTS "branchAtIndex" integer;
ALTER TABLE "chat" ADD COLUMN IF NOT EXISTS "branchSourceChatId" text;
ALTER TABLE "chat" ADD COLUMN IF NOT EXISTS "projectId" text;

CREATE INDEX IF NOT EXISTS "chats_project_idx" ON "chat" ("projectId");
