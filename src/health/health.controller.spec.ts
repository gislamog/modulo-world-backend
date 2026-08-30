import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { HealthController } from './health.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Unit tests, so Prisma is a stub. The e2e suite covers the same
// controller against a real database.
describe('HealthController', () => {
  let controller: HealthController;
  let queryRaw: ReturnType<typeof vi.fn>;
  let res: Response;
  let status: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    queryRaw = vi.fn();
    status = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    res = { status } as unknown as Response;
  });

  describe('when the database answers', () => {
    beforeEach(() => {
      queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    });

    it('reports ok and the database up', async () => {
      const result = await controller.check(res);

      expect(result.status).toBe('ok');
      expect(result.database).toBe('up');
    });

    it('leaves the status code alone, so it stays 200', async () => {
      await controller.check(res);

      expect(status).not.toHaveBeenCalled();
    });

    it('runs a real query rather than only checking the process is alive', async () => {
      await controller.check(res);

      // The API can be running happily while Postgres is gone. A check
      // that never touches the database would call that healthy.
      expect(queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the database is unreachable', () => {
    beforeEach(() => {
      queryRaw.mockRejectedValue(new Error('connection refused'));
    });

    it('reports error and the database down', async () => {
      const result = await controller.check(res);

      expect(result.status).toBe('error');
      expect(result.database).toBe('down');
    });

    it('sets 503, so orchestration sees an unhealthy container', async () => {
      await controller.check(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('does not leak the connection error to the caller', async () => {
      const result = await controller.check(res);

      // The status code carries the failure. Health output is
      // unauthenticated, so it must not describe the internals.
      expect(JSON.stringify(result)).not.toContain('connection refused');
    });
  });

  describe('payload', () => {
    beforeEach(() => {
      queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    });

    it('reports uptime as a whole number of seconds', async () => {
      const result = await controller.check(res);

      expect(Number.isInteger(result.uptime)).toBe(true);
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('always carries a version string', async () => {
      const result = await controller.check(res);

      expect(typeof result.version).toBe('string');
      expect(result.version.length).toBeGreaterThan(0);
    });
  });
});
