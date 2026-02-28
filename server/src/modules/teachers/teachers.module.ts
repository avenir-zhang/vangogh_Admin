import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { Teacher } from './entities/teacher.entity';
import { Subject } from '../subjects/entities/subject.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Teacher, Subject])],
  controllers: [TeachersController],
  providers: [TeachersService],
})
export class TeachersModule {}
