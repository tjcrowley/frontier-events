CREATE TABLE "event_hosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"avatar_url" text,
	"password_hash" text,
	"auth_provider" text DEFAULT 'frontier' NOT NULL,
	"subscription_plan" text,
	"subscription_status" text,
	"communities" text[],
	"role" text DEFAULT 'member' NOT NULL,
	"newsletter_opt_in" boolean DEFAULT false NOT NULL,
	"newsletter_opt_in_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "wallet_address" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "host_user_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "floor_community_slug" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "room_booking_id" text;--> statement-breakpoint
ALTER TABLE "event_hosts" ADD CONSTRAINT "event_hosts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_hosts" ADD CONSTRAINT "event_hosts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
