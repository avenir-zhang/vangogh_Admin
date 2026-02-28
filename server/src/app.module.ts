import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
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
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'vangogh_db',
      entities: [User, Student, Teacher, Subject, Course, Order, Attendance, StudentCourse],
      synchronize: true,
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
