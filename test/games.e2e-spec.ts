import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// The registry through the real Nest app and a real database. The unit
// tests stub Prisma, so only this suite proves the published/unpublished
// filtering actually holds in SQL.
describe('GamesController (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror the global prefix from src/main.ts so the test exercises the
    // path the application actually serves.
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Scores and progress reference games, so they go first.
    await prisma.score.deleteMany();
    await prisma.progress.deleteMany();
    await prisma.game.deleteMany();

    await prisma.game.createMany({
      data: [
        {
          slug: 'sierpinski',
          title: 'Sierpinski',
          description: 'Draw a triangle by chaos.',
          isPublished: true,
          inputRequirement: 'MOUSE_REQUIRED',
          maxPossibleScore: 5000,
          minDurationMs: 1000,
        },
        {
          slug: 'unreleased',
          title: 'Unreleased',
          description: 'Not finished yet.',
          isPublished: false,
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/games', () => {
    it('returns published games', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/games')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].slug).toBe('sierpinski');
    });

    it('omits unpublished games', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/games')
        .expect(200);

      const slugs = response.body.map((game: { slug: string }) => game.slug);
      expect(slugs).not.toContain('unreleased');
    });

    it('answers an anonymous request with 200, not 401', async () => {
      // Story #22: auth must never hard-gate the games. A guard added here
      // would break the site's central promise, so this asserts it.
      await request(app.getHttpServer()).get('/api/games').expect(200);
    });

    it('does not leak the anti-cheat thresholds', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/games')
        .expect(200);

      expect(response.body[0]).not.toHaveProperty('maxPossibleScore');
      expect(response.body[0]).not.toHaveProperty('minDurationMs');
    });

    it('returns an empty array when nothing is published', async () => {
      await prisma.game.updateMany({ data: { isPublished: false } });

      const response = await request(app.getHttpServer())
        .get('/api/games')
        .expect(200);

      // An empty registry is a normal state the homepage renders as an
      // empty state, not a 404.
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/games/:slug', () => {
    it('resolves a published game', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/games/sierpinski')
        .expect(200);

      expect(response.body).toMatchObject({
        slug: 'sierpinski',
        title: 'Sierpinski',
        inputRequirement: 'MOUSE_REQUIRED',
      });
    });

    it('404s an unpublished game for an anonymous visitor', async () => {
      await request(app.getHttpServer())
        .get('/api/games/unreleased')
        .expect(404);
    });

    it('404s a slug that does not exist', async () => {
      await request(app.getHttpServer())
        .get('/api/games/no-such-game')
        .expect(404);
    });

    it('answers identically for unpublished and nonexistent games', async () => {
      // Distinguishable responses would confirm which unreleased games are
      // on the way, which is exactly what the 404 is hiding.
      const unpublished = await request(app.getHttpServer()).get(
        '/api/games/unreleased',
      );
      const missing = await request(app.getHttpServer()).get(
        '/api/games/no-such-game',
      );

      expect(unpublished.status).toBe(missing.status);
      expect(unpublished.body.message).toBe(missing.body.message);
    });

    it('resolves any registered slug through one route', async () => {
      // The point of the registry (#19): a second game needs a row, not a
      // new route.
      await prisma.game.create({
        data: {
          slug: 'collatz',
          title: 'Collatz',
          isPublished: true,
          inputRequirement: 'TOUCH_OK',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/games/collatz')
        .expect(200);

      expect(response.body.slug).toBe('collatz');
    });
  });
});
