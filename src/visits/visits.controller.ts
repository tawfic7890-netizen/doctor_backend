import {
  Controller, Post, Delete,
  Param, Body, ParseIntPipe,
  HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { VisitsService } from './visits.service';
import { RecordVisitDto } from './dto/record-visit.dto';

@ApiTags('visits')
@Controller('doctors')
export class VisitsController {
  private readonly logger = new Logger(VisitsController.name);

  constructor(private readonly visitsService: VisitsService) {}

  @Post(':id/visit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a visit for a doctor on a specific date' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Visit recorded' })
  recordVisit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordVisitDto,
  ) {
    this.logger.log(`Recording visit for doctor #${id} on ${dto.date}`);
    return this.visitsService.recordVisit(id, dto.date);
  }

  @Post(':id/visit-today')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Record today's date as a visit for a doctor" })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Visit recorded as today' })
  visitToday(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Marking today as visit for doctor #${id}`);
    return this.visitsService.visitToday(id);
  }

  @Delete(':id/visits/:visitId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specific visit record' })
  @ApiParam({ name: 'id', type: Number, description: 'Doctor ID' })
  @ApiParam({ name: 'visitId', type: Number, description: 'Visit ID to delete' })
  @ApiResponse({ status: 204, description: 'Visit deleted' })
  clearVisit(
    @Param('id', ParseIntPipe) _doctorId: number,
    @Param('visitId', ParseIntPipe) visitId: number,
  ) {
    this.logger.log(`Deleting visit #${visitId} for doctor #${_doctorId}`);
    return this.visitsService.clearVisit(visitId);
  }
}
