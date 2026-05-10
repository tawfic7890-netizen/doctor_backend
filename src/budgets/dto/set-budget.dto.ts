import { IsNumber, IsString } from 'class-validator';

export class SetBudgetDto {
  @IsString()
  month: string; // YYYY-MM

  @IsNumber()
  budget: number;
}
