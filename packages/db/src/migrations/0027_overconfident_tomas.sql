CREATE TABLE "task_backend_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" text NOT NULL,
	"plane_api_url" text,
	"plane_api_key_encrypted" text,
	"plane_workspace_slug" text,
	"plane_default_project_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_backend_config" ADD CONSTRAINT "task_backend_config_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_backend_config_company_idx" ON "task_backend_config" USING btree ("company_id");