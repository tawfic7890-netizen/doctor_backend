import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [DoctorsModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
