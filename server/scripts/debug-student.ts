
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Student } from '../src/modules/students/entities/student.entity';
import { Order } from '../src/modules/orders/entities/order.entity';
import { Attendance } from '../src/modules/attendances/entities/attendance.entity';
import { Subject } from '../src/modules/subjects/entities/subject.entity';
import { Course } from '../src/modules/courses/entities/course.entity';
import { StudentCourse } from '../src/modules/students/entities/student-course.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/access-control/entities/role.entity';
import { Permission } from '../src/modules/access-control/entities/permission.entity';
import { ShareLink } from '../src/modules/share/entities/share-link.entity';
import { Teacher } from '../src/modules/teachers/entities/teacher.entity';

const AppDataSource = new DataSource({
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "",
  database: "vangogh_db",
  entities: [Student, Order, Attendance, Subject, Course, StudentCourse, User, Role, Permission, ShareLink, Teacher],
});

AppDataSource.initialize().then(async () => {
  const student = await AppDataSource.getRepository(Student).findOne({ where: { name: "圣健雄" } });
  if (!student) {
      console.log("Student not found");
      return;
  }
  console.log(`Student: ${student.name} (ID: ${student.id})`);

  const orders = await AppDataSource.getRepository(Order).find({ 
      where: { student_id: student.id },
      relations: ["subject"]
  });
  
  console.log("\nOrders:");
  orders.forEach(o => {
      if (o.subject?.name === '水彩') {
          console.log(`ID: ${o.id}, No: ${o.order_no}, Status: ${o.status}, Type: ${o.order_type}, Subject: ${o.subject?.name}`);
          console.log(`  Regular: ${o.regular_courses} (Consumed: ${o.consumed_regular_courses})`);
          console.log(`  Gift: ${o.gift_courses} (Consumed: ${o.consumed_gift_courses})`);
          console.log(`  Expire: ${o.expire_date}`);
      }
  });

  const attendances = await AppDataSource.getRepository(Attendance).find({
      where: { student_id: student.id },
      relations: ["course", "course.subject"]
  });
  
  console.log("\nAttendances (Watercolor):");
  let totalDeducted = 0;
  attendances.forEach(a => {
      if (a.course?.subject?.name === '水彩') {
          console.log(`ID: ${a.id}, Date: ${a.attendance_date}, Status: ${a.status}, Deducted: ${a.hours_deducted}`);
          totalDeducted += Number(a.hours_deducted || 0);
      }
  });
  console.log(`Total Deducted (Calculated from Attendance): ${totalDeducted}`);

  process.exit(0);
}).catch(error => console.log(error));
