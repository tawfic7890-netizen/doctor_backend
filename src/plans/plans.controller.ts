import {
  Controller, Get, Put,
  Param, Body, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { SetPlanDto } from './dto/set-plan.dto';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  private readonly logger = new Logger(PlansController.name);

  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all daily plans (mon–sat)' })
  getAllPlans() {
    return this.plansService.getAllPlans();
  }

  @Get(':day')
  @ApiOperation({ summary: 'Get the doctor list planned for a specific day' })
  @ApiParam({ name: 'day', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] })
  @ApiResponse({ status: 200, description: '{ day, doctor_ids }' })
  getPlan(@Param('day') day: string) {
    return this.plansService.getPlan(day.toLowerCase());
  }

  @Put(':day')
  @ApiOperation({ summary: 'Save the doctor list for a specific day (upsert)' })
  @ApiParam({ name: 'day', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] })
  @ApiResponse({ status: 200, description: 'Plan saved' })
  setPlan(
    @Param('day') day: string,
    @Body() dto: SetPlanDto,
  ) {
    this.logger.log(`Saving plan for ${day}: ${dto.doctorIds.length} doctors`);
    return this.plansService.setPlan(day.toLowerCase(), dto.doctorIds);
  }
}
