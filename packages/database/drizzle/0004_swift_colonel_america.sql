CREATE TABLE "discord_destinations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"channel_id" text NOT NULL,
	"thread_id" text,
	"channel_name" text,
	"thread_name" text,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_destinations_user_target_unique" UNIQUE NULLS NOT DISTINCT("user_id","channel_id","thread_id")
);
--> statement-breakpoint
ALTER TABLE "discord_outbox" ADD COLUMN "created_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "discord_destinations" ADD CONSTRAINT "discord_destinations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discord_destinations_user_recent_idx" ON "discord_destinations" USING btree ("user_id","last_used_at");--> statement-breakpoint
ALTER TABLE "discord_outbox" ADD CONSTRAINT "discord_outbox_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;