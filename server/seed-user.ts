
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
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: '',
  database: 'vangogh_db',
  entities: [User, Student, Teacher, Subject, Course, Order, Attendance, StudentCourse],
  synchronize: true, // Use synchronize: true to create tables
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
