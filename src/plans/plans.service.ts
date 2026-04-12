import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface Plan {
  day: string;
  doctor_ids: number[];
}

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getPlan(day: string): Promise<Plan> {
    const { data, error } = await this.supabase
      .getClient()
      .from('plans')
      .select('*')
      .eq('day', day)
      .maybeSingle();

    if (error) {
      this.logger.error(`getPlan(${day}) failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch plan');
    }

    // Return empty plan if none saved yet
    return data ?? { day, doctor_ids: [] };
  }

  async getAllPlans(): Promise<Plan[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('plans')
      .select('*');

    if (error) {
      this.logger.error(`getAllPlans failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch plans');
    }

    // Fill missing days with empty plans
    const saved = data as Plan[];
    return VALID_DAYS.map((day) => saved.find((p) => p.day === day) ?? { day, doctor_ids: [] });
  }

  async setPlan(day: string, doctorIds: number[]): Promise<Plan> {
    const { data, error } = await this.supabase
      .getClient()
      .from('plans')
      .upsert({ day, doctor_ids: doctorIds }, { onConflict: 'day' })
      .select()
      .single();

    if (error) {
      this.logger.error(`setPlan(${day}) failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to save plan');
    }

    return data as Plan;
  }
}
