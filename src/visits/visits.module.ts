import { Module } from '@nestjs/common';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [DoctorsModule],
  controllers: [VisitsController],
  providers: [VisitsService],
})
export class VisitsModule {}
