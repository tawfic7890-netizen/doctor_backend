import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const ALLOWED_FIELDS = ['visit1', 'visit2', 'mar_visit1', 'mar_visit2', 'apr_visit1', 'apr_visit2'];

export class ClearVisitDto {
  @ApiProperty({ enum: ALLOWED_FIELDS, example: 'apr_visit1' })
  @IsString()
  @IsIn(ALLOWED_FIELDS, { message: `field must be one of: ${ALLOWED_FIELDS.join(', ')}` })
  field: string;
}
