import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Proves the nginx -> Nest path end to end. Story #10 extends this with a
  // real database query and a 503 when Postgres is unreachable; that needs
  // Prisma, which arrives in story #7.
  @Get('health')
  getHealth(): { status: string; uptime: number } {
    return { status: 'ok', uptime: Math.floor(process.uptime()) };
  }
}
