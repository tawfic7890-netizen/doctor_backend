import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { StatsService } from './stats.service';
import { DoctorsService } from '../doctors/doctors.service';
import { SupabaseService } from '../supabase/supabase.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THIS_MONTH = new Date().toISOString().slice(0, 7); // YYYY-MM

function makeVisit(daysAgo: number, doctorId = 1, id = 1) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { id, doctor_id: doctorId, visited_at: d.toISOString().split('T')[0], created_at: d.toISOString() };
}

function makeDoctor(id: number, cls = 'B', visits: any[] = []) {
  return { id, name: `Dr #${id}`, specialty: 'General', area: 'Tripoli', class: cls, visits, location: '', phone: '', days: [], time: '', request: null, note: null, schedules: null };
}

function makeBuilder(result: any) {
  const b: any = {
    select: jest.fn().mockReturnThis(),
    gte:    jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
  };
  b.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return b;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StatsService', () => {

  function buildModule(doctorsData: any[], visitsData: any[]) {
    const supabase = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'doctors') return makeBuilder({ data: doctorsData, error: null });
          return makeBuilder({ data: visitsData, error: null });
        }),
      }),
    };
    return Test.createTestingModule({
      providers: [
        StatsService,
        DoctorsService,
        { provide: SupabaseService, useValue: supabase },
      ],
    }).compile();
  }

  // ── getStats() ─────────────────────────────────────────────────────────────

  describe('getStats()', () => {

    it('returns total count of all doctors', async () => {
      const module = await buildModule(
        [makeDoctor(1), makeDoctor(2), makeDoctor(3, 'F')],
        [],
      );
      const result = await module.get(StatsService).getStats();
      expect(result.total).toBe(3);
    });

    it('excludes class-F doctors from totalActive', async () => {
      const module = await buildModule(
        [makeDoctor(1, 'A'), makeDoctor(2, 'B'), makeDoctor(3, 'F')],
        [],
      );
      const result = await module.get(StatsService).getStats();
      expect(result.totalActive).toBe(2);
    });

    it('counts neverVisited only for non-F doctors with no visits', async () => {
      const module = await buildModule(
        [makeDoctor(1, 'B'), makeDoctor(2, 'B'), makeDoctor(3, 'F')],
        [],
      );
      const result = await module.get(StatsService).getStats();
      expect(result.neverVisited).toBe(2); // F excluded
    });

    it('counts visitedThisMonth correctly', async () => {
      const visitsThisMonth = [makeVisit(0, 1, 1), makeVisit(1, 2, 2)]; // doctor 1 and 2 visited this month
      const module = await buildModule(
        [makeDoctor(1), makeDoctor(2), makeDoctor(3)],
        visitsThisMonth,
      );
      const result = await module.get(StatsService).getStats();
      expect(result.visitedThisMonth).toBe(2);
    });

    it('counts needVisit (last visit > 12 days ago, non-F)', async () => {
      const oldVisit = makeVisit(20, 1, 1); // 20 days ago
      const module = await buildModule(
        [makeDoctor(1, 'B'), makeDoctor(2, 'F')],
        [oldVisit],
      );
      const result = await module.get(StatsService).getStats();
      expect(result.needVisit).toBe(1); // only doctor 1
    });

    it('groups doctors by area in byArea', async () => {
      const doctors = [
        { ...makeDoctor(1), area: 'Tripoli' },
        { ...makeDoctor(2), area: 'Tripoli' },
        { ...makeDoctor(3), area: 'Akkar' },
      ];
      const module = await buildModule(doctors, []);
      const result = await module.get(StatsService).getStats();
      const tripoli = result.byArea.find((a: any) => a.area === 'Tripoli');
      const akkar   = result.byArea.find((a: any) => a.area === 'Akkar');
      expect(tripoli?.total).toBe(2);
      expect(akkar?.total).toBe(1);
    });

    it('throws InternalServerErrorException when doctors fetch fails', async () => {
      const supabase = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation((table: string) => {
            if (table === 'doctors') return makeBuilder({ data: null, error: { message: 'db error' } });
            return makeBuilder({ data: [], error: null });
          }),
        }),
      };
      const module = await Test.createTestingModule({
        providers: [StatsService, DoctorsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();
      await expect(module.get(StatsService).getStats()).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── getHistory() ───────────────────────────────────────────────────────────

  describe('getHistory()', () => {

    it('returns exactly N months of history', async () => {
      const supabase = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation((table: string) => {
            if (table === 'doctors') return makeBuilder({ data: [makeDoctor(1)], error: null });
            return makeBuilder({ data: [], error: null });
          }),
        }),
      };
      const module = await Test.createTestingModule({
        providers: [StatsService, DoctorsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(StatsService).getHistory(6);
      expect(result).toHaveLength(6);
    });

    it('marks the current month as isCurrent=true', async () => {
      const supabase = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation((table: string) => {
            if (table === 'doctors') return makeBuilder({ data: [makeDoctor(1)], error: null });
            return makeBuilder({ data: [], error: null });
          }),
        }),
      };
      const module = await Test.createTestingModule({
        providers: [StatsService, DoctorsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(StatsService).getHistory(3);
      const current = result.find((m: any) => m.isCurrent);
      expect(current).toBeDefined();
      expect(current.month).toBe(THIS_MONTH);
    });

    it('calculates coverage percentage correctly', async () => {
      const thisMonthVisit = makeVisit(0, 1, 1); // doctor 1 visited today
      const supabase = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation((table: string) => {
            if (table === 'doctors') return makeBuilder({ data: [makeDoctor(1), makeDoctor(2)], error: null });
            return makeBuilder({ data: [thisMonthVisit], error: null });
          }),
        }),
      };
      const module = await Test.createTestingModule({
        providers: [StatsService, DoctorsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(StatsService).getHistory(1);
      // 1 out of 2 active doctors visited = 50%
      expect(result[0].coverage).toBe(50);
      expect(result[0].visited).toBe(1);
      expect(result[0].totalActive).toBe(2);
    });

    it('excludes F-class doctor visits from coverage calculation', async () => {
      const fVisit = makeVisit(0, 99, 99); // doctor 99 (F-class) visited today
      const supabase = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation((table: string) => {
            if (table === 'doctors') return makeBuilder({
              data: [makeDoctor(1), makeDoctor(2), makeDoctor(99, 'F')],
              error: null,
            });
            return makeBuilder({ data: [fVisit], error: null });
          }),
        }),
      };
      const module = await Test.createTestingModule({
        providers: [StatsService, DoctorsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();

      const result = await module.get(StatsService).getHistory(1);
      // F-class doctor's visit must NOT count toward coverage
      expect(result[0].visited).toBe(0);
      expect(result[0].coverage).toBe(0);
    });

    it('throws InternalServerErrorException when DB fails', async () => {
      const supabase = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue(makeBuilder({ data: null, error: { message: 'db error' } })),
        }),
      };
      const module = await Test.createTestingModule({
        providers: [StatsService, DoctorsService, { provide: SupabaseService, useValue: supabase }],
      }).compile();
      await expect(module.get(StatsService).getHistory(6)).rejects.toThrow(InternalServerErrorException);
    });
  });
});
