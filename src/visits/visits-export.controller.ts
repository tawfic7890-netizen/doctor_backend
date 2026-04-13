import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { VisitsService } from './visits.service';

@ApiTags('visits')
@Controller('visits')
export class VisitsExportController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export visits as CSV' })
  @ApiQuery({ name: 'month', required: false, description: 'Filter by month (YYYY-MM), e.g. 2026-04' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportCsv(
    @Query('month') month: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.visitsService.exportCsv(month);
    const filename = month ? `visits-${month}.csv` : 'visits-all.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
