import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  findAll(
    @Query('area') area?: string,
    @Query('status') status?: string,
    @Query('day') day?: string,
    @Query('search') search?: string,
    @Query('hideF') hideF?: string,
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.doctorsService.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.doctorsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.remove(id);
  }
}
