import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { SupabaseService } from '../supabase/supabase.service';

// ─── Query-builder mock ────────────────────────────────────────────────────────

function makeBuilder(result: { data?: any; error?: any }) {
  const b: any = {
    select:      jest.fn().mockReturnThis(),
    insert:      jest.fn().mockReturnThis(),
    delete:      jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    gte:         jest.fn().mockReturnThis(),
    lt:          jest.fn().mockReturnThis(),
    order:       jest.fn().mockReturnThis(),
    in:          jest.fn().mockReturnThis(),
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

describe('VisitsService', () => {

  describe('recordVisit()', () => {

    it('returns existing visit without inserting a duplicate', async () => {
      const existing = { id: 5, doctor_id: 1, visited_at: '2026-04-18', created_at: '2026-04-18' };
      const supabase = makeSupabase({ data: existing, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [VisitsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(VisitsService).recordVisit(1, '2026-04-18');
      expect(result).toEqual(existing);
      // insert should NOT have been called
      const builder = supabase._builder;
      expect(builder.insert).not.toHaveBeenCalled();
    });

    it('inserts and returns a new visit when none exists for that date', async () => {
      const newVisit = { id: 10, doctor_id: 1, visited_at: '2026-04-18', created_at: '2026-04-18' };

      // First call (maybeSingle check) → no existing; second (insert) → new visit
      let callCount = 0;
      const supabase = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return makeBuilder({ data: null, error: null });
            return makeBuilder({ data: newVisit, error: null });
          }),
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [VisitsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(VisitsService).recordVisit(1, '2026-04-18');
      expect(result).toEqual(newVisit);
    });

    it('throws InternalServerErrorException when insert fails', async () => {
      let callCount = 0;
      const supabase = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return makeBuilder({ data: null, error: null }); // no existing
            return makeBuilder({ data: null, error: { message: 'insert error' } });
          }),
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [VisitsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      await expect(module.get(VisitsService).recordVisit(1, '2026-04-18'))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('visitToday()', () => {

    it('calls recordVisit with today\'s date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const visit = { id: 1, doctor_id: 2, visited_at: today, created_at: today };

      let callCount = 0;
      const supabase = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return makeBuilder({ data: null, error: null });
            return makeBuilder({ data: visit, error: null });
          }),
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [VisitsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(VisitsService).visitToday(2);
      expect(result.visited_at).toBe(today);
    });
  });

  describe('clearVisit()', () => {

    it('resolves without error on success', async () => {
      const supabase = makeSupabase({ data: null, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [VisitsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      await expect(module.get(VisitsService).clearVisit(5)).resolves.toBeUndefined();
    });

    it('throws InternalServerErrorException on DB error', async () => {
      const supabase = makeSupabase({ data: null, error: { message: 'delete failed' } });

      const module: TestingModule = await Test.createTestingModule({
        providers: [VisitsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      await expect(module.get(VisitsService).clearVisit(5))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('exportCsv()', () => {

    const doctors = [{ id: 1, name: 'Dr. Ahmad', specialty: 'General', area: 'Tripoli', class: 'B', phone: '000', location: 'Clinic A' }];
    const visits  = [{ id: 1, doctor_id: 1, visited_at: '2026-04-18' }];

    function makeExportSupabase(visitsResult: any, doctorsResult: any) {
      return {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation((table: string) => {
            if (table === 'doctors') return makeBuilder(doctorsResult);
            return makeBuilder(visitsResult);
          }),
        }),
      };
    }

    it('returns CSV with header and one data row', async () => {
      const supabase = makeExportSupabase({ data: visits, error: null }, { data: doctors, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [VisitsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const csv = await module.get(VisitsService).exportCsv();
      expect(csv).toContain('Date,Day,Doctor');
      expect(csv).toContain('2026-04-18');
      expect(csv).toContain('Dr. Ahmad');
    });

    it('returns only header row when there are no visits', async () => {
      const supabase = makeExportSupabase({ data: [], error: null }, { data: doctors, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [VisitsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const csv = await module.get(VisitsService).exportCsv();
      const lines = csv.split('\r\n').filter(Boolean);
      expect(lines).toHaveLength(1); // header only
    });

    it('throws InternalServerErrorException when visits fetch fails', async () => {
      const supabase = makeExportSupabase(
        { data: null, error: { message: 'visits error' } },
        { data: doctors, error: null },
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [VisitsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      await expect(module.get(VisitsService).exportCsv())
        .rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when doctors fetch fails', async () => {
      const supabase = makeExportSupabase(
        { data: visits, error: null },
        { data: null, error: { message: 'doctors error' } },
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [VisitsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      await expect(module.get(VisitsService).exportCsv())
        .rejects.toThrow(InternalServerErrorException);
    });
  });
});
