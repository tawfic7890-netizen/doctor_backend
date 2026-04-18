import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DoctorsService, Doctor, Visit } from './doctors.service';
import { SupabaseService } from '../supabase/supabase.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: 1,
    name: 'Dr. Test',
    specialty: 'General',
    area: 'Tripoli',
    location: 'Tripoli, Abu Samra',
    phone: '+961 6 000000',
    days: ['Mon', 'Wed'],
    time: '9am–1pm',
    class: 'B',
    request: null,
    note: null,
    schedules: null,
    visits: [],
    ...overrides,
  };
}

function makeVisit(daysAgo: number, id = 1): Visit {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id,
    doctor_id: 1,
    visited_at: d.toISOString(),
    created_at: d.toISOString(),
  };
}

// ─── Supabase query-builder mock factory ──────────────────────────────────────
// Each method returns `this` so chaining works: .from().select().eq().single()

function makeQueryBuilder(result: { data?: any; error?: any }) {
  const builder: any = {
    select:  jest.fn().mockReturnThis(),
    insert:  jest.fn().mockReturnThis(),
    update:  jest.fn().mockReturnThis(),
    delete:  jest.fn().mockReturnThis(),
    upsert:  jest.fn().mockReturnThis(),
    eq:      jest.fn().mockReturnThis(),
    ilike:   jest.fn().mockReturnThis(),
    or:      jest.fn().mockReturnThis(),
    order:   jest.fn().mockReturnThis(),
    single:  jest.fn().mockResolvedValue(result),
  };
  // Make the builder itself awaitable (for queries that don't end in .single())
  builder.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return builder;
}

