import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

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
  visit1: string;
  visit2: string;
  mar_visit1: string;
  mar_visit2: string;
  apr_visit1: string;
  apr_visit2: string;
  schedules: any;
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
  constructor(private readonly supabase: SupabaseService) {}

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

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let doctors = data as Doctor[];

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
        return status === filters.status.toUpperCase();
      });
    }

    // Hide F colleagues (show only if they have an april visit)
    if (filters.hideF === undefined || filters.hideF === true) {
      doctors = doctors.filter((d) => {
        if (d.class?.toLowerCase() === 'f') {
          return !!(d.apr_visit1 || d.apr_visit2);
        }
        return true;
      });
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
    const { data, error } = await this.supabase
      .getClient()
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException(`Doctor ${id} not found`);
    return data as Doctor;
  }

  async create(dto: Partial<Doctor>): Promise<Doctor> {
    const { id: _ignored, ...payload } = dto;
    const { data, error } = await this.supabase
      .getClient()
      .from('doctors')
      .insert([payload])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Doctor;
  }

  async update(id: number, dto: Partial<Doctor>): Promise<Doctor> {
    const { data, error } = await this.supabase
      .getClient()
      .from('doctors')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Doctor;
  }

  async remove(id: number): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('doctors')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
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
    const dates = [
      doctor.visit1,
      doctor.visit2,
      doctor.mar_visit1,
      doctor.mar_visit2,
      doctor.apr_visit1,
      doctor.apr_visit2,
    ]
      .filter(Boolean)
      .map((d) => new Date(d));
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }

  computeStatus(doctor: Doctor, today: Date = new Date()): string {
    if (this.isDeal(doctor)) return 'DEAL';
    if (doctor.class?.toLowerCase() === 'f') return 'F';
    const last = this.getLastVisit(doctor);
    if (!last) return 'NEVER';
    const diffDays = (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) return 'NEED_VISIT';
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
