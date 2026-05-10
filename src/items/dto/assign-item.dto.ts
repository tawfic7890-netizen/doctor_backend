import { IsNumber, IsString, IsOptional, IsIn } from 'class-validator';

export class AssignItemDto {
  @IsNumber()
  item_id: number;

  @IsNumber()
  doctor_id: number;

  @IsString()
  plan_date: string; // YYYY-MM-DD

  @IsOptional()
  @IsIn(['pending', 'done'])
  status?: string;
}

export class UpdateAssignmentStatusDto {
  @IsIn(['pending', 'done'])
  status: string;
}
