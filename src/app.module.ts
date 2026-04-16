import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { DoctorsModule } from './doctors/doctors.module';
import { VisitsModule } from './visits/visits.module';
import { StatsModule } from './stats/stats.module';
import { PlansModule } from './plans/plans.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SupabaseModule,
    AuthModule,       // registers the global AuthGuard
    DoctorsModule,
    VisitsModule,
    StatsModule,
    PlansModule,
  ],
})
export class AppModule {}
