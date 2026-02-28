import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, MoreThan } from 'typeorm';
import { Student } from './entities/student.entity';
import { StudentCourse } from './entities/student-course.entity';
import { Order } from '../orders/entities/order.entity';
import { Attendance } from '../attendances/entities/attendance.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(StudentCourse)
    private studentCoursesRepository: Repository<StudentCourse>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  async create(createStudentDto: Partial<Student>) {
    const existing = await this.studentsRepository.findOne({ where: { name: createStudentDto.name } });
    if (existing) {
      throw new BadRequestException('Student name already exists');
    }
    const student = this.studentsRepository.create(createStudentDto);
    return this.studentsRepository.save(student);
  }

  async findAll(params?: any) {
    const { includeDeleted, ...query } = params || {};
    const where: any = {};
    
    if (query.name) where.name = Like(`%${query.name}%`);
    if (query.nickname) where.nickname = Like(`%${query.nickname}%`);
    if (query.gender) where.gender = query.gender;
    if (query.id_card) where.id_card = Like(`%${query.id_card}%`);
    if (query.emergency_contact) where.emergency_contact = Like(`%${query.emergency_contact}%`);
    if (query.emergency_phone) where.emergency_phone = Like(`%${query.emergency_phone}%`);
    if (query.status) where.status = query.status;

    return this.studentsRepository.find({
      where,
      withDeleted: includeDeleted === 'true' || includeDeleted === true,
    });
  }

  findOne(id: number) {
    return this.studentsRepository.findOne({ where: { id } });
  }

  async update(id: number, updateStudentDto: Partial<Student>) {
    if (updateStudentDto.name) {
      const existing = await this.studentsRepository.findOne({
        where: { name: updateStudentDto.name, id: Not(id) },
      });
      if (existing) {
        throw new BadRequestException('Student name already exists');
      }
    }
    return this.studentsRepository.update(id, updateStudentDto);
  }

  remove(id: number) {
    return this.studentsRepository.softDelete(id);
  }

  restore(id: number) {
    return this.studentsRepository.restore(id);
  }

  async getStudentCourses(studentId: number) {
    return this.studentCoursesRepository.find({
      where: { student_id: studentId },
      relations: ['course', 'course.subject', 'order'], // 加载 order 以获取正价/赠送课时
    });
  }

  async getStudentSubjectStats(studentId: number) {
      // 1. 获取该学生所有未过期的、有效的子订单 (关联了课程和科目)
      const validOrders = await this.orderRepository.createQueryBuilder('order')
          .leftJoinAndSelect('order.subject', 'subject')
          .where('order.student_id = :studentId', { studentId })
          .andWhere('order.parent_id IS NOT NULL') // 只查子订单
          .andWhere('order.status != :cancelled', { cancelled: 'cancelled' }) // 排除已取消
          .andWhere('(order.expire_date IS NULL OR order.expire_date > :now)', { now: new Date() }) // 排除过期
          .getMany();

      // 2. 获取该学生所有的签到记录 (已出勤)
      const attendances = await this.attendanceRepository.createQueryBuilder('attendance')
          .leftJoinAndSelect('attendance.course', 'course')
          .leftJoinAndSelect('course.subject', 'subject')
          .where('attendance.student_id = :studentId', { studentId })
          .andWhere('attendance.status = :present', { present: 'present' })
          .getMany();

      // 3. 按科目汇总
      const stats: Record<string, any> = {};

      // 统计订单 (正价/赠送)
      validOrders.forEach(order => {
          const subjectName = order.subject?.name || '未知科目';
          if (!stats[subjectName]) {
              stats[subjectName] = { totalRegular: 0, totalGift: 0, consumed: 0 };
          }
          stats[subjectName].totalRegular += Number(order.regular_courses || 0);
          stats[subjectName].totalGift += Number(order.gift_courses || 0);
      });

      // 统计消耗 (假设每次签到消耗 1 课时，如果有特殊逻辑需调整)
      attendances.forEach(attendance => {
          const subjectName = attendance.course?.subject?.name || '未知科目';
          // 注意：这里统计的是该科目下的总消耗，包括过期订单产生的消耗
          // 如果只要统计"当前有效订单"对应的消耗，逻辑会非常复杂(需要追踪每次签到扣减的是哪个订单)
          // 现在的需求是：消耗课时 = 该科目下的签到总数
          if (!stats[subjectName]) {
              stats[subjectName] = { totalRegular: 0, totalGift: 0, consumed: 0 };
          }
          stats[subjectName].consumed += 1;
      });

      // 计算剩余
      Object.keys(stats).forEach(key => {
          const item = stats[key];
          item.remaining = (item.totalRegular + item.totalGift) - item.consumed;
      });

      return stats;
  }
}
