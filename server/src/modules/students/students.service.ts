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
      // 1. 获取该学生所有有效的子订单 (Active Status)
      const validOrders = await this.orderRepository.createQueryBuilder('order')
          .leftJoinAndSelect('order.subject', 'subject')
          .where('order.student_id = :studentId', { studentId })
          .andWhere('order.parent_id IS NOT NULL') // 只查子订单
          .andWhere('order.status = :status', { status: 'active' }) // 排除已取消 (cancelled)
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

      // 初始化科目统计 (从订单)
      validOrders.forEach(order => {
          const subjectName = order.subject?.name || '未知科目';
          const subjectId = order.subject?.id;
          
          if (!stats[subjectName]) {
              stats[subjectName] = { 
                  subjectId: subjectId,
                  totalRegular: 0, 
                  totalGift: 0, 
                  consumed: 0, 
                  remaining: 0, 
                  orders: [] 
              };
          }
          
          // 只有未过期的订单才参与购买统计
          // (如果过期了，是否应该算在购买里？通常过期就不算了，或者单独展示)
          // 现有的逻辑似乎是：只要 active 且未过期，就算有效购买
          const isExpired = order.expire_date && new Date(order.expire_date) < now;

          if (!isExpired) {
              const regular = Number(order.regular_courses || 0);
              const gift = Number(order.gift_courses || 0);
              stats[subjectName].totalRegular += regular;
              stats[subjectName].totalGift += gift;
          }
          
          stats[subjectName].orders.push(order);
      });

      // 计算消耗 (从签到记录)
      // 注意：签到记录可能属于某个科目，但没有对应的有效订单（比如订单已取消或已过期，但课已经上了）
      // 这种情况下，我们需要确保这个科目出现在 stats 里
      attendances.forEach(att => {
          const subjectName = att.course?.subject?.name || '未知科目';
          // 如果这个科目在 stats 里不存在（意味着没有有效订单，比如全退费了），我们需要初始化它
          if (!stats[subjectName]) {
             stats[subjectName] = { 
                  subjectId: att.course?.subject?.id,
                  totalRegular: 0, 
                  totalGift: 0, 
                  consumed: 0, 
                  remaining: 0, 
                  orders: [] // 可能为空，或者我们需要去查一下已取消的订单？暂时留空
              }; 
          }

          const hours = Number(att.hours_deducted || 0);
          stats[subjectName].consumed += hours;
      });

      // 计算剩余
      Object.keys(stats).forEach(key => {
          const item = stats[key];
          item.remaining = item.totalRegular + item.totalGift - item.consumed;
      });
      
      // 如果需要把那些“没有有效订单但有签到记录”的科目的订单也查出来展示（比如已取消的订单），
      // 我们可能需要放宽第一步的查询条件，或者分两步查。
      // 当前逻辑：validOrders 只查 active。
      // 如果用户想看已取消订单，可以在前端单独请求订单列表。
      // 但为了让 stats[subjectName].orders 不为空（方便查看历史），我们可以单独再查一次关联订单？
      // 或者第一步查询时就不限制 status='active'，而在遍历时区分？
      
      // 修正策略：第一步查询所有子订单（包括 cancelled），但在计算 totalRegular/totalGift 时只累加 active 且未过期的。
      const allOrders = await this.orderRepository.createQueryBuilder('order')
          .leftJoinAndSelect('order.subject', 'subject')
          .where('order.student_id = :studentId', { studentId })
          .andWhere('order.parent_id IS NOT NULL')
          .orderBy('order.created_at', 'DESC')
          .getMany();
          
      // 重新填充 orders 列表，确保包含所有订单
      allOrders.forEach(order => {
           const subjectName = order.subject?.name || '未知科目';
           // 如果 stats 里没有这个科目（说明既没有有效订单参与计算，也没有签到记录），
           // 但有历史订单（比如已取消的），我们要不要显示？
           // 应该显示，方便查看历史。
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
           // 避免重复添加（因为上面 validOrders 逻辑可能已经加过，或者我们完全重写）
           // 让我们完全重写遍历逻辑，使用 allOrders
      });

      // 重置 stats 并使用 allOrders 重新计算
      // 这样逻辑更清晰
      const newStats: Record<string, any> = {};
      
      allOrders.forEach(order => {
          const subjectName = order.subject?.name || '未知科目';
          if (!newStats[subjectName]) {
              newStats[subjectName] = { 
                  subjectId: order.subject?.id,
                  totalRegular: 0, 
                  totalGift: 0, 
                  consumed: 0, 
                  remaining: 0, 
                  orders: [] 
              };
          }
          
          const isExpired = order.expire_date && new Date(order.expire_date) < now;
          const isActive = order.status === 'active';

          if (isActive && !isExpired) {
              newStats[subjectName].totalRegular += Number(order.regular_courses || 0);
              newStats[subjectName].totalGift += Number(order.gift_courses || 0);
          }
          
          newStats[subjectName].orders.push(order);
      });

      // 叠加签到消耗
      attendances.forEach(att => {
          const subjectName = att.course?.subject?.name || '未知科目';
           if (!newStats[subjectName]) {
              newStats[subjectName] = { 
                  subjectId: att.course?.subject?.id,
                  totalRegular: 0, 
                  totalGift: 0, 
                  consumed: 0, 
                  remaining: 0, 
                  orders: []
              };
          }
          newStats[subjectName].consumed += Number(att.hours_deducted || 0);
      });

      // 计算剩余
      Object.keys(newStats).forEach(key => {
          const item = newStats[key];
          item.remaining = item.totalRegular + item.totalGift - item.consumed;
      });

      return newStats;
  }
}
