import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './modules/users/entities/user.entity';
import { Student } from './modules/students/entities/student.entity';
import { Teacher } from './modules/teachers/entities/teacher.entity';
import { Subject } from './modules/subjects/entities/subject.entity';
import { Course } from './modules/courses/entities/course.entity';
import { Order } from './modules/orders/entities/order.entity';
import { Attendance } from './modules/attendances/entities/attendance.entity';
import { StudentCourse } from './modules/students/entities/student-course.entity';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { CoursesModule } from './modules/courses/courses.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.ENV_FILE || '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_DATABASE', 'vangogh_db'),
        entities: [User, Student, Teacher, Subject, Course, Order, Attendance, StudentCourse],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    StudentsModule,
    TeachersModule,
    SubjectsModule,
    CoursesModule,
    OrdersModule,
    AttendancesModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
