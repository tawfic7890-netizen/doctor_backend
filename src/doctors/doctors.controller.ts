import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, ParseIntPipe,
  HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

@ApiTags('doctors')
@Controller('doctors')
export class DoctorsController {
  private readonly logger = new Logger(DoctorsController.name);

  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'List doctors with optional filters' })
  @ApiQuery({ name: 'area',   required: false })
  @ApiQuery({ name: 'status', required: false, description: 'Comma-separated statuses' })
  @ApiQuery({ name: 'day',    required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'hideF',  required: false, type: Boolean })
  findAll(
    @Query('area')   area?: string,
    @Query('status') status?: string,
    @Query('day')    day?: string,
    @Query('search') search?: string,
    @Query('hideF')  hideF?: string,
  ) {
    return this.doctorsService.findAll({
      area,
      status,
      day,
      search,
      hideF: hideF !== 'false',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single doctor by ID' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new doctor' })
  @ApiResponse({ status: 201, description: 'Doctor created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateDoctorDto) {
    this.logger.log(`Creating doctor: ${dto.name}`);
    return this.doctorsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a doctor' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorDto,
  ) {
    this.logger.log(`Updating doctor #${id}`);
    return this.doctorsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a doctor' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Deleted' })
  remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting doctor #${id}`);
    return this.doctorsService.remove(id);
  }
}
