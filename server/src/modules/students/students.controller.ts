import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { StudentsService } from './students.service';
import { Student } from './entities/student.entity';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() createStudentDto: Partial<Student>) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.studentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudentDto: Partial<Student>) {
    return this.studentsService.update(+id, updateStudentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(+id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.studentsService.restore(+id);
  }

  @Get(':id/courses')
  getStudentCourses(@Param('id') id: string) {
    return this.studentsService.getStudentCourses(+id);
  }

  @Get(':id/subject-stats')
  getStudentSubjectStats(@Param('id') id: string) {
      return this.studentsService.getStudentSubjectStats(+id);
  }
}
