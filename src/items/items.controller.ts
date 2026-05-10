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
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AssignItemDto, UpdateAssignmentStatusDto } from './dto/assign-item.dto';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  // ─── Assignments (static paths MUST come before :id) ────────────────────────

  @Get('assignments/list')
  getAssignments(
    @Query('plan_date') planDate?: string,
    @Query('doctor_id') doctorId?: string,
    @Query('item_id') itemId?: string,
  ) {
    return this.itemsService.getAssignments({
      plan_date: planDate,
      doctor_id: doctorId ? +doctorId : undefined,
      item_id: itemId ? +itemId : undefined,
    });
  }

  @Post('assignments')
  assign(@Body() dto: AssignItemDto) {
    return this.itemsService.assign(dto);
  }

  @Patch('assignments/:id')
  updateAssignmentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssignmentStatusDto,
  ) {
    return this.itemsService.updateAssignmentStatus(id, dto.status);
  }

  @Delete('assignments/:id')
  removeAssignment(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.removeAssignment(id);
  }

  // ─── Items CRUD ─────────────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.itemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.remove(id);
  }
}
