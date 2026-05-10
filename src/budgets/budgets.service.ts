import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface MonthlyBudget {
  id: number;
  month: string;
  budget: number;
  created_at: string;
}

export interface DoctorDeal {
  id: number;
  doctor_id: number;
  month: string;
  amount: number;
  note?: string;
  created_at: string;
}

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // ─── Monthly Budget ─────────────────────────────────────────────────────────

  async getBudget(month: string): Promise<MonthlyBudget | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('monthly_budgets')
      .select('*')
      .eq('month', month)
      .maybeSingle();

    if (error) {
      this.logger.error(`getBudget(${month}) failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch budget');
    }
    return data as MonthlyBudget | null;
  }

  async setBudget(month: string, budget: number): Promise<MonthlyBudget> {
    const { data, error } = await this.supabase
      .getClient()
      .from('monthly_budgets')
      .upsert({ month, budget }, { onConflict: 'month' })
      .select()
      .single();

    if (error) {
      this.logger.error(`setBudget(${month}) failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to set budget');
    }
    return data as MonthlyBudget;
  }

  // ─── Doctor Deals ───────────────────────────────────────────────────────────

  async getDeals(month: string): Promise<DoctorDeal[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('doctor_deals')
      .select('*')
      .eq('month', month)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`getDeals(${month}) failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch deals');
    }
    return data as DoctorDeal[];
  }

  async createDeal(dto: { doctor_id: number; month: string; amount: number; note?: string }): Promise<DoctorDeal> {
    const { data, error } = await this.supabase
      .getClient()
      .from('doctor_deals')
      .insert(dto)
      .select()
      .single();

    if (error) {
      this.logger.error(`createDeal failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to create deal');
    }
    return data as DoctorDeal;
  }

  async removeDeal(id: number): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('doctor_deals')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`removeDeal #${id} failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete deal');
    }
  }

  /** Summary for a month: budget, total spent (sum of deals), remaining */
  async getSummary(month: string): Promise<{ budget: number; spent: number; remaining: number }> {
    const [budgetData, deals] = await Promise.all([
      this.getBudget(month),
      this.getDeals(month),
    ]);

    const budget = budgetData?.budget ?? 0;
    const spent = deals.reduce((sum, d) => sum + Number(d.amount), 0);
    return { budget, spent, remaining: budget - spent };
  }
}
