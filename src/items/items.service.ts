import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Item {
  id: number;
  name: string;
  description?: string;
  price?: number;
  ingredients?: string;
  created_at: string;
}

export interface ItemAssignment {
  id: number;
  item_id: number;
  doctor_id: number;
  plan_date: string;
  status: 'pending' | 'done';
  created_at: string;
}

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findAll(): Promise<Item[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('items')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      this.logger.error(`findAll items failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch items');
    }
    return data as Item[];
  }

  async findOne(id: number): Promise<Item> {
    const { data, error } = await this.supabase
      .getClient()
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error(`findOne item #${id} failed: ${error.message}`);
      throw new NotFoundException('Item not found');
    }
    return data as Item;
  }

  async create(dto: { name: string; description?: string; price?: number; ingredients?: string }): Promise<Item> {
    const { data, error } = await this.supabase
      .getClient()
      .from('items')
      .insert(dto)
      .select()
      .single();

    if (error) {
      this.logger.error(`create item failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to create item');
    }
    return data as Item;
  }

  async update(id: number, dto: Partial<{ name: string; description: string; price: number; ingredients: string }>): Promise<Item> {
    const { data, error } = await this.supabase
      .getClient()
      .from('items')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`update item #${id} failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to update item');
    }
    return data as Item;
  }

  async remove(id: number): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('items')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`remove item #${id} failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete item');
    }
  }

  // ─── Item Assignments ───────────────────────────────────────────────────────

  async getAssignments(filters?: { plan_date?: string; doctor_id?: number; item_id?: number }): Promise<ItemAssignment[]> {
    let query = this.supabase
      .getClient()
      .from('item_assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.plan_date) query = query.eq('plan_date', filters.plan_date);
    if (filters?.doctor_id) query = query.eq('doctor_id', filters.doctor_id);
    if (filters?.item_id) query = query.eq('item_id', filters.item_id);

    const { data, error } = await query;

    if (error) {
      this.logger.error(`getAssignments failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch assignments');
    }
    return data as ItemAssignment[];
  }

  async assign(dto: { item_id: number; doctor_id: number; plan_date: string; status?: string }): Promise<ItemAssignment> {
    const { data, error } = await this.supabase
      .getClient()
      .from('item_assignments')
      .upsert(
        { item_id: dto.item_id, doctor_id: dto.doctor_id, plan_date: dto.plan_date, status: dto.status || 'pending' },
        { onConflict: 'item_id,doctor_id,plan_date' },
      )
      .select()
      .single();

    if (error) {
      this.logger.error(`assign item failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to assign item');
    }
    return data as ItemAssignment;
  }

  async updateAssignmentStatus(id: number, status: string): Promise<ItemAssignment> {
    const { data, error } = await this.supabase
      .getClient()
      .from('item_assignments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`updateAssignmentStatus #${id} failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to update assignment');
    }
    return data as ItemAssignment;
  }

  async removeAssignment(id: number): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('item_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`removeAssignment #${id} failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to remove assignment');
    }
  }
}
