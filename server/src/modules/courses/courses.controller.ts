import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { Course } from './entities/course.entity';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  create(@Body() createCourseDto: Partial<Course>) {
    return this.coursesService.create(createCourseDto);
  }

  @Get()
  findAll(@Query('start_date') start_date?: string, @Query('end_date') end_date?: string) {
    return this.coursesService.findAll(start_date, end_date);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(+id);
  }

  @Get(':id/students')
  findCourseStudents(@Param('id') id: string) {
      return this.coursesService.findCourseStudents(+id);
  }

  @Get(':id/attendances')
  findCourseAttendances(@Param('id') id: string) {
      return this.coursesService.findCourseAttendances(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCourseDto: Partial<Course>) {
    return this.coursesService.update(+id, updateCourseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(+id);
  }
}
