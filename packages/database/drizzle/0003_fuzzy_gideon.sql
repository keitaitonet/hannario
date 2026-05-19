ALTER TABLE "users" ADD COLUMN "granted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "granted_by_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_granted_by_id_users_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;