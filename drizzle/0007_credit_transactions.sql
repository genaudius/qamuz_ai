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
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "credit_txn_user_idx" ON "credit_transactions" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX "credit_txn_ref_idx" ON "credit_transactions" USING btree ("referenceId");
--> statement-breakpoint
CREATE INDEX "credit_txn_status_idx" ON "credit_transactions" USING btree ("status");