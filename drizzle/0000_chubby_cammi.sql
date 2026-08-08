CREATE SCHEMA "file_storage";
--> statement-breakpoint
CREATE TABLE "file_storage"."api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"api_key_hash" varchar(128) NOT NULL,
	"label" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_api_key_hash_unique" UNIQUE("api_key_hash")
);
--> statement-breakpoint
CREATE TABLE "file_storage"."files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"owner_key" varchar(255) NOT NULL,
	"filename" varchar(512) NOT NULL,
	"content_type" varchar(255),
	"size_bytes" integer NOT NULL,
	"source_url" text NOT NULL,
	"s3_key" text NOT NULL,
	"s3_bucket" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_storage"."workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_storage"."api_keys" ADD CONSTRAINT "api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "file_storage"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_storage"."files" ADD CONSTRAINT "files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "file_storage"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_storage_api_keys_workspace_id_idx" ON "file_storage"."api_keys" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "file_storage_files_workspace_owner_created_idx" ON "file_storage"."files" USING btree ("workspace_id","owner_key","created_at");--> statement-breakpoint
CREATE INDEX "file_storage_files_workspace_created_idx" ON "file_storage"."files" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "file_storage_workspaces_user_id_uidx" ON "file_storage"."workspaces" USING btree ("user_id");