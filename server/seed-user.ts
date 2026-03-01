
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from './src/modules/users/entities/user.entity';
import { Student } from './src/modules/students/entities/student.entity';
import { Teacher } from './src/modules/teachers/entities/teacher.entity';
import { Subject } from './src/modules/subjects/entities/subject.entity';
import { Course } from './src/modules/courses/entities/course.entity';
import { Order } from './src/modules/orders/entities/order.entity';
import { Attendance } from './src/modules/attendances/entities/attendance.entity';
import { StudentCourse } from './src/modules/students/entities/student-course.entity';
import * as bcrypt from 'bcrypt';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'Fangaoart_100',
  database: process.env.DB_DATABASE || 'vangogh_db',
  entities: [User, Student, Teacher, Subject, Course, Order, Attendance, StudentCourse],
  synchronize: false, // Don't sync, just use existing
});

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepository = AppDataSource.getRepository(User);

    const username = 'admin';
    const password = 'admin_password'; 
    
    const existingUser = await userRepository.findOne({ where: { username } });
    if (existingUser) {
      console.log(`User ${username} already exists.`);
      await AppDataSource.destroy();
      return;
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User();
    user.username = username;
    user.password_hash = hashedPassword;
    user.role = UserRole.ADMIN;
    user.status = UserStatus.ACTIVE;

    await userRepository.save(user);

    console.log(`User created successfully!`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error seeding user:', error);
    process.exit(1);
  }
}

seed();
