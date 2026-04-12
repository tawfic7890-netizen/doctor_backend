import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DoctorsService } from '../doctors/doctors.service';

@Injectable()
export class VisitsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly doctorsService: DoctorsService,
  ) {}

  async recordVisit(
    doctorId: number,
    month: string,
    visitNumber: 1 | 2,
    date: string,
  ) {
    const fieldMap: Record<string, Record<number, string>> = {
      mar: { 1: 'mar_visit1', 2: 'mar_visit2' },
      apr: { 1: 'apr_visit1', 2: 'apr_visit2' },
    };
    const field = fieldMap[month]?.[visitNumber];
    if (!field) throw new Error(`Invalid month "${month}" or visitNumber "${visitNumber}"`);

    const update: Record<string, string> = { [field]: date };
    const { data, error } = await this.supabase
      .getClient()
      .from('doctors')
      .update(update)
      .eq('id', doctorId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async visitToday(doctorId: number) {
    const doctor = await this.doctorsService.findOne(doctorId);
    if (!doctor) throw new NotFoundException(`Doctor ${doctorId} not found`);

    const today = new Date().toISOString().split('T')[0];
    let field = 'apr_visit1';
    if (doctor.apr_visit1) {
      field = 'apr_visit2';
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('doctors')
      .update({ [field]: today })
      .eq('id', doctorId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async clearVisit(doctorId: number, field: string) {
    const allowedFields = ['apr_visit1', 'apr_visit2', 'mar_visit1', 'mar_visit2'];
    if (!allowedFields.includes(field)) throw new Error(`Invalid field: ${field}`);

    const { data, error } = await this.supabase
      .getClient()
      .from('doctors')
      .update({ [field]: null })
      .eq('id', doctorId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}
