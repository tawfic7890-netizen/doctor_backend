import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/auth.guard';

@Controller()
export class HealthController {
  @Get('health')
  @Public()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
