import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { VisitsService } from './visits.service';
import { Public } from '../auth/auth.guard';

@ApiTags('visits')
@Controller('visits')
export class VisitsExportController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get('export')
  @Public()
  @ApiOperation({ summary: 'Export visits as CSV. Priority: date > month > all.' })
  @ApiQuery({ name: 'date',  required: false, description: 'Single day (YYYY-MM-DD), e.g. 2026-04-13' })
  @ApiQuery({ name: 'month', required: false, description: 'Whole month (YYYY-MM), e.g. 2026-04' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportCsv(
    @Query('date')  date:  string | undefined,
    @Query('month') month: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.visitsService.exportCsv(month, date);
    const filename = date ? `visits-${date}.csv` : month ? `visits-${month}.csv` : 'visits-all.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
