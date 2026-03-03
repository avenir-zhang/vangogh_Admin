import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Student, StudentStatus } from '../students/entities/student.entity';
import { StudentCourse, StudentCourseStatus } from '../students/entities/student-course.entity';
import { Order, OrderStatus, DebtStatus } from '../orders/entities/order.entity';
import { Attendance, AttendanceStatus } from '../attendances/entities/attendance.entity';
import { Subject } from '../subjects/entities/subject.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(StudentCourse)
    private studentCoursesRepository: Repository<StudentCourse>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
  ) {}

  async getSummary() {
    const totalStudents = await this.studentRepository.count();
    
    // Active students: status = 'active'
    const activeStudents = await this.studentRepository.count({
      where: { status: StudentStatus.ACTIVE },
    });
    
    // Arrears students: 
    const arrearsStudentsCount = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.debt_status = :status', { status: DebtStatus.DEBT })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .select('COUNT(DISTINCT order.student_id)', 'count')
      .getRawOne();
      
    const arrearsStudents = parseInt(arrearsStudentsCount.count || '0', 10);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // Monthly class hours: sum of hours_deducted in this month
    const monthlyClassHoursResult = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('SUM(attendance.hours_deducted)', 'sum')
      .where('attendance.attendance_date >= :start', { start: startOfMonth })
      .andWhere('attendance.attendance_date < :end', { end: endOfMonth })
      .andWhere('attendance.status = :status', { status: AttendanceStatus.PRESENT })
      .getRawOne();

    const monthlyClassHours = parseFloat(monthlyClassHoursResult.sum || '0');

    return {
      totalStudents,
      activeStudents,
      arrearsStudents,
      monthlyClassHours,
    };
  }

  async getFinancial() {
    const startOfYear = new Date();
    startOfYear.setMonth(0, 1);
    startOfYear.setHours(0, 0, 0, 0);
    
    const endOfYear = new Date(startOfYear);
    endOfYear.setFullYear(endOfYear.getFullYear() + 1);

    const income = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.paid_fee)', 'sum')
      .where('order.created_at >= :start AND order.created_at < :end', { // 使用 >= 和 < 避免边界问题
        start: startOfYear,
        end: endOfYear,
      })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED }) // 排除已取消的订单
      .getRawOne();
      
    const yearlyIncome = parseFloat(income.sum || '0');

    // Total consumed courses (attendance count)
    const totalConsumedCourses = await this.attendanceRepository.count({
      where: {
        status: AttendanceStatus.PRESENT,
      },
    });

    // Total consumed fees (approximate based on subject price)
    const consumedFeesResult = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoin('attendance.course', 'course')
      .leftJoin('course.subject', 'subject')
      .select('SUM(subject.price)', 'sum') // 假设 subject.price 是单节课价格
      .where('attendance.status = :status', { status: AttendanceStatus.PRESENT })
      .getRawOne();

    const totalConsumedClassFees = parseFloat(consumedFeesResult.sum || '0');

    return {
      yearlyIncome,
      totalConsumedCourses,
      totalConsumedClassFees,
    };
  }

  async getAttendanceTrend() {
    // 获取过去 12 个月的签到数据（按月统计）
    const now = new Date();
    const months: Date[] = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d);
    }

    const monthlyData: any[] = [];
    for (const month of months) {
        const start = new Date(month.getFullYear(), month.getMonth(), 1);
        const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
        
        const result = await this.attendanceRepository
            .createQueryBuilder('attendance')
            .select('SUM(attendance.hours_deducted)', 'sum')
            .where('attendance.attendance_date >= :start', { start })
            .andWhere('attendance.attendance_date < :end', { end })
            .andWhere('attendance.status = :status', { status: AttendanceStatus.PRESENT })
            .getRawOne();
            
        monthlyData.push({
            date: `${month.getFullYear()}-${(month.getMonth() + 1).toString().padStart(2, '0')}`,
            value: parseFloat(result.sum || '0'),
            type: '月度消耗'
        });
    }

    return monthlyData;
  }

  async getArrearsList() {
      // 获取欠费学员名单：基于 Order 表的 debt_status
      // 我们需要返回：学员姓名、科目名称、欠费金额（或者欠费数量？）
      // 需求是“欠费数量”，对于 Order 来说可能是欠费金额 debt_amount
      
      const arrearsOrders = await this.orderRepository
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.student', 'student')
          .leftJoinAndSelect('order.subject', 'subject') // 主订单可能没有 subject
          .leftJoinAndSelect('order.children', 'children') // 子订单有 subject
          .leftJoinAndSelect('children.subject', 'childSubject')
          .where('order.debt_status = :status', { status: DebtStatus.DEBT })
          .andWhere('order.parent_id IS NULL')
          .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
          .getMany();
          
      // 整理数据
      const list = arrearsOrders.map(order => {
          // 如果是主订单，可能包含多个科目的子订单。欠费是针对主订单的。
          // 我们可以列出所有涉及的科目
          let subjectNames = order.subject?.name;
          if (!subjectNames && order.children && order.children.length > 0) {
              subjectNames = order.children.map(c => c.subject?.name).filter(Boolean).join(', ');
          }
          
          return {
              studentName: order.student?.name,
              subjectName: subjectNames || '未知科目',
              arrearsAmount: Number(order.debt_amount),
              orderNo: order.order_no
          };
      });
      
      return list;
  }

  async getExpiringList() {
      // 筛选即将续费的学员：剩余课时数量较少
      // 这需要计算每个学员在每个科目下的剩余课时
      
      const threshold = 5; // 剩余少于 5 课时
      const expiringList: any[] = [];
      
      // 1. 获取所有 Active 的 StudentCourse 记录
      const studentCourses = await this.studentCoursesRepository.find({
          where: { status: StudentCourseStatus.ACTIVE },
          relations: ['student', 'course', 'course.subject']
      });

      // 2. 按 学员+科目 分组
      const map = new Map<string, any>();
      for (const sc of studentCourses) {
          if (!sc.student || !sc.course || !sc.course.subject) continue;
          const key = `${sc.student.id}-${sc.course.subject.id}`;
          if (!map.has(key)) {
              map.set(key, {
                  student: sc.student,
                  subject: sc.course.subject,
                  studentId: sc.student.id,
                  subjectId: sc.course.subject.id
              });
          }
      }

      // 3. 遍历计算
      for (const item of map.values()) {
          // 3.1 计算总购买 (Active + Completed + Transferred 的 子订单)
          // 增加 TRANSFERRED 状态，确保已转让的订单也计入购买总量（因为它们关联的签到记录还在，需要抵消消耗）
          const { sum: boughtSum } = await this.orderRepository
              .createQueryBuilder('order')
              .select('SUM(order.regular_courses + order.gift_courses)', 'sum')
              .where('order.student_id = :studentId', { studentId: item.studentId })
              .andWhere('order.subject_id = :subjectId', { subjectId: item.subjectId })
              .andWhere('order.status IN (:...statuses)', { statuses: [OrderStatus.ACTIVE, OrderStatus.COMPLETED, OrderStatus.TRANSFERRED] })
              .andWhere('order.parent_id IS NOT NULL')
              .getRawOne();
          
          const bought = parseFloat(boughtSum || '0');

          // 3.2 计算总消耗 (Present 的 签到)
          const { sum: consumedSum } = await this.attendanceRepository
              .createQueryBuilder('attendance')
              .leftJoin('attendance.course', 'course')
              .select('SUM(attendance.hours_deducted)', 'sum')
              .where('attendance.student_id = :studentId', { studentId: item.studentId })
              .andWhere('course.subject_id = :subjectId', { subjectId: item.subjectId })
              .andWhere('attendance.status = :status', { status: AttendanceStatus.PRESENT })
              .getRawOne();

          const consumed = parseFloat(consumedSum || '0');
          const remaining = bought - consumed;

          // 3.3 判断是否即将续费 (0 <= 剩余 <= 5)
          // 并且要确保有购买记录（bought > 0）
          if (remaining >= 0 && remaining <= threshold && bought > 0) {
              expiringList.push({
                  studentName: item.student.name,
                  subjectName: item.subject.name,
                  remainingHours: remaining,
                  studentId: item.studentId 
              });
          }
      }
      
      return expiringList;
  }

  async getExceededList() {
      // 获取课时上超（剩余课时为负）的学员名单
      // 由于 StudentCourse 表中的数据可能不准确（受取消订单逻辑影响），
      // 我们改为实时计算：剩余 = 总购买(Active) - 总消耗(Present)
      
      const exceededList: any[] = [];
      
      // 1. 获取所有 Active 的 StudentCourse 记录（作为要检查的 学员-科目 对）
      const studentCourses = await this.studentCoursesRepository.find({
          where: { status: StudentCourseStatus.ACTIVE },
          relations: ['student', 'course', 'course.subject']
      });

      // 2. 按 学员+科目 分组，避免重复计算（因为一个科目可能有多个 Course，导致 StudentCourse 有多条）
      const map = new Map<string, any>();
      for (const sc of studentCourses) {
          if (!sc.student || !sc.course || !sc.course.subject) continue;
          const key = `${sc.student.id}-${sc.course.subject.id}`;
          if (!map.has(key)) {
              map.set(key, {
                  student: sc.student,
                  subject: sc.course.subject,
                  studentId: sc.student.id,
                  subjectId: sc.course.subject.id
              });
          }
      }

      // 3. 遍历计算
      for (const item of map.values()) {
          // 3.1 计算总购买 (Active + Completed + Transferred 的 子订单)
          const { sum: boughtSum } = await this.orderRepository
              .createQueryBuilder('order')
              .select('SUM(order.regular_courses + order.gift_courses)', 'sum')
              .where('order.student_id = :studentId', { studentId: item.studentId })
              .andWhere('order.subject_id = :subjectId', { subjectId: item.subjectId })
              .andWhere('order.status IN (:...statuses)', { statuses: [OrderStatus.ACTIVE, OrderStatus.COMPLETED, OrderStatus.TRANSFERRED] })
              .andWhere('order.parent_id IS NOT NULL') // 只统计子订单，因为只有子订单有 subject_id 和 课时数
              .getRawOne();
          
          const bought = parseFloat(boughtSum || '0');

          // 3.2 计算总消耗 (Present 的 签到)
          // 签到关联的是 course，我们需要找到该科目下的所有 course
          // 可以通过 join course 来筛选 subject_id
          const { sum: consumedSum } = await this.attendanceRepository
              .createQueryBuilder('attendance')
              .leftJoin('attendance.course', 'course')
              .select('SUM(attendance.hours_deducted)', 'sum')
              .where('attendance.student_id = :studentId', { studentId: item.studentId })
              .andWhere('course.subject_id = :subjectId', { subjectId: item.subjectId })
              .andWhere('attendance.status = :status', { status: AttendanceStatus.PRESENT })
              .getRawOne();

          const consumed = parseFloat(consumedSum || '0');
          const remaining = bought - consumed;

          // 3.3 判断是否超课时 (剩余 < 0)
          if (remaining < 0) {
              exceededList.push({
                  studentName: item.student.name,
                  subjectName: item.subject.name,
                  exceededHours: Math.abs(remaining), // 返回正数表示超出的量
                  remainingCourses: remaining // 原始负值
              });
          }
      }

      return exceededList;
  }

  async getTeacherStats(start_date?: string, end_date?: string, user?: any) {
    const query = this.attendanceRepository
        .createQueryBuilder('attendance')
        .leftJoin('attendance.teacher', 'teacher')
        .select('teacher.name', 'teacherName')
        .addSelect('COUNT(attendance.id)', 'count')
        .addSelect('SUM(attendance.hours_deducted)', 'hours')
        .where('attendance.status = :status', { status: AttendanceStatus.PRESENT });
        
    if (start_date) {
        query.andWhere('attendance.attendance_date >= :start', { start: start_date });
    }
    if (end_date) {
        query.andWhere('attendance.attendance_date <= :end', { end: end_date });
    }
    
    // 如果用户是老师角色，只能看自己的数据
    if (user && user.role === 'teacher' && user.teacher_id) {
        query.andWhere('attendance.teacher_id = :teacherId', { teacherId: user.teacher_id });
    }
    
    const result = await query
        .groupBy('teacher.id')
        .getRawMany();
        
    return result.map(item => ({
        teacherName: item.teacherName || '未知教师',
        count: Number(item.count),
        hours: Number(item.hours || 0)
    }));
  }

  async getSubjectStats(start_date?: string, end_date?: string) {
    const query = this.attendanceRepository
        .createQueryBuilder('attendance')
        .leftJoin('attendance.course', 'course')
        .leftJoin('course.subject', 'subject')
        .select('subject.name', 'subjectName')
        .addSelect('SUM(attendance.hours_deducted)', 'hours')
        .where('attendance.status = :status', { status: AttendanceStatus.PRESENT });
        
    if (start_date) {
        query.andWhere('attendance.attendance_date >= :start', { start: start_date });
    }
    if (end_date) {
        query.andWhere('attendance.attendance_date <= :end', { end: end_date });
    }
    
    const result = await query
        .groupBy('subject.id')
        .getRawMany();
        
    return result.map(item => ({
        subjectName: item.subjectName || '未知科目',
        hours: Number(item.hours || 0)
    }));
  }

  private buildDateBuckets(start: Date, end: Date, granularity: 'day' | 'week' | 'month') {
    const buckets: { key: string; start: Date; end: Date }[] = [];
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    while (d <= end) {
      const bucketStart = new Date(d);
      let bucketEnd: Date;
      let key: string;
      if (granularity === 'week') {
        const tmp = new Date(d);
        tmp.setDate(tmp.getDate() + (7 - ((tmp.getDay() + 6) % 7)));
        bucketEnd = new Date(tmp);
        key = `${bucketStart.getFullYear()}-W${getWeekNumber(bucketStart)}`;
      } else if (granularity === 'month') {
        bucketEnd = new Date(bucketStart.getFullYear(), bucketStart.getMonth() + 1, 1);
        key = `${bucketStart.getFullYear()}-${String(bucketStart.getMonth() + 1).padStart(2, '0')}`;
      } else {
        bucketEnd = new Date(d);
        bucketEnd.setDate(bucketEnd.getDate() + 1);
        key = `${bucketStart.getFullYear()}-${String(bucketStart.getMonth() + 1).padStart(2, '0')}-${String(bucketStart.getDate()).padStart(2, '0')}`;
      }
      buckets.push({ key, start: bucketStart, end: new Date(bucketEnd) });
      d.setTime(bucketEnd.getTime());
    }
    return buckets;

    function getWeekNumber(date: Date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7);
      return String(weekNo).padStart(2, '0');
    }
  }

  async getTeacherTimeSeries(teacherId: number, start_date?: string, end_date?: string, granularity: 'day' | 'week' = 'day') {
    const start = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = end_date ? new Date(end_date) : new Date();
    const buckets = this.buildDateBuckets(start, end, granularity);

    const rows = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('DATE(attendance.attendance_date)', 'd')
      .addSelect('SUM(attendance.hours_deducted)', 'hours')
      .where('attendance.status = :status', { status: AttendanceStatus.PRESENT })
      .andWhere('attendance.teacher_id = :tid', { tid: teacherId })
      .andWhere('attendance.attendance_date >= :start', { start })
      .andWhere('attendance.attendance_date <= :end', { end })
      .groupBy('d')
      .getRawMany();

    const dayMap = new Map<string, number>();
    rows.forEach((r: any) => {
      const key = new Date(r.d).toISOString().slice(0, 10);
      dayMap.set(key, Number(r.hours || 0));
    });

    return buckets.map((b) => {
      let value = 0;
      if (granularity === 'day') {
        value = dayMap.get(b.key) || 0;
      } else {
        // sum day values within week bucket
        for (const [k, v] of dayMap.entries()) {
          const kd = new Date(k);
          if (kd >= b.start && kd < b.end) value += v;
        }
      }
      return { date: b.key, hours: value };
    });
  }

  async getSubjectTimeSeries(subjectId: number, start_date?: string, end_date?: string, granularity: 'day' | 'week' = 'day') {
    const start = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = end_date ? new Date(end_date) : new Date();
    const buckets = this.buildDateBuckets(start, end, granularity);

    const rows = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoin('attendance.course', 'course')
      .select('DATE(attendance.attendance_date)', 'd')
      .addSelect('SUM(attendance.hours_deducted)', 'hours')
      .where('attendance.status = :status', { status: AttendanceStatus.PRESENT })
      .andWhere('course.subject_id = :sid', { sid: subjectId })
      .andWhere('attendance.attendance_date >= :start', { start })
      .andWhere('attendance.attendance_date <= :end', { end })
      .groupBy('d')
      .getRawMany();

    const dayMap = new Map<string, number>();
    rows.forEach((r: any) => {
      const key = new Date(r.d).toISOString().slice(0, 10);
      dayMap.set(key, Number(r.hours || 0));
    });

    return buckets.map((b) => {
      let value = 0;
      if (granularity === 'day') {
        value = dayMap.get(b.key) || 0;
      } else {
        for (const [k, v] of dayMap.entries()) {
          const kd = new Date(k);
          if (kd >= b.start && kd < b.end) value += v;
        }
      }
      return { date: b.key, hours: value };
    });
  }

  async getStudentTimeSeries(studentId: number, start_date?: string, end_date?: string, granularity: 'day' | 'week' = 'day') {
    const start = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = end_date ? new Date(end_date) : new Date();
    const buckets = this.buildDateBuckets(start, end, granularity);

    const rows = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('DATE(attendance.attendance_date)', 'd')
      .addSelect('SUM(attendance.hours_deducted)', 'hours')
      .where('attendance.status = :status', { status: AttendanceStatus.PRESENT })
      .andWhere('attendance.student_id = :sid', { sid: studentId })
      .andWhere('attendance.attendance_date >= :start', { start })
      .andWhere('attendance.attendance_date <= :end', { end })
      .groupBy('d')
      .getRawMany();

    const dayMap = new Map<string, number>();
    rows.forEach((r: any) => {
      const key = new Date(r.d).toISOString().slice(0, 10);
      dayMap.set(key, Number(r.hours || 0));
    });

    return buckets.map((b) => {
      let value = 0;
      if (granularity === 'day') {
        value = dayMap.get(b.key) || 0;
      } else {
        for (const [k, v] of dayMap.entries()) {
          const kd = new Date(k);
          if (kd >= b.start && kd < b.end) value += v;
        }
      }
      return { date: b.key, hours: value };
    });
  }

  async getRevenueTimeSeries(start_date?: string, end_date?: string, granularity: 'day' | 'week' | 'month' = 'day') {
    const start = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = end_date ? new Date(end_date) : new Date();
    const buckets = this.buildDateBuckets(start, end, granularity);

    // Sum paid_fee of main orders by date(created_at)
    const rows = await this.orderRepository
      .createQueryBuilder('order')
      .select('DATE(order.created_at)', 'd')
      .addSelect('SUM(order.paid_fee)', 'paid')
      .where('order.parent_id IS NULL')
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('order.created_at >= :start', { start })
      .andWhere('order.created_at <= :end', { end })
      .groupBy('d')
      .getRawMany();

    const dayMap = new Map<string, number>();
    rows.forEach((r: any) => {
      const key = new Date(r.d).toISOString().slice(0, 10);
      dayMap.set(key, Number(r.paid || 0));
    });

    // Aggregate to week/month if needed
    return buckets.map((b) => {
      let value = 0;
      if (granularity === 'day') {
        value = dayMap.get(b.key) || 0;
      } else if (granularity === 'week') {
        for (const [k, v] of dayMap.entries()) {
          const kd = new Date(k);
          if (kd >= b.start && kd < b.end) value += v;
        }
      } else {
        for (const [k, v] of dayMap.entries()) {
          const kd = new Date(k);
          if (kd.getFullYear() === b.start.getFullYear() && kd.getMonth() === b.start.getMonth()) value += v;
        }
      }
      return { date: b.key, amount: value };
    });
  }

  async getOrderTypeDistribution(start_date?: string, end_date?: string) {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .select('order.order_type', 'orderType')
      .addSelect('SUM(order.paid_fee)', 'amount')
      .where('order.parent_id IS NULL')
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED });
    if (start_date) query.andWhere('order.created_at >= :start', { start: start_date });
    if (end_date) query.andWhere('order.created_at <= :end', { end: end_date });
    const rows = await query.groupBy('order.order_type').getRawMany();
    return rows.map((r: any) => ({ orderType: r.orderType, amount: Number(r.amount || 0) }));
  }

  async getSubjectIncome(start_date?: string, end_date?: string) {
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoin('attendance.course', 'course')
      .leftJoin('course.subject', 'subject')
      .select('subject.name', 'subjectName')
      .addSelect('SUM(subject.price * attendance.hours_deducted)', 'income')
      .where('attendance.status = :status', { status: AttendanceStatus.PRESENT });
    if (start_date) query.andWhere('attendance.attendance_date >= :start', { start: start_date });
    if (end_date) query.andWhere('attendance.attendance_date <= :end', { end: end_date });
    const rows = await query.groupBy('subject.id').getRawMany();
    return rows.map((r: any) => ({ subjectName: r.subjectName || '未知科目', income: Number(r.income || 0) }));
  }

  async getTeacherIncome(start_date?: string, end_date?: string) {
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoin('attendance.teacher', 'teacher')
      .leftJoin('attendance.course', 'course')
      .leftJoin('course.subject', 'subject')
      .select('teacher.name', 'teacherName')
      .addSelect('SUM(subject.price * attendance.hours_deducted)', 'income')
      .where('attendance.status = :status', { status: AttendanceStatus.PRESENT });
    if (start_date) query.andWhere('attendance.attendance_date >= :start', { start: start_date });
    if (end_date) query.andWhere('attendance.attendance_date <= :end', { end: end_date });
    const rows = await query.groupBy('teacher.id').getRawMany();
    return rows.map((r: any) => ({ teacherName: r.teacherName || '未知教师', income: Number(r.income || 0) }));
  }

  async getTop(type: 'subject' | 'teacher' | 'student', start_date?: string, end_date?: string, limit = 10) {
    if (type === 'subject') {
      const data = await this.getSubjectIncome(start_date, end_date);
      return data.sort((a, b) => b.income - a.income).slice(0, limit);
    }
    if (type === 'teacher') {
      const data = await this.getTeacherIncome(start_date, end_date);
      return data.sort((a, b) => b.income - a.income).slice(0, limit);
    }
    // student income
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoin('attendance.student', 'student')
      .leftJoin('attendance.course', 'course')
      .leftJoin('course.subject', 'subject')
      .select('student.name', 'studentName')
      .addSelect('SUM(subject.price * attendance.hours_deducted)', 'income')
      .where('attendance.status = :status', { status: AttendanceStatus.PRESENT });
    if (start_date) query.andWhere('attendance.attendance_date >= :start', { start: start_date });
    if (end_date) query.andWhere('attendance.attendance_date <= :end', { end: end_date });
    const rows = await query.groupBy('student.id').orderBy('income', 'DESC').limit(limit).getRawMany();
    return rows.map((r: any) => ({ studentName: r.studentName || '未知学员', income: Number(r.income || 0) }));
  }

  async getKPI(start_date?: string, end_date?: string) {
    // Income & orders
    const baseQ = this.orderRepository
      .createQueryBuilder('order')
      .where('order.parent_id IS NULL')
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED });
    if (start_date) baseQ.andWhere('order.created_at >= :start', { start: start_date });
    if (end_date) baseQ.andWhere('order.created_at <= :end', { end: end_date });
    const { sum: incomeSum } = await baseQ.clone().select('SUM(order.paid_fee)', 'sum').getRawOne();
    const { cnt } = await baseQ.clone().select('COUNT(order.id)', 'cnt').getRawOne();
    const income = Number(incomeSum || 0);
    const ordersCount = Number(cnt || 0);
    const avgTicket = ordersCount > 0 ? income / ordersCount : 0;

    // Current total debt (not limited by date)
    const { sum: debtSum } = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.debt_amount)', 'sum')
      .where('order.parent_id IS NULL')
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('order.debt_amount > 0')
      .getRawOne();

    return { income, ordersCount, avgTicket, debtTotal: Number(debtSum || 0) };
  }
}
