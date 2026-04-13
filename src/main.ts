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
  // Use an Express-level middleware so OPTIONS preflight is handled before NestJS
  // routing (which would 404 it). CORS_ORIGIN is a comma-separated list of
  // allowed origins. If unset, all origins are reflected back (open during
  // initial deploy — lock it down once the frontend URL is known).
  const corsOriginEnv = process.env.CORS_ORIGIN;
  const allowedOrigins = corsOriginEnv
    ? corsOriginEnv.split(',').map((o) => o.trim()).filter(Boolean)
    : null; // null = allow all

  if (!allowedOrigins) {
    logger.warn('CORS_ORIGIN not set — all origins allowed. Set it in production!');
  } else {
    logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  }

  app.use((req: any, res: any, next: any) => {
    const origin: string | undefined = req.headers.origin;
    const isAllowed = !allowedOrigins || !origin || allowedOrigins.includes(origin);

    if (isAllowed) {
      // Reflect the actual origin (required when credentials: true — can't use *)
      res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
      res.setHeader('Vary', 'Origin');
    } else {
      logger.warn(`CORS blocked: ${origin}`);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Respond to preflight immediately — never let OPTIONS reach route handlers
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
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
