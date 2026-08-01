CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"action" text NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"details" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "professionalRole" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "portfolioUrl" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_log" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_log" USING btree ("action");