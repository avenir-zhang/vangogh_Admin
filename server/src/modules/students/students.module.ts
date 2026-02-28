import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { Student } from './entities/student.entity';
import { StudentCourse } from './entities/student-course.entity';
import { Order } from '../orders/entities/order.entity';
import { Attendance } from '../attendances/entities/attendance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, StudentCourse, Order, Attendance])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
