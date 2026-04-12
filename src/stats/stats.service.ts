import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DoctorsService, Doctor } from '../doctors/doctors.service';

@Injectable()
export class StatsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly doctorsService: DoctorsService,
  ) {}

  async getStats() {
    const { data, error } = await this.supabase.getClient().from('doctors').select('*');
    if (error) throw new Error(error.message);
    const doctors = data as Doctor[];
    const today = new Date();

    const totalActive = doctors.filter((d) => d.class?.toLowerCase() !== 'f').length;

    const visitedThisMonth = doctors.filter(
      (d) => !!(d.apr_visit1 || d.apr_visit2),
    ).length;

    const visitedOnce = doctors.filter(
      (d) => !!(d.apr_visit1) && !d.apr_visit2,
    ).length;

    const visitedTwice = doctors.filter(
      (d) => !!(d.apr_visit1 && d.apr_visit2),
    ).length;

    const neverVisited = doctors.filter((d) => {
      if (d.class?.toLowerCase() === 'f') return false;
      return !this.doctorsService.getLastVisit(d);
    }).length;

    const needVisit = doctors.filter((d) => {
      if (d.class?.toLowerCase() === 'f') return false;
      const last = this.doctorsService.getLastVisit(d);
      if (!last) return false;
      const diff = (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 30;
    }).length;

    // Group by area
    const areaMap: Record<string, { total: number; visited: number }> = {};
    for (const d of doctors) {
      if (d.class?.toLowerCase() === 'f') continue;
      const area = d.area || 'Unknown';
      if (!areaMap[area]) areaMap[area] = { total: 0, visited: 0 };
      areaMap[area].total++;
      if (d.apr_visit1 || d.apr_visit2) areaMap[area].visited++;
    }

    const byArea = Object.entries(areaMap).map(([area, counts]) => ({
      area,
      ...counts,
    })).sort((a, b) => a.area.localeCompare(b.area));

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
