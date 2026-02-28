import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course } from './entities/course.entity';
import { StudentCourse } from '../students/entities/student-course.entity';
import { Attendance } from '../attendances/entities/attendance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, StudentCourse, Attendance])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
