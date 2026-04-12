import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DoctorsService, Doctor, Visit } from '../doctors/doctors.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly doctorsService: DoctorsService,
  ) {}

  async getStats() {
    const [{ data: doctorsRaw, error }, { data: visitsRaw }] = await Promise.all([
      this.supabase.getClient().from('doctors').select('*'),
      this.supabase.getClient().from('visits').select('*'),
    ]);

    if (error) {
      this.logger.error(`getStats failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch stats');
    }

    // Build visits map indexed by doctor_id
    const visitsMap = new Map<number, Visit[]>();
    for (const v of (visitsRaw ?? []) as Visit[]) {
      if (!visitsMap.has(v.doctor_id)) visitsMap.set(v.doctor_id, []);
      visitsMap.get(v.doctor_id)!.push(v);
    }

    const doctors: Doctor[] = (doctorsRaw as Doctor[]).map((d) => ({
      ...d,
      visits: visitsMap.get(d.id) ?? [],
    }));

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    const visitsThisMonth = (doctor: Doctor) =>
      (doctor.visits ?? []).filter((v) => v.visited_at.startsWith(monthPrefix));

    const totalActive      = doctors.filter((d) => d.class?.toLowerCase() !== 'f').length;
    const visitedThisMonth = doctors.filter((d) => visitsThisMonth(d).length > 0).length;
    const visitedOnce      = doctors.filter((d) => visitsThisMonth(d).length === 1).length;
    const visitedTwice     = doctors.filter((d) => visitsThisMonth(d).length >= 2).length;

    const neverVisited = doctors.filter((d) => {
      if (d.class?.toLowerCase() === 'f') return false;
      return !this.doctorsService.getLastVisit(d);
    }).length;

    const needVisit = doctors.filter((d) => {
      if (d.class?.toLowerCase() === 'f') return false;
      const last = this.doctorsService.getLastVisit(d);
      if (!last) return false;
      const diff = (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 12;
    }).length;

    // Group by area
    const areaMap: Record<string, { total: number; visited: number }> = {};
    for (const d of doctors) {
      if (d.class?.toLowerCase() === 'f') continue;
      const area = d.area || 'Unknown';
      if (!areaMap[area]) areaMap[area] = { total: 0, visited: 0 };
      areaMap[area].total++;
      if (visitsThisMonth(d).length > 0) areaMap[area].visited++;
    }

    const byArea = Object.entries(areaMap)
      .map(([area, counts]) => ({ area, ...counts }))
      .sort((a, b) => a.area.localeCompare(b.area));

    return {
      total: doctors.length,
      totalActive,
      visitedThisMonth,
      visitedOnce,
      visitedTwice,
      neverVisited,
      needVisit,
      byArea,
    };
  }
}
