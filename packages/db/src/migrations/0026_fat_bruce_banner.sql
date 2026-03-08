CREATE TABLE "issue_agent_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "backend_type" text DEFAULT 'paperclip' NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "external_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "issue_agent_comments" ADD CONSTRAINT "issue_agent_comments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_agent_comments_issue_idx" ON "issue_agent_comments" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_agent_comments_agent_idx" ON "issue_agent_comments" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "issue_agent_comments_issue_agent_idx" ON "issue_agent_comments" USING btree ("issue_id","agent_name");