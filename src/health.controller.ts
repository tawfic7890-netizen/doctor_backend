import { Controller, Get, Logger, OnModuleInit } from '@nestjs/common';
import { Public } from './auth/auth.guard';

@Controller()
export class HealthController implements OnModuleInit {
  private readonly logger = new Logger(HealthController.name);

  @Get('health')
  @Public()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  onModuleInit() {
    // Self-ping every 4 minutes to prevent Render free tier from sleeping
    const url = process.env.RENDER_EXTERNAL_URL || process.env.SELF_PING_URL;
    if (!url) {
      this.logger.warn('No RENDER_EXTERNAL_URL or SELF_PING_URL set — self-ping disabled');
      return;
    }
    const pingUrl = `${url}/health`;
    const interval = 4 * 60 * 1000; // 4 minutes

    setInterval(async () => {
      try {
        const res = await fetch(pingUrl, { signal: AbortSignal.timeout(10000) });
        this.logger.log(`Self-ping → ${res.status}`);
      } catch {
        this.logger.warn(`Self-ping failed for ${pingUrl}`);
      }
    }, interval);

    this.logger.log(`Self-ping enabled: ${pingUrl} every 4 min`);
  }
}
