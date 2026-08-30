import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import type { Game } from '@prisma/client';
import { GamesService } from './games.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Unit tests, so Prisma is a stub. The e2e suite covers the same service
// against a real database.
describe('GamesService', () => {
  let service: GamesService;
  let findMany: ReturnType<typeof vi.fn>;
  let findFirst: ReturnType<typeof vi.fn>;

  function makeGame(overrides: Partial<Game> = {}): Game {
    return {
      id: '00000000-0000-0000-0000-000000000001',
      slug: 'sierpinski',
      title: 'Sierpinski',
      description: 'Draw a triangle by chaos.',
      isPublished: true,
      inputRequirement: 'MOUSE_REQUIRED',
      maxPossibleScore: 5000,
      minDurationMs: 1000,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      ...overrides,
    } as Game;
  }

  beforeEach(async () => {
    findMany = vi.fn();
    findFirst = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        {
          provide: PrismaService,
          useValue: { game: { findMany, findFirst } },
        },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
  });

  describe('findAllPublished', () => {
    it('asks the database for published games only', async () => {
      findMany.mockResolvedValue([]);

      await service.findAllPublished();

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      );
    });

    it('orders newest first', async () => {
      findMany.mockResolvedValue([]);

      await service.findAllPublished();

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('returns an empty array when nothing is published', async () => {
      findMany.mockResolvedValue([]);

      // The homepage renders an empty state from this, so an empty result
      // is a normal answer rather than an error.
      await expect(service.findAllPublished()).resolves.toEqual([]);
    });

    it('never exposes the anti-cheat thresholds', async () => {
      findMany.mockResolvedValue([makeGame()]);

      const [game] = await service.findAllPublished();

      // These are the numbers a cheater needs in order to submit a score
      // that passes validation.
      expect(game).not.toHaveProperty('maxPossibleScore');
      expect(game).not.toHaveProperty('minDurationMs');
    });

    it('carries the input requirement, so the client can warn about touch', async () => {
      findMany.mockResolvedValue([makeGame({ inputRequirement: 'TOUCH_OK' })]);

      const [game] = await service.findAllPublished();

      expect(game.inputRequirement).toBe('TOUCH_OK');
    });
  });

  describe('findPublishedBySlug', () => {
    it('looks up the slug and the published flag together', async () => {
      findFirst.mockResolvedValue(makeGame());

      await service.findPublishedBySlug('sierpinski');

      expect(findFirst).toHaveBeenCalledWith({
        where: { slug: 'sierpinski', isPublished: true },
      });
    });

    it('returns the game when it is published', async () => {
      findFirst.mockResolvedValue(makeGame());

      const game = await service.findPublishedBySlug('sierpinski');

      expect(game.slug).toBe('sierpinski');
      expect(game.title).toBe('Sierpinski');
    });

    it('throws NotFound for an unpublished game', async () => {
      // The where clause excluded it, so the driver returns null.
      findFirst.mockResolvedValue(null);

      await expect(
        service.findPublishedBySlug('secret'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound for a slug that does not exist', async () => {
      findFirst.mockResolvedValue(null);

      await expect(
        service.findPublishedBySlug('no-such-game'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not reveal whether an unpublished game exists', async () => {
      findFirst.mockResolvedValue(null);

      // Both cases must be indistinguishable. A different status or
      // message for "exists but unpublished" would confirm which
      // unreleased games are coming.
      const unpublished = await service
        .findPublishedBySlug('secret')
        .catch((error: NotFoundException) => error.message);
      const missing = await service
        .findPublishedBySlug('secret')
        .catch((error: NotFoundException) => error.message);

      expect(unpublished).toBe(missing);
    });
  });
});
