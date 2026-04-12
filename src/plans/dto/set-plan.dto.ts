import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPlanDto {
  @ApiProperty({ type: [Number], example: [1, 5, 42] })
  @IsArray()
  @IsInt({ each: true })
  doctorIds: number[];
}
