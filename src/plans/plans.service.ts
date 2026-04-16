import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Plan {
  day: string;          // stores a YYYY-MM-DD date string
  doctor_ids: number[];
}

/** Returns the Mon–Sat date strings for the ISO week that contains dateStr */
function getWeekDates(dateStr: string): string[] {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sun
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 6 }, (_, i) => {
    const dt = new Date(monday);
    dt.setUTCDate(monday.getUTCDate() + i);
    return dt.toISOString().split('T')[0];
  });
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getPlan(date: string): Promise<Plan> {
    const { data, error } = await this.supabase
      .getClient()
      .from('plans')
      .select('*')
      .eq('day', date)
      .maybeSingle();

    if (error) {
      this.logger.error(`getPlan(${date}) failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch plan');
    }

    return data ?? { day: date, doctor_ids: [] };
  }

  async getAllPlans(): Promise<Plan[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('plans')
      .select('*')
      .order('day', { ascending: true });

    if (error) {
      this.logger.error(`getAllPlans failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch plans');
    }

    return data as Plan[];
  }

  /** Returns plans for the Mon–Sat week containing date (defaults to today). */
  async getWeekPlans(date?: string): Promise<Plan[]> {
    const dates = getWeekDates(date ?? todayStr());

    const { data, error } = await this.supabase
      .getClient()
      .from('plans')
      .select('*')
      .in('day', dates);

    if (error) {
      this.logger.error(`getWeekPlans failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch week plans');
    }

    const saved = data as Plan[];
    // Return one entry per day — empty plan for days with no saved plan
    return dates.map((d) => saved.find((p) => p.day === d) ?? { day: d, doctor_ids: [] });
  }

  async setPlan(date: string, doctorIds: number[]): Promise<Plan> {
    const client = this.supabase.getClient();

    // Try upsert first. If the table is missing a UNIQUE constraint on `day`
    // (onConflict target), fall back to a manual select + insert/update.
    const { data, error } = await client
      .from('plans')
      .upsert({ day: date, doctor_ids: doctorIds }, { onConflict: 'day' })
      .select()
      .single();

    if (!error) return data as Plan;

    this.logger.error(
      `setPlan(${date}) upsert failed: ${error.message}` +
        (error.details ? ` | details: ${error.details}` : '') +
        (error.hint ? ` | hint: ${error.hint}` : '') +
        (error.code ? ` | code: ${error.code}` : ''),
    );

    // 42P10 = "no unique or exclusion constraint matching the ON CONFLICT specification"
    if (error.code === '42P10') {
      this.logger.warn(
        `plans.day has no UNIQUE constraint — falling back to select+upsert. ` +
          `Run: ALTER TABLE plans ADD CONSTRAINT plans_day_key UNIQUE (day);`,
      );

      const { data: existing, error: selErr } = await client
        .from('plans')
        .select('day')
        .eq('day', date)
        .maybeSingle();

      if (selErr) {
        this.logger.error(`setPlan fallback select failed: ${selErr.message}`);
        throw new InternalServerErrorException(
          `Failed to save plan: ${selErr.message}`,
        );
      }

      if (existing) {
        const { data: upd, error: updErr } = await client
          .from('plans')
          .update({ doctor_ids: doctorIds })
          .eq('day', date)
          .select()
          .single();
        if (updErr) {
          this.logger.error(`setPlan fallback update failed: ${updErr.message}`);
          throw new InternalServerErrorException(
            `Failed to save plan: ${updErr.message}`,
          );
        }
        return upd as Plan;
      }

      const { data: ins, error: insErr } = await client
        .from('plans')
        .insert({ day: date, doctor_ids: doctorIds })
        .select()
        .single();
      if (insErr) {
        this.logger.error(`setPlan fallback insert failed: ${insErr.message}`);
        throw new InternalServerErrorException(
          `Failed to save plan: ${insErr.message}`,
        );
      }
      return ins as Plan;
    }

    throw new InternalServerErrorException(
      `Failed to save plan: ${error.message}`,
    );
  }
}
