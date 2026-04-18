import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { PlansService, Plan } from './plans.service';
import { SupabaseService } from '../supabase/supabase.service';

// ─── Builder mock ──────────────────────────────────────────────────────────────

function makeBuilder(result: { data?: any; error?: any }) {
  const b: any = {
    select:      jest.fn().mockReturnThis(),
    insert:      jest.fn().mockReturnThis(),
    update:      jest.fn().mockReturnThis(),
    upsert:      jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    in:          jest.fn().mockReturnThis(),
    order:       jest.fn().mockReturnThis(),
    single:      jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  b.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return b;
}

function makeSupabase(result: { data?: any; error?: any }) {
  const builder = makeBuilder(result);
  return {
    getClient: jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue(builder) }),
    _builder: builder,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PlansService', () => {

  describe('getPlan()', () => {

    it('returns the plan when it exists', async () => {
      const plan: Plan = { day: '2026-04-18', doctor_ids: [1, 2, 3] };
      const supabase   = makeSupabase({ data: plan, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(PlansService).getPlan('2026-04-18');
      expect(result).toEqual(plan);
    });

    it('returns an empty plan when none is saved for that date', async () => {
      const supabase = makeSupabase({ data: null, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(PlansService).getPlan('2026-04-18');
      expect(result).toEqual({ day: '2026-04-18', doctor_ids: [] });
    });

    it('throws InternalServerErrorException on DB error', async () => {
      const supabase = makeSupabase({ data: null, error: { message: 'fetch failed' } });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      await expect(module.get(PlansService).getPlan('2026-04-18'))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getAllPlans()', () => {

    it('returns all saved plans ordered by day', async () => {
      const plans: Plan[] = [
        { day: '2026-04-14', doctor_ids: [1] },
        { day: '2026-04-15', doctor_ids: [2, 3] },
      ];
      const supabase = makeSupabase({ data: plans, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(PlansService).getAllPlans();
      expect(result).toEqual(plans);
    });

    it('returns empty array when no plans exist', async () => {
      const supabase = makeSupabase({ data: [], error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      expect(await module.get(PlansService).getAllPlans()).toEqual([]);
    });

    it('throws InternalServerErrorException on DB error', async () => {
      const supabase = makeSupabase({ data: null, error: { message: 'fetch failed' } });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      await expect(module.get(PlansService).getAllPlans())
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getWeekPlans()', () => {

    it('returns 6 entries (Mon–Sat) for the given date\'s week', async () => {
      const supabase = makeSupabase({ data: [], error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      // 2026-04-14 is a Tuesday — week should span Mon 13 → Sat 18
      const result = await module.get(PlansService).getWeekPlans('2026-04-14');
      expect(result).toHaveLength(6);
      expect(result[0].day).toBe('2026-04-13'); // Monday
      expect(result[5].day).toBe('2026-04-18'); // Saturday
    });

    it('fills empty plans with doctor_ids: [] for days with no saved plan', async () => {
      const supabase = makeSupabase({ data: [], error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(PlansService).getWeekPlans('2026-04-14');
      expect(result.every((p) => Array.isArray(p.doctor_ids))).toBe(true);
    });

    it('merges saved plans with empty fallbacks', async () => {
      const saved = [{ day: '2026-04-13', doctor_ids: [7, 8] }];
      const supabase = makeSupabase({ data: saved, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(PlansService).getWeekPlans('2026-04-14');
      expect(result[0]).toEqual({ day: '2026-04-13', doctor_ids: [7, 8] });
      expect(result[1].doctor_ids).toEqual([]); // no plan saved for Tuesday
    });

    it('throws InternalServerErrorException on DB error', async () => {
      const supabase = makeSupabase({ data: null, error: { message: 'fetch failed' } });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      await expect(module.get(PlansService).getWeekPlans('2026-04-14'))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('setPlan()', () => {

    it('saves plan via upsert and returns it', async () => {
      const plan: Plan = { day: '2026-04-18', doctor_ids: [1, 2] };
      const supabase   = makeSupabase({ data: plan, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(PlansService).setPlan('2026-04-18', [1, 2]);
      expect(result).toEqual(plan);
    });

    it('throws InternalServerErrorException when upsert fails with a non-42P10 error', async () => {
      const supabase = makeSupabase({ data: null, error: { message: 'generic error', code: '23505' } });

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      await expect(module.get(PlansService).setPlan('2026-04-18', [1]))
        .rejects.toThrow(InternalServerErrorException);
    });

    it('falls back to update when upsert fails with 42P10 and row exists', async () => {
      const updated: Plan = { day: '2026-04-18', doctor_ids: [5] };
      let callCount = 0;

      const supabase = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return makeBuilder({ data: null, error: { message: 'no unique constraint', code: '42P10' } }); // upsert
            if (callCount === 2) return makeBuilder({ data: { day: '2026-04-18' }, error: null }); // select existing
            return makeBuilder({ data: updated, error: null }); // update
          }),
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(PlansService).setPlan('2026-04-18', [5]);
      expect(result).toEqual(updated);
    });

    it('falls back to insert when upsert fails with 42P10 and no row exists', async () => {
      const inserted: Plan = { day: '2026-04-18', doctor_ids: [5] };
      let callCount = 0;

      const supabase = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return makeBuilder({ data: null, error: { message: 'no unique constraint', code: '42P10' } }); // upsert
            if (callCount === 2) return makeBuilder({ data: null, error: null }); // select → nothing found
            return makeBuilder({ data: inserted, error: null }); // insert
          }),
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [PlansService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(PlansService).setPlan('2026-04-18', [5]);
      expect(result).toEqual(inserted);
    });
  });
});
