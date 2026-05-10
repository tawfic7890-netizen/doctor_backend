import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { SetBudgetDto } from './dto/set-budget.dto';
import { CreateDealDto } from './dto/create-deal.dto';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  /** GET /budgets/summary?month=YYYY-MM */
  @Get('summary')
  getSummary(@Query('month') month: string) {
    return this.budgetsService.getSummary(month);
  }

  /** GET /budgets?month=YYYY-MM — get budget for a month */
  @Get()
  getBudget(@Query('month') month: string) {
    return this.budgetsService.getBudget(month);
  }

  /** POST /budgets — set or update monthly budget */
  @Post()
  setBudget(@Body() dto: SetBudgetDto) {
    return this.budgetsService.setBudget(dto.month, dto.budget);
  }

  /** GET /budgets/deals?month=YYYY-MM — get all deals for a month */
  @Get('deals')
  getDeals(@Query('month') month: string) {
    return this.budgetsService.getDeals(month);
  }

  /** POST /budgets/deals — create a deal for a doctor */
  @Post('deals')
  createDeal(@Body() dto: CreateDealDto) {
    return this.budgetsService.createDeal(dto);
  }

  /** DELETE /budgets/deals/:id — remove a deal */
  @Delete('deals/:id')
  removeDeal(@Param('id', ParseIntPipe) id: number) {
    return this.budgetsService.removeDeal(id);
  }
}
