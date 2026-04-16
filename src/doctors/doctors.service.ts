import {
  Injectable, NotFoundException,
  InternalServerErrorException, Logger,
} from '@nestjs/common';
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

  /** Fetch ALL visits and index by doctor_id — used when we need visits for many doctors. */
  private async fetchAllVisitsMap(): Promise<Map<number, Visit[]>> {
    const { data, error } = await this.supabase
      .getClient()
      .from('visits')
      .select('*')
      .order('visited_at', { ascending: false });

    if (error) {
      this.logger.error(`fetchAllVisitsMap failed: ${error.message}`);
      return new Map();
    }

    const map = new Map<number, Visit[]>();
    for (const v of data as Visit[]) {
      if (!map.has(v.doctor_id)) map.set(v.doctor_id, []);
      map.get(v.doctor_id)!.push(v);
    }
    return map;
  }

  /** Fetch visits for a single doctor only. */
  private async fetchVisitsForDoctor(doctorId: number): Promise<Visit[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('visits')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('visited_at', { ascending: false });

    if (error) {
      this.logger.error(`fetchVisitsForDoctor #${doctorId} failed: ${error.message}`);
      return [];
    }
    return data as Visit[];
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

    // Run doctors query and full visits fetch in parallel
    const [{ data, error }, visitsMap] = await Promise.all([
      query,
      this.fetchAllVisitsMap(),
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
      const targetDay = DAY_MAP[dayLower] ?? filters.day;
      doctors = doctors.filter((d) => Array.isArray(d.days) && d.days.includes(targetDay));
    }

    // Filter by status
    if (filters.status) {
      const today = new Date();
      const upper = filters.status.toUpperCase();
      doctors = doctors.filter((d) => this.computeStatus(d, today) === upper);
    }

    // Hide F colleagues
    if (filters.hideF === undefined || filters.hideF === true) {
      doctors = doctors.filter((d) => d.class?.toLowerCase() !== 'f');
    }

    // Sort: a★ (Deal Priority) → A (Priority) → B (Normal) → F (Colleague), then name
    doctors.sort((a, b) => {
      const diff = this.classWeight(a) - this.classWeight(b);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });

    return doctors;
  }

  async findOne(id: number): Promise<Doctor> {
    // Only fetch visits for this specific doctor, not the entire visits table
    const [{ data, error }, visits] = await Promise.all([
      this.supabase.getClient().from('doctors').select('*').eq('id', id).single(),
      this.fetchVisitsForDoctor(id),
    ]);

    if (error || !data) {
      this.logger.warn(`Doctor ${id} not found`);
      throw new NotFoundException(`Doctor ${id} not found`);
    }

    return { ...(data as Doctor), visits };
  }

  async create(dto: Partial<Doctor>): Promise<Doctor> {
    const { id: _id, visits: _v, ...payload } = dto as any;
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

    // Run the update and the visits fetch in parallel
    const [{ data, error }, visits] = await Promise.all([
      this.supabase.getClient().from('doctors').update(payload).eq('id', id).select('*').single(),
      this.fetchVisitsForDoctor(id),
    ]);

    if (error) {
      this.logger.error(`update #${id} failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to update doctor');
    }

    return { ...(data as Doctor), visits };
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

  /** Deal Priority doctors are those with class 'a' — no hardcoded names. */
  isDeal(doctor: Doctor): boolean {
    return doctor.class === 'a';
  }

  getLastVisit(doctor: Doctor): Date | null {
    const visits = doctor.visits ?? [];
    if (visits.length === 0) return null;
    return new Date(Math.max(...visits.map((v) => new Date(v.visited_at).getTime())));
  }

  computeStatus(doctor: Doctor, today: Date = new Date()): string {
    if (this.isDeal(doctor)) return 'DEAL';
    if (doctor.class?.toLowerCase() === 'f') return 'F';
    const last = this.getLastVisit(doctor);
    if (!last) return 'NEVER';
    const diffDays = (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 12 ? 'NEED_VISIT' : 'RECENT';
  }

  sortWeight(doctor: Doctor, today: Date): number {
    const weights: Record<string, number> = {
      DEAL: 0, NEVER: 1, NEED_VISIT: 2, RECENT: 3, F: 9,
    };
    return weights[this.computeStatus(doctor, today)] ?? 5;
  }

  /** Primary sort key: a (Deal Priority) → A (Priority) → B (Normal) → F (Colleague) */
  classWeight(doctor: Doctor): number {
    switch (doctor.class) {
      case 'a': return 0;
      case 'A': return 1;
      case 'B': return 2;
      case 'F': return 3;
      default:  return 2;
    }
  }
}
