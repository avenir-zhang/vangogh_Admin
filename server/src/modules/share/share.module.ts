import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShareService } from './share.service';
import { ShareController } from './share.controller';
import { ShareLink } from './entities/share-link.entity';
import { StudentsModule } from '../students/students.module';
import { AttendancesModule } from '../attendances/attendances.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShareLink]),
    StudentsModule,
    AttendancesModule,
    OrdersModule,
  ],
  controllers: [ShareController],
  providers: [ShareService],
})
export class ShareModule {}
