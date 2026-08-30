import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

interface HealthResponse {
  status: 'ok' | 'error';
  uptime: number;
  version: string;
  database: 'up' | 'down';
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Deliberately unauthenticated: container orchestration and deploy checks
  // call this before any credential exists.
  @Get()
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponse> {
    let database: 'up' | 'down' = 'down';

    try {
      // A real query, not a process-is-alive check. The API can be running
      // happily while Postgres is gone, and that is not healthy.
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      // Swallowed on purpose: the status code carries the failure, and a
      // health endpoint should not leak connection details to the caller.
    }

    if (database === 'down') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: database === 'up' ? 'ok' : 'error',
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version ?? '0.0.0',
      database,
    };
  }
}
