import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Visit {
  id: number;
  doctor_id: number;
  visited_at: string;
  created_at: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  area: string;
  location: string;
  phone: string;
  days: string[];
  time: string;
  class: string;
  request: string;
  note: string;
  schedules: any;
  visits?: Visit[];
}

export interface DoctorFilters {
  area?: string;
  status?: string;
  day?: string;
  search?: string;
  hideF?: boolean;
}

@Injectable()
export class DoctorsService {
  private readonly logger = new Logger(DoctorsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** Fetch all visits and return them indexed by doctor_id for fast lookup. */
  private async fetchVisitsMap(): Promise<Map<number, Visit[]>> {
    const { data, error } = await this.supabase
      .getClient()
      .from('visits')
      .select('*')
      .order('visited_at', { ascending: false });

    if (error) {
      this.logger.error(`fetchVisitsMap failed: ${error.message} — visits will be empty`);
      return new Map();
    }

    this.logger.log(`fetchVisitsMap: loaded ${(data as Visit[]).length} visit rows`);
    const map = new Map<number, Visit[]>();
    for (const v of data as Visit[]) {
      if (!map.has(v.doctor_id)) map.set(v.doctor_id, []);
      map.get(v.doctor_id)!.push(v);
    }
    return map;
  }

  async findAll(filters: DoctorFilters): Promise<Doctor[]> {
    let query = this.supabase.getClient().from('doctors').select('*');

    if (filters.area) {
      query = query.ilike('area', `%${filters.area}%`);
    }

    if (filters.search) {
      const s = filters.search;
      query = query.or(
        `name.ilike.%${s}%,specialty.ilike.%${s}%,area.ilike.%${s}%,phone.ilike.%${s}%`,
      );
    }

    const [{ data, error }, visitsMap] = await Promise.all([
      query,
      this.fetchVisitsMap(),
    ]);

    if (error) {
      this.logger.error(`findAll failed: ${error.message} (code: ${error.code})`);
      throw new InternalServerErrorException(`Failed to fetch doctors: ${error.message}`);
    }

    let doctors = (data as Doctor[]).map((d) => ({
      ...d,
      visits: visitsMap.get(d.id) ?? [],
    }));

    // Filter by day
    if (filters.day) {
      const dayLower = filters.day.toLowerCase();
      const DAY_MAP: Record<string, string> = {
        mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
        monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
      };
      const targetDay = DAY_MAP[dayLower] || filters.day;
      doctors = doctors.filter((d) => Array.isArray(d.days) && d.days.includes(targetDay));
    }

    // Filter by status
    if (filters.status) {
      const today = new Date();
      doctors = doctors.filter((d) => {
        const status = this.computeStatus(d, today);
        return status === filters.status!.toUpperCase();
      });
    }

    // Hide F colleagues
    if (filters.hideF === undefined || filters.hideF === true) {
      doctors = doctors.filter((d) => d.class?.toLowerCase() !== 'f');
    }

    // Sort
    const today = new Date();
    doctors.sort((a, b) => {
      const sa = this.sortWeight(a, today);
      const sb = this.sortWeight(b, today);
      if (sa !== sb) return sa - sb;
      if (a.area < b.area) return -1;
      if (a.area > b.area) return 1;
      return a.name.localeCompare(b.name);
    });

    return doctors;
  }

  async findOne(id: number): Promise<Doctor> {
    const [{ data, error }, visitsMap] = await Promise.all([
      this.supabase.getClient().from('doctors').select('*').eq('id', id).single(),
      this.fetchVisitsMap(),
    ]);

    if (error || !data) {
      this.logger.warn(`Doctor ${id} not found`);
      throw new NotFoundException(`Doctor ${id} not found`);
    }

    return { ...(data as Doctor), visits: visitsMap.get(id) ?? [] };
  }

  async create(dto: Partial<Doctor>): Promise<Doctor> {
    const { id: _ignored, visits: _v, ...payload } = dto as any;
    const { data, error } = await this.supabase
      .getClient()
      .from('doctors')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      this.logger.error(`create failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to create doctor');
    }
    return { ...(data as Doctor), visits: [] };
  }

  async update(id: number, dto: Partial<Doctor>): Promise<Doctor> {
    const { visits: _v, ...payload } = dto as any;
    const { data, error } = await this.supabase
      .getClient()
      .from('doctors')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      this.logger.error(`update #${id} failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to update doctor');
    }

    const visitsMap = await this.fetchVisitsMap();
    return { ...(data as Doctor), visits: visitsMap.get(id) ?? [] };
  }

  async remove(id: number): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('doctors')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`remove #${id} failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete doctor');
    }
  }

  isDeal(doctor: Doctor): boolean {
    const name = doctor.name?.toLowerCase() || '';
    return (
      name.includes('abdulrazak othman') ||
      name.includes('ayad fallah') ||
      name.includes('ahmad moustafa')
    );
  }

  getLastVisit(doctor: Doctor): Date | null {
    const visits = doctor.visits ?? [];
    if (visits.length === 0) return null;
    const dates = visits.map((v) => new Date(v.visited_at));
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }

  computeStatus(doctor: Doctor, today: Date = new Date()): string {
    if (this.isDeal(doctor)) return 'DEAL';
    if (doctor.class?.toLowerCase() === 'f') return 'F';
    const last = this.getLastVisit(doctor);
    if (!last) return 'NEVER';
    const diffDays = (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 12) return 'NEED_VISIT';
    return 'RECENT';
  }

  sortWeight(doctor: Doctor, today: Date): number {
    const status = this.computeStatus(doctor, today);
    const weights: Record<string, number> = {
      DEAL: 0,
      NEVER: 1,
      NEED_VISIT: 2,
      RECENT: 3,
      F: 9,
    };
    return weights[status] ?? 5;
  }
}
