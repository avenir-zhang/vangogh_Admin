import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Course } from './entities/course.entity';
import { StudentCourse } from '../students/entities/student-course.entity';
import { Attendance } from '../attendances/entities/attendance.entity';
import { Student } from '../students/entities/student.entity';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    @InjectRepository(StudentCourse)
    private studentCoursesRepository: Repository<StudentCourse>,
    @InjectRepository(Attendance)
    private attendancesRepository: Repository<Attendance>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  create(createCourseDto: Partial<Course>) {
    if (createCourseDto.schedule_days && Array.isArray(createCourseDto.schedule_days)) {
        createCourseDto.schedule_days = (createCourseDto.schedule_days as string[]).join(',');
    }
    const course = this.coursesRepository.create(createCourseDto);
    return this.coursesRepository.save(course);
  }

  findAll(start_date?: string, end_date?: string) {
    if (start_date && end_date) {
      // 查询所有在时间范围内有效的课程
      // 课程开始时间 <= 查询结束时间 AND 课程结束时间 >= 查询开始时间
      return this.coursesRepository.createQueryBuilder('course')
        .leftJoinAndSelect('course.subject', 'subject')
        .leftJoinAndSelect('course.teacher', 'teacher')
        .where('course.start_date <= :end_date', { end_date })
        .andWhere('course.end_date >= :start_date', { start_date })
        .getMany();
    }
    return this.coursesRepository.find({ relations: ['subject', 'teacher'] });
  }

  findOne(id: number) {
    return this.coursesRepository.findOne({ where: { id }, relations: ['subject', 'teacher'] });
  }

  async findCourseStudents(courseId: number) {
      // 获取该课程信息
      const course = await this.coursesRepository.findOne({ where: { id: courseId } });
      if (!course) {
          throw new Error('Course not found');
      }

      // 1. 获取该课程的所有 StudentCourse 记录（花名册）
      const studentCourses = await this.studentCoursesRepository.find({
          where: { course_id: courseId },
          relations: ['student'],
      });

      // 更新课程的当前人数 (current_students)
      // 每次查询时更新，确保数据一致性
      if (course.current_students !== studentCourses.length) {
          course.current_students = studentCourses.length;
          await this.coursesRepository.save(course);
      }

      if (studentCourses.length === 0) {
          return [];
      }

      const studentIds = studentCourses.map(sc => sc.student_id);

      // 2. 查找在该课程的所有签到记录，用于计算已消耗课时（本课程消耗）
      const courseAttendances = await this.attendancesRepository.createQueryBuilder('attendance')
          .select(['attendance.student_id', 'attendance.hours_deducted'])
          .where('attendance.course_id = :courseId', { courseId })
          .andWhere('attendance.student_id IN (:...studentIds)', { studentIds })
          .getMany();

      // 3. 计算所有学员在该科目下的剩余课时（动态计算：总购买 - 总消耗）
      // 3.1 获取所有有效订单的总购买课时 (Active Orders)
      const purchasedRaw = await this.orderRepository.createQueryBuilder('order')
          .select('order.student_id', 'student_id')
          .addSelect('SUM(order.regular_courses + order.gift_courses)', 'total_purchased')
          .where('order.subject_id = :subjectId', { subjectId: course.subject_id })
          .andWhere('order.student_id IN (:...studentIds)', { studentIds })
          .andWhere('order.status = :status', { status: 'active' })
          .groupBy('order.student_id')
          .getRawMany();
      
      const purchasedMap = new Map<number, number>();
      purchasedRaw.forEach(item => {
          purchasedMap.set(Number(item.student_id), Number(item.total_purchased));
      });

      // 3.2 获取该科目下的总消耗课时 (All Attendances for this Subject)
      const consumedRaw = await this.attendancesRepository.createQueryBuilder('attendance')
          .leftJoin('attendance.course', 'course')
          .select('attendance.student_id', 'student_id')
          .addSelect('SUM(attendance.hours_deducted)', 'total_consumed')
          .where('course.subject_id = :subjectId', { subjectId: course.subject_id })
          .andWhere('attendance.student_id IN (:...studentIds)', { studentIds })
          .groupBy('attendance.student_id')
          .getRawMany();

      const consumedMap = new Map<number, number>();
      consumedRaw.forEach(item => {
          consumedMap.set(Number(item.student_id), Number(item.total_consumed));
      });

      // 4. 聚合结果
      const result = studentCourses.map(sc => {
          // 计算该学员在该课程的总消耗
          const studentCourseAttendances = courseAttendances.filter(a => a.student_id === sc.student_id);
          const consumedInCourse = studentCourseAttendances.reduce((sum, a) => sum + Number(a.hours_deducted || 0), 0);

          // 计算剩余课时
          const totalPurchased = purchasedMap.get(sc.student_id) || 0;
          const totalConsumed = consumedMap.get(sc.student_id) || 0;
          const remaining = totalPurchased - totalConsumed;

          return {
              student: sc.student,
              total_consumed: consumedInCourse, // 展示本课程消耗
              remaining_courses: remaining, // 展示科目总剩余 (动态计算)
          };
      });
      
      return result;
  }

  async findAvailableStudents(courseId: number) {
      // 查找可以加入该课程的学员（购买了该科目，且尚未加入该课程）
      const course = await this.coursesRepository.findOne({ where: { id: courseId } });
      if (!course) {
          throw new Error('Course not found');
      }

      // 1. 找出所有购买了该科目的学员 (通过订单)
      // 只要有该科目的有效订单（未过期、有剩余课时）
      // 注意：这里需要检查订单是否有剩余课时（正价或赠送），而不仅仅是 expire_date
      const validOrders = await this.orderRepository.createQueryBuilder('order')
          .select('DISTINCT order.student_id', 'student_id')
          .where('order.subject_id = :subjectId', { subjectId: course.subject_id })
          .andWhere('order.status != :cancelled', { cancelled: 'cancelled' })
          .andWhere('(order.expire_date IS NULL OR order.expire_date > :now)', { now: new Date() })
          .getRawMany();
      
      console.log('Valid orders found:', validOrders);
      
      const potentialStudentIds = validOrders.map(o => o.student_id);
      
      if (potentialStudentIds.length === 0) {
          return [];
      }

      // 2. 排除已经加入该课程的学员
      const existingStudentCourses = await this.studentCoursesRepository.find({
          where: { course_id: courseId },
          select: ['student_id']
      });
      const existingStudentIds = new Set(existingStudentCourses.map(sc => sc.student_id));
      
      const availableStudentIds = potentialStudentIds.filter(id => !existingStudentIds.has(id));
      
      if (availableStudentIds.length === 0) {
          return [];
      }

      return this.studentsRepository.findByIds(availableStudentIds);
  }

  async addStudentToCourse(courseId: number, studentId: number) {
      // 手动将学员加入课程（创建 StudentCourse 记录）
      // 检查是否已存在
      const existing = await this.studentCoursesRepository.findOne({
          where: { course_id: courseId, student_id: studentId }
      });
      if (existing) {
          return existing;
      }
      
      const studentCourse = new StudentCourse();
      studentCourse.course_id = courseId;
      studentCourse.student_id = studentId;
      // studentCourse.order_id = 0; // No longer bound to a specific order
      studentCourse.remaining_courses = 0; // This field might be deprecated or calculated dynamically
      // 或者我们可以把该学员在该科目下的总剩余课时填进去？
      // 为了保持兼容，暂时填0，或者后续逻辑不再依赖这个字段
      
      const result = await this.studentCoursesRepository.save(studentCourse);

      // 更新课程当前人数
      const count = await this.studentCoursesRepository.count({ where: { course_id: courseId } });
      await this.coursesRepository.update(courseId, { current_students: count });

      return result;
  }

  async removeStudentFromCourse(courseId: number, studentId: number) {
      const result = await this.studentCoursesRepository.delete({ course_id: courseId, student_id: studentId });
      
      // 更新课程当前人数
      const count = await this.studentCoursesRepository.count({ where: { course_id: courseId } });
      await this.coursesRepository.update(courseId, { current_students: count });

      return result;
  }

  async findCourseAttendances(courseId: number) {
      return this.attendancesRepository.find({
          where: { course_id: courseId },
          relations: ['student', 'teacher'],
          order: { attendance_date: 'DESC' }
      });
  }

  update(id: number, updateCourseDto: Partial<Course>) {
    if (updateCourseDto.schedule_days && Array.isArray(updateCourseDto.schedule_days)) {
        updateCourseDto.schedule_days = (updateCourseDto.schedule_days as string[]).join(',');
    }
    return this.coursesRepository.update(id, updateCourseDto);
  }

  remove(id: number) {
    return this.coursesRepository.delete(id);
  }
}
