import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { StudentCourse } from '../students/entities/student-course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, StudentCourse])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
