import { Module } from '@nestjs/common';
import { VisitsController } from './visits.controller';
import { VisitsExportController } from './visits-export.controller';
import { VisitsService } from './visits.service';

@Module({
  controllers: [VisitsController, VisitsExportController],
  providers: [VisitsService],
})
export class VisitsModule {}
