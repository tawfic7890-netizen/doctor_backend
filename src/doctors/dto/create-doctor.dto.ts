import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsIn,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  @ApiPropertyOptional({ example: 'Halba', description: 'City or town within the area' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Halba Clinic, 2nd floor' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    example: 'https://maps.app.goo.gl/XyZ123 or "34.4333,35.8333"',
    description: 'Google Maps share link or raw lat,lng — used by the trip planner to route to the exact pin.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  maps_url?: string;

  @ApiPropertyOptional({ example: '+961 6 123456' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    example: 'B',
    description: 'Doctor class — built-in: A, a, B, F; custom classes accepted (1–10 alphanumeric chars)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'class must be alphanumeric' })
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
