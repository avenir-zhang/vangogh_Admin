import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Student, StudentStatus } from '../students/entities/student.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Attendance, AttendanceStatus } from '../attendances/entities/attendance.entity';
import { Subject } from '../subjects/entities/subject.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
  ) {}

  async getSummary() {
    const totalStudents = await this.studentRepository.count();
    const activeStudents = await this.studentRepository.count({
      where: { status: StudentStatus.ACTIVE },
    });
    
    // Find students with at least one unpaid order (debt status)
    // 修复：之前使用 debt_status = 'debt'，但在 Entity 中 Enum 可能是 'debt' 或 'DEBT'，或者数据库中存储的是 'debt'
    // 确认数据库中存储的值。通常 Enum 在数据库中以字符串存储。
    // 如果 orderRepository.count 能用最好
    const arrearsStudentsCount = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.debt_status = :status', { status: 'debt' })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED }) // 排除已取消的订单
      .select('COUNT(DISTINCT order.student_id)', 'count')
      .getRawOne();
      
    const arrearsStudents = parseInt(arrearsStudentsCount.count || '0', 10);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const monthlyClassHours = await this.attendanceRepository.count({
      where: {
        attendance_date: Between(startOfMonth, endOfMonth),
        status: AttendanceStatus.PRESENT,
      },
    });

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
    // 修复：之前可能因为没有正确 join 或者数据类型问题导致为 0
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
}