function makeSupabaseMock(queryResult: { data?: any; error?: any }) {
  const builder = makeQueryBuilder(queryResult);
  return {
    getClient: jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue(builder) }),
    _builder: builder,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DoctorsService', () => {
  let service: DoctorsService;

  // ── Pure / synchronous helpers ─────────────────────────────────────────────

  describe('isDeal()', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: makeSupabaseMock({ data: [], error: null }) },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);
    });

    it('returns true when class is "a"', () => {
      expect(service.isDeal(makeDoctor({ class: 'a' }))).toBe(true);
    });

    it('returns false for class "A"', () => {
      expect(service.isDeal(makeDoctor({ class: 'A' }))).toBe(false);
    });

    it('returns false for class "B"', () => {
      expect(service.isDeal(makeDoctor({ class: 'B' }))).toBe(false);
    });
  });

  describe('getLastVisit()', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: makeSupabaseMock({ data: [], error: null }) },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);
    });

    it('returns null when doctor has no visits', () => {
      expect(service.getLastVisit(makeDoctor({ visits: [] }))).toBeNull();
    });

    it('returns the most recent visit date', () => {
      const older  = makeVisit(10, 1);
      const recent = makeVisit(3,  2);
      const result = service.getLastVisit(makeDoctor({ visits: [older, recent] }));
      expect(result).toEqual(new Date(recent.visited_at));
    });

    it('handles a single visit', () => {
      const visit = makeVisit(5, 1);
      const result = service.getLastVisit(makeDoctor({ visits: [visit] }));
      expect(result).toEqual(new Date(visit.visited_at));
    });
  });

  describe('computeStatus()', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: makeSupabaseMock({ data: [], error: null }) },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);
    });

    const TODAY = new Date();

    it('returns DEAL for class "a"', () => {
      expect(service.computeStatus(makeDoctor({ class: 'a' }), TODAY)).toBe('DEAL');
    });

    it('returns F for class "f" (lowercase)', () => {
      expect(service.computeStatus(makeDoctor({ class: 'f' }), TODAY)).toBe('F');
    });

    it('returns F for class "F" (uppercase)', () => {
      expect(service.computeStatus(makeDoctor({ class: 'F' }), TODAY)).toBe('F');
    });

    it('returns NEVER when no visits', () => {
      expect(service.computeStatus(makeDoctor({ visits: [] }), TODAY)).toBe('NEVER');
    });

    it('returns RECENT when last visit ≤ 12 days ago', () => {
      expect(
        service.computeStatus(makeDoctor({ visits: [makeVisit(5)] }), TODAY),
      ).toBe('RECENT');
    });

    it('returns RECENT on exactly day 12', () => {
      expect(
        service.computeStatus(makeDoctor({ visits: [makeVisit(12)] }), TODAY),
      ).toBe('RECENT');
    });

    it('returns NEED_VISIT when last visit > 12 days ago', () => {
      expect(
        service.computeStatus(makeDoctor({ visits: [makeVisit(13)] }), TODAY),
      ).toBe('NEED_VISIT');
    });

    it('returns NEED_VISIT when last visit is 30 days ago', () => {
      expect(
        service.computeStatus(makeDoctor({ visits: [makeVisit(30)] }), TODAY),
      ).toBe('NEED_VISIT');
    });
  });

  describe('classWeight()', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: makeSupabaseMock({ data: [], error: null }) },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);
    });

    it('a (Deal Priority) has lowest weight', () => {
      expect(service.classWeight(makeDoctor({ class: 'a' }))).toBe(0);
    });

    it('A (Priority) has second weight', () => {
      expect(service.classWeight(makeDoctor({ class: 'A' }))).toBe(1);
    });

    it('B (Normal) has third weight', () => {
      expect(service.classWeight(makeDoctor({ class: 'B' }))).toBe(2);
    });

    it('F (Colleague) has highest weight', () => {
      expect(service.classWeight(makeDoctor({ class: 'F' }))).toBe(3);
    });

    it('unknown class defaults to B weight (2)', () => {
      expect(service.classWeight(makeDoctor({ class: 'C' }))).toBe(2);
    });
  });

  // ── Sort order (area fix) ──────────────────────────────────────────────────

  describe('sort order', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: makeSupabaseMock({ data: [], error: null }) },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);
    });

    it('sorts by area alphabetically within the same class', () => {
      const doctors = [
        makeDoctor({ area: 'Tripoli', name: 'Dr. Z', class: 'B' }),
        makeDoctor({ area: 'Akkar',   name: 'Dr. A', class: 'B' }),
      ];
      doctors.sort((a, b) => {
        const diff = service.classWeight(a) - service.classWeight(b);
        if (diff !== 0) return diff;
        const areaDiff = (a.area || '').localeCompare(b.area || '');
        if (areaDiff !== 0) return areaDiff;
        return a.name.localeCompare(b.name);
      });
      expect(doctors[0].area).toBe('Akkar');
      expect(doctors[1].area).toBe('Tripoli');
    });

    it('sorts by name within the same class and area', () => {
      const doctors = [
        makeDoctor({ area: 'Tripoli', name: 'Dr. Ziad',  class: 'B' }),
        makeDoctor({ area: 'Tripoli', name: 'Dr. Ahmad', class: 'B' }),
      ];
      doctors.sort((a, b) => {
        const diff = service.classWeight(a) - service.classWeight(b);
        if (diff !== 0) return diff;
        const areaDiff = (a.area || '').localeCompare(b.area || '');
        if (areaDiff !== 0) return areaDiff;
        return a.name.localeCompare(b.name);
      });
      expect(doctors[0].name).toBe('Dr. Ahmad');
    });
  });

  // ── Async / DB-backed methods ──────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns a doctor with visits attached', async () => {
      const doctor  = makeDoctor();
      const visits  = [makeVisit(3, 10)];

      // We need two separate Supabase calls: one for the doctor, one for visits
      const visitsBuilder  = makeQueryBuilder({ data: visits, error: null });
      const doctorBuilder  = makeQueryBuilder({ data: doctor, error: null });

      let callCount = 0;
      const supabaseMock = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation((table: string) => {
            if (table === 'visits') return visitsBuilder;
            return doctorBuilder;
          }),
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: supabaseMock },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);

      const result = await service.findOne(1);
      expect(result.id).toBe(1);
      expect(result.visits).toEqual(visits);
    });

    it('throws NotFoundException when doctor does not exist', async () => {
      const supabaseMock = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation((table: string) => {
            if (table === 'visits') return makeQueryBuilder({ data: [], error: null });
            return makeQueryBuilder({ data: null, error: { message: 'Not found' } });
          }),
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: supabaseMock },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    it('inserts and returns the new doctor', async () => {
      const created = makeDoctor({ id: 42, name: 'Dr. New' });
      const mock    = makeSupabaseMock({ data: created, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: mock },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);

      const result = await service.create({ name: 'Dr. New', area: 'Tripoli' } as any);
      expect(result.id).toBe(42);
      expect(result.visits).toEqual([]);
    });

    it('throws InternalServerErrorException on DB error', async () => {
      const mock = makeSupabaseMock({ data: null, error: { message: 'insert failed' } });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: mock },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);

      await expect(service.create({ name: 'Dr. Fail', area: 'Akkar' } as any))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('update()', () => {
    it('updates and returns the doctor with visits', async () => {
      const updated = makeDoctor({ class: 'A' });
      const visits  = [makeVisit(2, 5)];

      const supabaseMock = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation((table: string) => {
            if (table === 'visits') return makeQueryBuilder({ data: visits, error: null });
            return makeQueryBuilder({ data: updated, error: null });
          }),
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: supabaseMock },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);

      const result = await service.update(1, { class: 'A' } as any);
      expect(result.class).toBe('A');
      expect(result.visits).toEqual(visits);
    });

    it('throws InternalServerErrorException on DB error', async () => {
      const supabaseMock = {
        getClient: jest.fn().mockReturnValue({
          from: jest.fn().mockImplementation((table: string) => {
            if (table === 'visits') return makeQueryBuilder({ data: [], error: null });
            return makeQueryBuilder({ data: null, error: { message: 'update failed' } });
          }),
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: supabaseMock },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);

      await expect(service.update(1, { class: 'A' } as any))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove()', () => {
    it('resolves without error on success', async () => {
      const mock = makeSupabaseMock({ data: null, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: mock },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);

      await expect(service.remove(1)).resolves.toBeUndefined();
    });

    it('throws InternalServerErrorException on DB error', async () => {
      const mock = makeSupabaseMock({ data: null, error: { message: 'delete failed' } });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DoctorsService,
          { provide: SupabaseService, useValue: mock },
        ],
      }).compile();
      service = module.get<DoctorsService>(DoctorsService);

      await expect(service.remove(1)).rejects.toThrow(InternalServerErrorException);
    });
  });
});
