import { Controller, Get, Put, Param, Body, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { SetPlanDto } from './dto/set-plan.dto';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  private readonly logger = new Logger(PlansController.name);

  constructor(private readonly plansService: PlansService) {}

  /**
   * Returns plans for the Mon–Sat week containing the given date.
   * Defaults to the current week when no date is provided.
   */
  @Get('week')
  @ApiOperation({ summary: 'Get plans for the Mon–Sat week containing a date (defaults to today)' })
  @ApiQuery({ name: 'date', required: false, description: 'Any date in the desired week (YYYY-MM-DD). Defaults to today.' })
  getWeekPlans(@Query('date') date?: string) {
    return this.plansService.getWeekPlans(date);
  }

  @Get()
  @ApiOperation({ summary: 'Get all saved plans' })
  getAllPlans() {
    return this.plansService.getAllPlans();
  }

  @Get(':date')
  @ApiOperation({ summary: 'Get plan for a specific date (YYYY-MM-DD)' })
  @ApiParam({ name: 'date', example: '2026-04-16' })
  @ApiResponse({ status: 200, description: '{ day, doctor_ids }' })
  getPlan(@Param('date') date: string) {
    return this.plansService.getPlan(date);
  }

  @Put(':date')
  @ApiOperation({ summary: 'Set (upsert) the doctor list for a specific date' })
  @ApiParam({ name: 'date', example: '2026-04-16' })
  @ApiResponse({ status: 200, description: 'Plan saved' })
  setPlan(@Param('date') date: string, @Body() dto: SetPlanDto) {
    this.logger.log(`Saving plan for ${date}: ${dto.doctorIds.length} doctors`);
    return this.plansService.setPlan(date, dto.doctorIds);
  }
}
