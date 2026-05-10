import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateDealDto {
  @IsNumber()
  doctor_id: number;

  @IsString()
  month: string; // YYYY-MM

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
