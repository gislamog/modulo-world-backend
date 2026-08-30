import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { GamesModule } from './games/games.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, GamesModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
