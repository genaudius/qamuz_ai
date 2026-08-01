ALTER TABLE "music" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "music" ADD COLUMN "isPublic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "music" ADD COLUMN "likesCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "music" ADD COLUMN "playsCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "music" ADD COLUMN "imageUrl" text;--> statement-breakpoint
ALTER TABLE "music" ADD COLUMN "videoUrl" text;--> statement-breakpoint
ALTER TABLE "music" ADD COLUMN "lyrics" text;