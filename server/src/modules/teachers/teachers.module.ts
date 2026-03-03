import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { Teacher } from './entities/teacher.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { UsersModule } from '../users/users.module';
import { AccessControlModule } from '../access-control/access-control.module';

@Module({
  imports: [
      TypeOrmModule.forFeature([Teacher, Subject]),
      UsersModule,
      AccessControlModule,
  ],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
