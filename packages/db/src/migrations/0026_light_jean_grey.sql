ALTER TABLE "issues" ADD COLUMN "backend_type" text DEFAULT 'paperclip' NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "external_metadata" jsonb;