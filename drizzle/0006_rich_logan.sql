CREATE TABLE "ai_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"payload" json NOT NULL,
	"priority" integer DEFAULT 10 NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"result" json,
	"errorMessage" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"transactionId" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"resourceType" text NOT NULL,
	"provider" text,
	"model" text,
	"status" text NOT NULL,
	"errorMessage" text,
	"referenceId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "creditsBalance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_jobs_status_priority_idx" ON "ai_jobs" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "ai_jobs_user_idx" ON "ai_jobs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "credit_txn_user_idx" ON "credit_transactions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "credit_txn_ref_idx" ON "credit_transactions" USING btree ("referenceId");--> statement-breakpoint
CREATE INDEX "credit_txn_status_idx" ON "credit_transactions" USING btree ("status");