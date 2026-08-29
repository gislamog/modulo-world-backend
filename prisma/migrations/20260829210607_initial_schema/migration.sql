-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_sub" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "max_possible_score" INTEGER,
    "min_duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "user_id" UUID,
    "guest_id" TEXT,
    "value" INTEGER NOT NULL,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "user_id" UUID,
    "guest_id" TEXT,
    "state" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_sub_key" ON "users"("auth_sub");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE INDEX "scores_game_id_value_created_at_idx" ON "scores"("game_id", "value" DESC, "created_at");

-- CreateIndex
CREATE INDEX "scores_user_id_idx" ON "scores"("user_id");

-- CreateIndex
CREATE INDEX "scores_guest_id_idx" ON "scores"("guest_id");

-- CreateIndex
CREATE INDEX "progress_user_id_idx" ON "progress"("user_id");

-- CreateIndex
CREATE INDEX "progress_guest_id_idx" ON "progress"("guest_id");

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ownership: exactly one of user_id / guest_id is set on every row.
-- Prisma's schema language cannot express CHECK constraints, so these are
-- written by hand. They are the reason guest play can be added later
-- without rewriting every score and progress query.
ALTER TABLE "scores" ADD CONSTRAINT "scores_one_owner"
  CHECK (("user_id" IS NULL) <> ("guest_id" IS NULL));

ALTER TABLE "progress" ADD CONSTRAINT "progress_one_owner"
  CHECK (("user_id" IS NULL) <> ("guest_id" IS NULL));

-- One progress row per player per game. Two partial indexes rather than one
-- composite unique, because a NULL owner column would otherwise make every
-- row distinct and the constraint would never fire.
CREATE UNIQUE INDEX "progress_user_game_unique"
  ON "progress"("user_id", "game_id") WHERE "user_id" IS NOT NULL;

CREATE UNIQUE INDEX "progress_guest_game_unique"
  ON "progress"("guest_id", "game_id") WHERE "guest_id" IS NOT NULL;
