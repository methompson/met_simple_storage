import 'dotenv/config';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const envPort = parseInt(process.env.PORT, 10);

  const port = Number.isNaN(envPort) ? 8000 : envPort;

  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(cookieParser());
  await app.listen(port);

  console.log(`Listening on port ${port}`);
}

bootstrap();
