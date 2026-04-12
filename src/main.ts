import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // ─── CORS ────────────────────────────────────────────────────────────────────
  // CORS_ORIGIN can be a comma-separated list for multiple allowed origins
  // e.g. CORS_ORIGIN=https://tawfic.vercel.app,http://localhost:3000
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // ─── Global validation pipe ───────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown properties
      forbidNonWhitelisted: false,
      transform: true,          // auto-transform query param strings → types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global exception filter ──────────────────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ─── Swagger / OpenAPI ────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tawfic Tracker API')
    .setDescription('Doctor visit tracker — North Lebanon')
    .setVersion('1.0')
    .addTag('doctors', 'Doctor CRUD operations')
    .addTag('visits', 'Visit recording')
    .addTag('stats', 'Dashboard statistics')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ─── Graceful shutdown ────────────────────────────────────────────────────────
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Tawfic Tracker API running on port ${port}`);
  logger.log(`Swagger docs → http://localhost:${port}/docs`);
}

bootstrap();
