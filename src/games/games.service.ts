import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GameSummary, toGameSummary } from './dto/game-summary.dto.js';

/**
 * The game registry (#19).
 *
 * Every read here filters on isPublished. Unpublished games are not merely
 * hidden from the homepage: they are absent from the public API entirely,
 * so an unreleased slug cannot be discovered by guessing it.
 */
@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublished(): Promise<GameSummary[]> {
    const games = await this.prisma.game.findMany({
      where: { isPublished: true },
      // Newest first. Matches the index added with the input_requirement
      // migration.
      orderBy: { createdAt: 'desc' },
    });

    return games.map(toGameSummary);
  }

  async findPublishedBySlug(slug: string): Promise<GameSummary> {
    const game = await this.prisma.game.findFirst({
      where: { slug, isPublished: true },
    });

    // 404 rather than 403 for an unpublished game, and the same message as
    // a slug that does not exist. A distinguishable response would confirm
    // which unreleased games are on the way.
    //
    // The message deliberately omits the slug. Interpolating it made the
    // two cases distinguishable by body even though both returned 404,
    // which is the leak this is meant to close.
    if (!game) {
      throw new NotFoundException('No published game with that slug.');
    }

    return toGameSummary(game);
  }
}
