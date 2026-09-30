ALTER TABLE "players" ADD COLUMN "google_id" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_google_id_key" UNIQUE("google_id");