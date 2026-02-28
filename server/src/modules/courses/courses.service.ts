import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Course } from './entities/course.entity';
import { StudentCourse } from '../students/entities/student-course.entity';
import { Attendance } from '../attendances/entities/attendance.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    @InjectRepository(StudentCourse)
    private studentCoursesRepository: Repository<StudentCourse>,
    @InjectRepository(Attendance)
    private attendancesRepository: Repository<Attendance>,
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
      // 需要聚合查询该学生在该课程下的总消耗
      // 1. 先查出该课程的所有 StudentCourse 记录
      const studentCourses = await this.studentCoursesRepository.find({
          where: { course_id: courseId },
          relations: ['student', 'order'], 
      });

      // 2. 对每个学生进行聚合统计 (如果有多个 StudentCourse 记录对应同一个学生，需要合并？)
      // 通常一个学生在一个课程下可能有多个 StudentCourse (多次购买)
      // 但前端列表通常希望按“学生”维度展示，而不是按“订单”维度
      // 这里我们按 StudentCourse 维度返回，前端再根据 student_id 去重或者展示多行
      // 或者在这里直接按学生分组
      
      // 现在的需求是展示：姓名，签到的正价课时总和，签到的赠送课时总和
      // 这些数据在 order 表里：consumed_regular_courses, consumed_gift_courses
      
      const result = [];
      const studentMap = new Map<number, any>();

      for (const sc of studentCourses) {
          const studentId = sc.student_id;
          if (!studentMap.has(studentId)) {
              studentMap.set(studentId, {
                  student: sc.student,
                  total_consumed_regular: 0,
                  total_consumed_gift: 0,
                  // total_remaining: 0,
              });
          }
          const data = studentMap.get(studentId);
          if (sc.order) {
              data.total_consumed_regular += Number(sc.order.consumed_regular_courses || 0);
              data.total_consumed_gift += Number(sc.order.consumed_gift_courses || 0);
          }
          // data.total_remaining += Number(sc.remaining_courses || 0);
      }

      return Array.from(studentMap.values());
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
