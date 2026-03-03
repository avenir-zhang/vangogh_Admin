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
      // 1. 获取该学生所有有效的子订单 (Active + Completed + Transferred)
      // 修改：包含 COMPLETED 和 TRANSFERRED，因为它们可能贡献了历史购买（对于已完成的订单）或历史消耗抵消（对于转让的订单）
      const activeOrders = await this.orderRepository.createQueryBuilder('order')
          .leftJoinAndSelect('order.subject', 'subject')
          .where('order.student_id = :studentId', { studentId })
          .andWhere('order.parent_id IS NOT NULL') // 只查子订单
          .andWhere('order.status IN (:...statuses)', { statuses: ['active', 'completed', 'transferred'] }) // 排除已取消 (cancelled)
          .orderBy('order.created_at', 'DESC')
          .getMany();

      // 2. 获取该学生的所有签到记录 (Attendances)
      const attendances = await this.attendanceRepository.createQueryBuilder('attendance')
          .leftJoinAndSelect('attendance.course', 'course')
          .leftJoinAndSelect('course.subject', 'subject')
          .where('attendance.student_id = :studentId', { studentId })
          .getMany();

      // 3. 按科目汇总
      const stats: Record<string, any> = {};
      const now = new Date();

      // 初始化科目统计 (从 activeOrders)
      for (const order of activeOrders) {
          const subjectName = order.subject?.name || '未知科目';
          
          if (!stats[subjectName]) {
              stats[subjectName] = {
                  subjectId: order.subject?.id,
                  totalRegular: 0,
                  totalGift: 0,
                  consumed: 0,
                  remaining: 0,
                  orders: []
              };
          }

          // 只有未过期的订单才参与购买统计
          const isExpired = order.expire_date && new Date(order.expire_date) < now;

          if (!isExpired) {
              stats[subjectName].totalRegular += Number(order.regular_courses || 0);
              stats[subjectName].totalGift += Number(order.gift_courses || 0);
          }
          
          stats[subjectName].orders.push(order);
      }

      // 4. 计算消耗 (从签到记录)
      for (const att of attendances) {
          const subjectName = att.course?.subject?.name || '未知科目';
          
          // 如果这个科目在 stats 里不存在（意味着没有有效订单，比如全退费了），我们需要初始化它
          // 但是按照需求“作废的订单不应该显示”，如果一个科目下只有作废订单，那么 stats[subjectName] 不会被初始化。
          // 此时如果还有签到记录（可能是作废前签的），是否要显示？
          // 通常如果还有签到记录，说明曾经上过课，显示出来比较合理，否则签到记录就“消失”了。
          // 但如果用户坚持“不显示作废订单相关的课程”，那可能意味着如果一个科目所有订单都作废了，这个科目就不该出现在列表里。
          // 不过，签到记录是真实发生的，如果隐去了科目，那这些消耗去哪了？
          // 这里的折中方案：如果 stats[subjectName] 不存在，说明没有 active 订单。
          // 我们可以选择：
          // A. 依然显示（为了展示消耗），但不显示订单详情。
          // B. 完全不显示（可能导致消耗对不上）。
          
          // 假设需求是“不显示作废的订单”，而不是“不显示有消耗但无有效订单的科目”。
          // 所以我们还是初始化它，但在 orders 列表里不会有作废的订单。
          if (!stats[subjectName]) {
              stats[subjectName] = {
                  subjectId: att.course?.subject?.id,
                  totalRegular: 0,
                  totalGift: 0,
                  consumed: 0,
                  remaining: 0,
                  orders: []
              };
          }

          const hours = Number(att.hours_deducted || 0);
          stats[subjectName].consumed += hours;
      }

      // 5. 计算剩余
      Object.keys(stats).forEach(key => {
          const item = stats[key];
          // 剩余 = 总购买（有效且未过期） - 总消耗
          item.remaining = item.totalRegular + item.totalGift - item.consumed;
      });

      return stats;
  }
}
