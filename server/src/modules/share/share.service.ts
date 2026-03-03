import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShareLink } from './entities/share-link.entity';
import { v4 as uuidv4 } from 'uuid';
import { StudentsService } from '../students/students.service';
import { AttendancesService } from '../attendances/attendances.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class ShareService {
  constructor(
    @InjectRepository(ShareLink)
    private shareLinkRepository: Repository<ShareLink>,
    private studentsService: StudentsService,
    private attendancesService: AttendancesService,
    private ordersService: OrdersService,
  ) {}

  async createAttendanceShare(studentId: number, options: { expireInDays?: number; password?: string }) {
    const code = uuidv4().replace(/-/g, '').substring(0, 8); // Short random code
    
    const expireAt = new Date();
    if (options.expireInDays) {
        expireAt.setDate(expireAt.getDate() + options.expireInDays);
    } else {
        expireAt.setFullYear(expireAt.getFullYear() + 100); // Almost forever
    }

    const shareLink = this.shareLinkRepository.create({
      code,
      type: 'student_attendance',
      data: { studentId },
      password: options.password,
      expire_at: expireAt,
    });

    return this.shareLinkRepository.save(shareLink);
  }

  async getShareContent(code: string, password?: string) {
    const shareLink = await this.shareLinkRepository.findOne({ where: { code } });
    
    if (!shareLink || !shareLink.is_active) {
        throw new NotFoundException('链接不存在或已失效');
    }

    if (shareLink.expire_at && new Date() > shareLink.expire_at) {
        throw new NotFoundException('链接已过期');
    }

    // Password check
    if (shareLink.password) {
        if (!password) {
            return { needPassword: true };
        }
        if (password !== shareLink.password) {
            throw new UnauthorizedException('密码错误');
        }
    }

    // Fetch data based on type
    if (shareLink.type === 'student_attendance') {
        const studentId = shareLink.data.studentId;
        const student = await this.studentsService.findOne(studentId);
        
        if (!student) {
            throw new NotFoundException('学员不存在');
        }

        // 1. 获取签到记录
        const attendances = await this.attendancesService.findAll({ 
            student_id: studentId,
            current: 1,
            pageSize: 1000 
        });

        // 2. 获取有效订单（统计课时）
        // 获取该学员所有有效的子订单
        const validOrders = await this.ordersService.findSubOrdersByStudent(studentId);

        return {
            needPassword: false,
            type: 'student_attendance',
            student: {
                name: student.name,
                nickname: student.nickname,
            },
            attendances: attendances.map((item: any) => ({
                id: item.id,
                courseName: item.course?.name,
                subjectName: item.course?.subject?.name,
                teacherName: item.teacher?.name,
                attendanceDate: item.attendance_date,
                status: item.status,
                hoursDeducted: item.hours_deducted
            })),
            orders: validOrders.map((item: any) => ({
                id: item.id,
                orderNo: item.order_no,
                subjectName: item.subject?.name,
                regularCourses: item.regular_courses,
                giftCourses: item.gift_courses,
                consumedRegular: item.consumed_regular_courses,
                consumedGift: item.consumed_gift_courses,
                orderDate: item.order_date,
                expireDate: item.expire_date,
                status: item.status,
            }))
        };
    }

    return { needPassword: false, data: null };
  }
  
  async getShareData(code: string, password?: string) {
      // This method returns the actual data after password verification
      const check = await this.getShareContent(code, password);
      if (check.needPassword) {
          throw new UnauthorizedException('需要密码');
      }
      
      const shareLink = await this.shareLinkRepository.findOne({ where: { code } });
      if (!shareLink) throw new NotFoundException();

      if (shareLink.type === 'student_attendance') {
          const studentId = shareLink.data.studentId;
          // We need access to repository to fetch attendances efficiently
          // Let's assume AttendancesService can help or we inject Repository in Module
          // For now, let's return the student ID and let the controller handle it or fetch here if possible.
          return { studentId };
      }
      return {};
  }
}
