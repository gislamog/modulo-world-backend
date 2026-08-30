-- Input requirement per game (#21).
--
-- Added while the table is still empty, so there is no backfill. The
-- column exists now because story #21 needs a game that cannot be played
-- on a phone to say so, and discovering that after games are registered
-- means a migration plus a per-game audit.

-- CreateEnum
CREATE TYPE "InputRequirement" AS ENUM ('TOUCH_OK', 'KEYBOARD_REQUIRED', 'MOUSE_REQUIRED');

-- AlterTable
--
-- Defaults to KEYBOARD_REQUIRED rather than TOUCH_OK: an unreviewed game
-- should not silently promise phone support it does not have.
ALTER TABLE "games" ADD COLUMN "input_requirement" "InputRequirement" NOT NULL DEFAULT 'KEYBOARD_REQUIRED';

-- CreateIndex
--
-- The homepage query: published games, newest first.
CREATE INDEX "games_is_published_created_at_idx" ON "games"("is_published", "created_at" DESC);
