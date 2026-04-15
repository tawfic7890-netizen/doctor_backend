import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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
      this.logger.error(`recordVisit #${doctorId} on ${date} failed: ${error.message}`);
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

  /**
   * Build a CSV of visits joined with doctor info.
   * Priority: date (exact day) > month (YYYY-MM) > all.
   */
  async exportCsv(month?: string, date?: string): Promise<string> {
    let visitsQuery = this.supabase
      .getClient()
      .from('visits')
      .select('*')
      .order('visited_at', { ascending: false });

    if (date) {
      // Exact single day
      visitsQuery = visitsQuery.eq('visited_at', date);
    } else if (month) {
      const [y, m] = month.split('-').map(Number);
      const nextY = m === 12 ? y + 1 : y;
      const nextM = m === 12 ? 1 : m + 1;
      const nextMonth = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
      visitsQuery = visitsQuery.gte('visited_at', `${month}-01`).lt('visited_at', nextMonth);
    }

    const [{ data: visitsData, error: visitsError }, { data: doctorsData, error: doctorsError }] =
      await Promise.all([
        visitsQuery,
        this.supabase.getClient().from('doctors').select('id,name,specialty,area,class,phone,location'),
      ]);

    if (visitsError) {
      this.logger.error(`exportCsv visits fetch failed: ${visitsError.message}`);
      throw new InternalServerErrorException('Failed to fetch visits');
    }
    if (doctorsError) {
      this.logger.error(`exportCsv doctors fetch failed: ${doctorsError.message}`);
      throw new InternalServerErrorException('Failed to fetch doctors');
    }

    const doctorMap = new Map<number, any>((doctorsData as any[]).map((d) => [d.id, d]));

    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const header = 'Date,Day,Doctor,Specialty,Area,Class,Phone,Location';
    const rows = (visitsData as any[]).map((v) => {
      const d = doctorMap.get(v.doctor_id) ?? {};
      const dayName = new Date(`${v.visited_at}T12:00:00Z`).toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: 'UTC',
      });
      return [v.visited_at, dayName, d.name, d.specialty, d.area, d.class, d.phone, d.location]
        .map(escape)
        .join(',');
    });

    return [header, ...rows].join('\r\n');
  }
}
