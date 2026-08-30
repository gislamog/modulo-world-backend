import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Hits the health endpoint through the real Nest app and a real database,
// which is the point: the unit tests stub Prisma, so only this suite can
// catch a broken connection string or a missing migration.
describe('HealthController (e2e)', () => {
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

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 and reports the database up', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      database: 'up',
    });
  });

  it('reports uptime and a version', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(Number.isInteger(response.body.uptime)).toBe(true);
    expect(typeof response.body.version).toBe('string');
  });

  it('is served under the api prefix, not at the root', async () => {
    // Nginx routes /api/* to this service, so a health check that answered
    // at /health would be unreachable in production.
    await request(app.getHttpServer()).get('/health').expect(404);
  });

  it('runs against the migrated schema', async () => {
    // Proves the disposable database really was migrated. Without this a
    // suite could pass against an empty database and only fail later.
    const games = await prisma.game.findMany();

    expect(Array.isArray(games)).toBe(true);
  });
});
