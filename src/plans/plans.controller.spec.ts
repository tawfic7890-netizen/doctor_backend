import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService, Plan } from './plans.service';

const mockService = {
  getWeekPlans: jest.fn(),
  getAllPlans:   jest.fn(),
  getPlan:       jest.fn(),
  setPlan:       jest.fn(),
};

describe('PlansController', () => {
  let controller: PlansController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlansController],
      providers: [{ provide: PlansService, useValue: mockService }],
    }).compile();
    controller = module.get<PlansController>(PlansController);
  });

  // ── GET /plans/week ─────────────────────────────────────────────────────────

  describe('getWeekPlans()', () => {

    it('calls service.getWeekPlans without a date and returns result', async () => {
      const plans: Plan[] = [{ day: '2026-04-13', doctor_ids: [1] }];
      mockService.getWeekPlans.mockResolvedValue(plans);

      const result = await controller.getWeekPlans();
      expect(mockService.getWeekPlans).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(plans);
    });

    it('passes date query param to service', async () => {
      mockService.getWeekPlans.mockResolvedValue([]);
      await controller.getWeekPlans('2026-04-14');
      expect(mockService.getWeekPlans).toHaveBeenCalledWith('2026-04-14');
    });
  });

  // ── GET /plans ──────────────────────────────────────────────────────────────

  describe('getAllPlans()', () => {

    it('returns all plans from service', async () => {
      const plans: Plan[] = [
        { day: '2026-04-14', doctor_ids: [1, 2] },
        { day: '2026-04-15', doctor_ids: [3] },
      ];
      mockService.getAllPlans.mockResolvedValue(plans);

      const result = await controller.getAllPlans();
      expect(mockService.getAllPlans).toHaveBeenCalled();
      expect(result).toEqual(plans);
    });

    it('returns empty array when no plans saved', async () => {
      mockService.getAllPlans.mockResolvedValue([]);
      expect(await controller.getAllPlans()).toEqual([]);
    });
  });

  // ── GET /plans/:date ────────────────────────────────────────────────────────

  describe('getPlan()', () => {

    it('returns the plan for the given date', async () => {
      const plan: Plan = { day: '2026-04-18', doctor_ids: [5, 6] };
      mockService.getPlan.mockResolvedValue(plan);

      const result = await controller.getPlan('2026-04-18');
      expect(mockService.getPlan).toHaveBeenCalledWith('2026-04-18');
      expect(result).toEqual(plan);
    });

    it('returns empty plan when date has no saved plan', async () => {
      mockService.getPlan.mockResolvedValue({ day: '2026-04-18', doctor_ids: [] });
      const result = await controller.getPlan('2026-04-18');
      expect(result.doctor_ids).toEqual([]);
    });

    it('propagates errors from service', async () => {
      mockService.getPlan.mockRejectedValue(new InternalServerErrorException('failed'));
      await expect(controller.getPlan('2026-04-18')).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── PUT /plans/:date ────────────────────────────────────────────────────────

  describe('setPlan()', () => {

    it('calls service.setPlan with date and doctorIds', async () => {
      const plan: Plan = { day: '2026-04-18', doctor_ids: [1, 2, 3] };
      mockService.setPlan.mockResolvedValue(plan);

      const result = await controller.setPlan('2026-04-18', { doctorIds: [1, 2, 3] });
      expect(mockService.setPlan).toHaveBeenCalledWith('2026-04-18', [1, 2, 3]);
      expect(result).toEqual(plan);
    });

    it('saves an empty plan (no doctors)', async () => {
      const plan: Plan = { day: '2026-04-18', doctor_ids: [] };
      mockService.setPlan.mockResolvedValue(plan);

      const result = await controller.setPlan('2026-04-18', { doctorIds: [] });
      expect(mockService.setPlan).toHaveBeenCalledWith('2026-04-18', []);
      expect(result.doctor_ids).toEqual([]);
    });

    it('propagates errors from service', async () => {
      mockService.setPlan.mockRejectedValue(new InternalServerErrorException('upsert failed'));
      await expect(controller.setPlan('2026-04-18', { doctorIds: [1] }))
        .rejects.toThrow(InternalServerErrorException);
    });
  });
});
