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

  /**
   * Returns monthly visit statistics for the last `months` calendar months
   * (including the current month), sorted oldest → newest.
   */
  async getHistory(months = 6) {
    const now = new Date();

    // First day of the earliest month we need
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const startStr  = startDate.toISOString().split('T')[0];

    const [{ data: visitsRaw, error: vErr }, { data: doctorsRaw, error: dErr }] =
      await Promise.all([
        this.supabase.getClient()
          .from('visits')
          .select('doctor_id, visited_at')
          .gte('visited_at', startStr),
        this.supabase.getClient()
          .from('doctors')
          .select('id, class'),
      ]);

    if (vErr || dErr) {
      this.logger.error(`getHistory failed: ${(vErr ?? dErr)!.message}`);
      throw new InternalServerErrorException('Failed to fetch history');
    }

    const activeIds = new Set(
      (doctorsRaw as any[])
        .filter((d) => d.class?.toLowerCase() !== 'f')
        .map((d) => d.id),
    );
    const totalActive = activeIds.size;

    // Count unique active (non-F) doctors visited per month
    // monthVisitors: month-key → Set<doctor_id>
    const monthVisitors = new Map<string, Set<number>>();
    for (const v of visitsRaw as any[]) {
      if (!activeIds.has(v.doctor_id)) continue; // exclude F-class doctors from coverage
      const key = (v.visited_at as string).slice(0, 7); // YYYY-MM
      if (!monthVisitors.has(key)) monthVisitors.set(key, new Set());
      monthVisitors.get(key)!.add(v.doctor_id);
    }

    // Build one entry per calendar month
    const result = Array.from({ length: months }, (_, i) => {
      const d     = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const visited    = monthVisitors.get(key)?.size ?? 0;
      const coverage   = totalActive > 0 ? Math.round((visited / totalActive) * 100) : 0;
      const isCurrent  = key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return { month: key, label, visited, totalActive, coverage, isCurrent };
    });

    return result;
  }
}
