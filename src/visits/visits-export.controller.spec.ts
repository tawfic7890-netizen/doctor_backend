import { Test, TestingModule } from '@nestjs/testing';
import { VisitsExportController } from './visits-export.controller';
import { VisitsService } from './visits.service';

const mockService = { exportCsv: jest.fn() };

function makeMockRes() {
  const res: any = {
    setHeader: jest.fn(),
    send:      jest.fn(),
  };
  return res;
}

describe('VisitsExportController', () => {
  let controller: VisitsExportController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitsExportController],
      providers: [{ provide: VisitsService, useValue: mockService }],
    }).compile();
    controller = module.get<VisitsExportController>(VisitsExportController);
  });

  // ── GET /visits/export ──────────────────────────────────────────────────────

  describe('exportCsv()', () => {

    it('sends CSV with Content-Type text/csv', async () => {
      mockService.exportCsv.mockResolvedValue('Date,Day,Doctor\r\n');
      const res = makeMockRes();

      await controller.exportCsv(undefined, undefined, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.send).toHaveBeenCalledWith('Date,Day,Doctor\r\n');
    });

    it('uses "visits-all.csv" filename when no params given', async () => {
      mockService.exportCsv.mockResolvedValue('');
      const res = makeMockRes();
      await controller.exportCsv(undefined, undefined, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition', 'attachment; filename="visits-all.csv"',
      );
    });

    it('uses "visits-YYYY-MM-DD.csv" filename when date param given', async () => {
      mockService.exportCsv.mockResolvedValue('');
      const res = makeMockRes();
      await controller.exportCsv('2026-04-18', undefined, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition', 'attachment; filename="visits-2026-04-18.csv"',
      );
    });

    it('uses "visits-YYYY-MM.csv" filename when month param given', async () => {
      mockService.exportCsv.mockResolvedValue('');
      const res = makeMockRes();
      await controller.exportCsv(undefined, '2026-04', res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition', 'attachment; filename="visits-2026-04.csv"',
      );
    });

    it('passes date param to service.exportCsv', async () => {
      mockService.exportCsv.mockResolvedValue('');
      await controller.exportCsv('2026-04-18', undefined, makeMockRes());
      expect(mockService.exportCsv).toHaveBeenCalledWith(undefined, '2026-04-18');
    });

    it('passes month param to service.exportCsv', async () => {
      mockService.exportCsv.mockResolvedValue('');
      await controller.exportCsv(undefined, '2026-04', makeMockRes());
      expect(mockService.exportCsv).toHaveBeenCalledWith('2026-04', undefined);
    });

    it('date param takes priority over month param for filename', async () => {
      mockService.exportCsv.mockResolvedValue('');
      const res = makeMockRes();
      await controller.exportCsv('2026-04-18', '2026-04', res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition', 'attachment; filename="visits-2026-04-18.csv"',
      );
    });
  });
});
