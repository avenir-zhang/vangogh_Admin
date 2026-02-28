import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { Attendance } from './entities/attendance.entity';
import { Order } from '../orders/entities/order.entity';
import { StudentCourse } from '../students/entities/student-course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, Order, StudentCourse])],
  controllers: [AttendancesController],
  providers: [AttendancesService],
})
export class AttendancesModule {}
