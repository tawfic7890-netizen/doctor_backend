import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

const mockService = {
  getStats:   jest.fn(),
  getHistory: jest.fn(),
};

describe('StatsController', () => {
  let controller: StatsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [{ provide: StatsService, useValue: mockService }],
    }).compile();
    controller = module.get<StatsController>(StatsController);
  });

  // ── GET /stats ──────────────────────────────────────────────────────────────

  describe('getStats()', () => {

    it('returns stats from service', async () => {
      const stats = { total: 10, totalActive: 8, visitedThisMonth: 5, visitedOnce: 3, visitedTwice: 2, neverVisited: 2, needVisit: 1, byArea: [] };
      mockService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats();
      expect(mockService.getStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });

    it('propagates errors from service', async () => {
      mockService.getStats.mockRejectedValue(new InternalServerErrorException('failed'));
      await expect(controller.getStats()).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ── GET /stats/history ──────────────────────────────────────────────────────

  describe('getHistory()', () => {

    it('calls service.getHistory with default 6 months when no param given', async () => {
      mockService.getHistory.mockResolvedValue([]);
      await controller.getHistory(undefined);
      expect(mockService.getHistory).toHaveBeenCalledWith(6);
    });

    it('parses the months query param as an integer', async () => {
      mockService.getHistory.mockResolvedValue([]);
      await controller.getHistory('3');
      expect(mockService.getHistory).toHaveBeenCalledWith(3);
    });

    it('returns history array from service', async () => {
      const history = [{ month: '2026-04', label: 'Apr 2026', visited: 5, totalActive: 10, coverage: 50, isCurrent: true }];
      mockService.getHistory.mockResolvedValue(history);

      const result = await controller.getHistory('1');
      expect(result).toEqual(history);
    });

    it('propagates errors from service', async () => {
      mockService.getHistory.mockRejectedValue(new InternalServerErrorException('failed'));
      await expect(controller.getHistory('6')).rejects.toThrow(InternalServerErrorException);
    });
  });
});
