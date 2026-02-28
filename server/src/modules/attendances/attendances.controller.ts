import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { Attendance } from './entities/attendance.entity';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('attendances')
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Post()
  create(@Body() createAttendanceDto: Partial<Attendance>) {
    return this.attendancesService.create(createAttendanceDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.attendancesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendancesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAttendanceDto: Partial<Attendance>) {
    return this.attendancesService.update(+id, updateAttendanceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendancesService.remove(+id);
  }
}
