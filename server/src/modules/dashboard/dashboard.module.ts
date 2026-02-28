import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Student } from '../students/entities/student.entity';
import { Order } from '../orders/entities/order.entity';
import { Attendance } from '../attendances/entities/attendance.entity';
import { Subject } from '../subjects/entities/subject.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Order, Attendance, Subject])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
