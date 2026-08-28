import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // The API is served under /api. Nginx routes /api to this service and /
  // to the frontend, so both share a single origin and auth cookies can
  // use SameSite=Strict. See the infrastructure repository.
  app.setGlobalPrefix('api');

  // Registered globally from the start: retrofitting DTO validation once
  // endpoints exist means auditing every one of them.
  app.useGlobalPipes(
    new ValidationPipe({
      // Strip properties that have no decorator in the DTO.
      whitelist: true,
      // Reject outright rather than silently dropping unknown properties.
      forbidNonWhitelisted: true,
      // Let DTOs declare types and receive parsed values.
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
