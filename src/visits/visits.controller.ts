import { Controller, Patch, Post, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { VisitsService } from './visits.service';

@Controller('doctors')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Patch(':id/visit')
  recordVisit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { month: string; visitNumber: 1 | 2; date: string },
  ) {
    return this.visitsService.recordVisit(id, body.month, body.visitNumber, body.date);
  }

  @Post(':id/visit-today')
  visitToday(@Param('id', ParseIntPipe) id: number) {
    return this.visitsService.visitToday(id);
  }

  @Delete(':id/visit-clear')
  clearVisit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { field: string },
  ) {
    return this.visitsService.clearVisit(id, body.field);
  }
}
