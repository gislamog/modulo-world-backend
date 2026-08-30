import type { Game, InputRequirement } from '@prisma/client';

/**
 * A game as the public API describes it.
 *
 * Deliberately not the Prisma row. The anti-cheat columns
 * (maxPossibleScore, minDurationMs) are the thresholds a cheater would
 * need in order to submit a plausible score, so they never leave the
 * server. Mapping explicitly means a column added to the table later is
 * private until someone chooses to expose it, rather than public the
 * moment it is created.
 */
export interface GameSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  inputRequirement: InputRequirement;
}

export function toGameSummary(game: Game): GameSummary {
  return {
    id: game.id,
    slug: game.slug,
    title: game.title,
    description: game.description,
    inputRequirement: game.inputRequirement,
  };
}
