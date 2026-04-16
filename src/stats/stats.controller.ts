import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Aggregated stats across all doctors' })
  getStats() {
    return this.statsService.getStats();
  }

  @Get('history')
  @ApiOperation({ summary: 'Monthly visit history for the last N months' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to return (default 6)' })
  getHistory(@Query('months') months?: string) {
    return this.statsService.getHistory(months ? parseInt(months, 10) : 6);
  }
}
