import {
  Injectable, NotFoundException,
  InternalServerErrorException, Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class VisitsService {
  private readonly logger = new Logger(VisitsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async recordVisit(doctorId: number, date: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('visits')
      .insert({ doctor_id: doctorId, visited_at: date })
      .select()
      .single();

    if (error) {
      this.logger.error(`recordVisit #${doctorId} failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to record visit');
    }
    return data;
  }

  async visitToday(doctorId: number) {
    const today = new Date().toISOString().split('T')[0];
    return this.recordVisit(doctorId, today);
  }

  async clearVisit(visitId: number) {
    const { error } = await this.supabase
      .getClient()
      .from('visits')
      .delete()
      .eq('id', visitId);

    if (error) {
      this.logger.error(`clearVisit #${visitId} failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete visit');
    }
  }
}
