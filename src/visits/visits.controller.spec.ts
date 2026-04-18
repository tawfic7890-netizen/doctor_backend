import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

const mockService = {
  recordVisit: jest.fn(),
  visitToday:  jest.fn(),
  clearVisit:  jest.fn(),
};

describe('VisitsController', () => {
  let controller: VisitsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitsController],
      providers: [{ provide: VisitsService, useValue: mockService }],
    }).compile();
    controller = module.get<VisitsController>(VisitsController);
  });

  // ── POST /doctors/:id/visit ─────────────────────────────────────────────────

  describe('recordVisit()', () => {

    it('calls service.recordVisit with id and date', async () => {
      const visit = { id: 1, doctor_id: 5, visited_at: '2026-04-18' };
      mockService.recordVisit.mockResolvedValue(visit);

      const result = await controller.recordVisit(5, { date: '2026-04-18' });
      expect(mockService.recordVisit).toHaveBeenCalledWith(5, '2026-04-18');
      expect(result).toEqual(visit);
    });

    it('propagates errors from service', async () => {
      mockService.recordVisit.mockRejectedValue(new InternalServerErrorException('failed'));
      await expect(controller.recordVisit(5, { date: '2026-04-18' }))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── POST /doctors/:id/visit-today ───────────────────────────────────────────

  describe('visitToday()', () => {

    it('calls service.visitToday with the doctor id', async () => {
      const today = new Date().toISOString().split('T')[0];
      const visit = { id: 2, doctor_id: 3, visited_at: today };
      mockService.visitToday.mockResolvedValue(visit);

      const result = await controller.visitToday(3);
      expect(mockService.visitToday).toHaveBeenCalledWith(3);
      expect(result.visited_at).toBe(today);
    });

    it('propagates errors from service', async () => {
      mockService.visitToday.mockRejectedValue(new InternalServerErrorException('failed'));
      await expect(controller.visitToday(3)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── DELETE /doctors/:id/visits/:visitId ─────────────────────────────────────

  describe('clearVisit()', () => {

    it('calls service.clearVisit with the visitId (ignores doctorId)', async () => {
      mockService.clearVisit.mockResolvedValue(undefined);
      await controller.clearVisit(1, 99);
      expect(mockService.clearVisit).toHaveBeenCalledWith(99);
    });

    it('resolves to undefined on success', async () => {
      mockService.clearVisit.mockResolvedValue(undefined);
      await expect(controller.clearVisit(1, 99)).resolves.toBeUndefined();
    });

    it('propagates errors from service', async () => {
      mockService.clearVisit.mockRejectedValue(new InternalServerErrorException('delete failed'));
      await expect(controller.clearVisit(1, 99)).rejects.toThrow(InternalServerErrorException);
    });
  });
});
