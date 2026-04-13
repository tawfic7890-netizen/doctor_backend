import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VALID_DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VALID_CLASSES = ['A', 'a', 'B', 'F'];

export class CreateDoctorDto {
  @ApiProperty({ example: 'Dr. Ahmad Khalil' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Internal Medicine' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  specialty?: string;

  @ApiProperty({ example: 'Batroun' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  area: string;

  @ApiPropertyOptional({ example: 'Halba Clinic, 2nd floor' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: '+961 6 123456' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ enum: VALID_CLASSES, example: 'B' })
  @IsString()
  @IsOptional()
  @IsIn(VALID_CLASSES)
  class?: string;

  @ApiPropertyOptional({ type: [String], enum: VALID_DAYS, example: ['Mon', 'Thu'] })
  @IsArray()
  @IsString({ each: true })
  @IsIn(VALID_DAYS, { each: true })
  @IsOptional()
  days?: string[];

  @ApiPropertyOptional({ example: '9am–1pm' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  time?: string;

  @ApiPropertyOptional({ example: 'Coversyl 5mg' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  request?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}
