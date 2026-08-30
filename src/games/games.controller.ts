import { Controller, Get, Param } from '@nestjs/common';
import { GamesService } from './games.service.js';
import { GameSummary } from './dto/game-summary.dto.js';

/**
 * Public, unauthenticated reads of the game registry.
 *
 * No guard on either route, and that is the requirement rather than an
 * omission: story #22 states that auth must never hard-gate gameplay, so
 * these must answer 200 to a visitor with no session. Anything that adds
 * a guard here breaks the site's central promise.
 */
@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  findAll(): Promise<GameSummary[]> {
    return this.games.findAllPublished();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string): Promise<GameSummary> {
    return this.games.findPublishedBySlug(slug);
  }
}
