import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsController } from './doctors.controller';
import { DoctorsService, Doctor } from './doctors.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: 1,
    name: 'Dr. Test',
    specialty: 'General',
    area: 'Tripoli',
    location: 'Tripoli, Abu Samra',
    phone: '+961 6 000000',
    days: ['Mon'],
    time: '9am–1pm',
    class: 'B',
    request: null,
    note: null,
    schedules: null,
    visits: [],
    ...overrides,
  };
}

// ─── Mock DoctorsService ───────────────────────────────────────────────────────

const mockService = {
  findAll:  jest.fn(),
  findOne:  jest.fn(),
  create:   jest.fn(),
  update:   jest.fn(),
  remove:   jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DoctorsController', () => {
  let controller: DoctorsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorsController],
      providers: [{ provide: DoctorsService, useValue: mockService }],
    }).compile();

    controller = module.get<DoctorsController>(DoctorsController);
  });

  // ── GET /doctors ────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('calls service.findAll with no filters and returns result', async () => {
      const doctors = [makeDoctor(), makeDoctor({ id: 2, name: 'Dr. Two' })];
      mockService.findAll.mockResolvedValue(doctors);

      const result = await controller.findAll();
      expect(mockService.findAll).toHaveBeenCalledWith({
        area: undefined, status: undefined, day: undefined,
        search: undefined, hideF: true,
      });
      expect(result).toEqual(doctors);
    });

    it('passes area filter to service', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll('Tripoli');
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ area: 'Tripoli' }),
      );
    });

    it('passes status filter to service', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined, 'NEED_VISIT');
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'NEED_VISIT' }),
      );
    });

    it('passes day filter to service', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined, undefined, 'Mon');
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ day: 'Mon' }),
      );
    });

    it('passes search filter to service', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined, undefined, undefined, 'Ahmad');
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Ahmad' }),
      );
    });

    it('sets hideF=false when query param is "false"', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll(undefined, undefined, undefined, undefined, 'false');
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ hideF: false }),
      );
    });

    it('sets hideF=true by default (no param)', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll();
      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ hideF: true }),
      );
    });
  });

  // ── GET /doctors/:id ────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns the doctor from service', async () => {
      const doctor = makeDoctor({ id: 5 });
      mockService.findOne.mockResolvedValue(doctor);

      const result = await controller.findOne(5);
      expect(mockService.findOne).toHaveBeenCalledWith(5);
      expect(result).toEqual(doctor);
    });

    it('propagates NotFoundException from service', async () => {
      const { NotFoundException } = require('@nestjs/common');
      mockService.findOne.mockRejectedValue(new NotFoundException('Doctor 999 not found'));

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── POST /doctors ───────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls service.create with the DTO and returns result', async () => {
      const dto     = { name: 'Dr. New', area: 'Akkar', class: 'B' } as any;
      const created = makeDoctor({ id: 10, name: 'Dr. New', area: 'Akkar' });
      mockService.create.mockResolvedValue(created);

      const result = await controller.create(dto);
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });

    it('propagates errors from service', async () => {
      const { InternalServerErrorException } = require('@nestjs/common');
      mockService.create.mockRejectedValue(new InternalServerErrorException('DB error'));

      await expect(controller.create({ name: 'Fail', area: 'X' } as any))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── PATCH /doctors/:id ──────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls service.update with id + DTO and returns result', async () => {
      const dto     = { class: 'A', city: 'Halba' } as any;
      const updated = makeDoctor({ class: 'A' });
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(1, dto);
      expect(mockService.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });
  });

  // ── DELETE /doctors/:id ─────────────────────────────────────────────────────

  describe('remove()', () => {
    it('calls service.remove with the id', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove(1);
      expect(mockService.remove).toHaveBeenCalledWith(1);
    });

    it('propagates errors from service', async () => {
      const { InternalServerErrorException } = require('@nestjs/common');
      mockService.remove.mockRejectedValue(new InternalServerErrorException('delete failed'));

      await expect(controller.remove(1)).rejects.toThrow(InternalServerErrorException);
    });
  });
});
