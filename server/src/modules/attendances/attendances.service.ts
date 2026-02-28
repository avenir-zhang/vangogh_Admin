import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { StudentCourse } from '../students/entities/student-course.entity';

@Injectable()
export class AttendancesService {
  constructor(
    @InjectRepository(Attendance)
    private attendancesRepository: Repository<Attendance>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(StudentCourse)
    private studentCoursesRepository: Repository<StudentCourse>,
    private dataSource: DataSource,
  ) {}

  async create(createAttendanceDto: any) { // createAttendanceDto might not match Partial<Attendance> due to extra fields or missing ones
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const attendance = this.attendancesRepository.create(createAttendanceDto as Partial<Attendance>);
        
        // 如果是出勤，需要扣减课时
        if (attendance.status === AttendanceStatus.PRESENT) {
            const { student_id, course_id } = createAttendanceDto;

            // 1. 查找该学生、该课程的所有有效子订单
            // 排序规则：优先扣除有有效期的（expire_date NOT NULL 且较早过期），其次无有效期的；同等条件下按创建时间
            // 注意：必须是子订单 (parent_id IS NOT NULL)，且未取消，未过期
            const orders = await queryRunner.manager.find(Order, {
                where: {
                    student_id,
                    course_id,
                    status: OrderStatus.ACTIVE,
                    // parent_id: Not(IsNull()) // 确保是子订单，不过 course_id 关联通常在子订单
                },
                order: {
                    expire_date: 'ASC', // 优先过期时间早的
                    created_at: 'ASC',
                }
            });

            // 过滤掉已经过期的（虽然 where 里很难直接过滤动态日期，这里手动过滤更稳）
            const now = new Date();
            const validOrders = orders.filter(o => !o.expire_date || o.expire_date > now);

            let remainingToDeduct = 1; // 假设每次消耗 1 课时
            let deductedOrderId: number | null = null;

            // 遍历订单扣减课时
            // 逻辑：优先扣除 expire_date 早的
            // 在同一个订单内：优先扣除正价，再扣除赠送
            for (const order of validOrders) {
                if (remainingToDeduct <= 0) break;

                // 计算该订单剩余的正价课时
                const remainingRegular = (order.regular_courses || 0) - (order.consumed_regular_courses || 0);
                
                if (remainingRegular > 0) {
                    const deduct = Math.min(remainingToDeduct, remainingRegular);
                    order.consumed_regular_courses = (order.consumed_regular_courses || 0) + deduct;
                    remainingToDeduct -= deduct;
                    deductedOrderId = order.id; // 记录主要扣减的订单ID
                    await queryRunner.manager.save(Order, order);
                }

                if (remainingToDeduct <= 0) break;

                // 计算该订单剩余的赠送课时
                const remainingGift = (order.gift_courses || 0) - (order.consumed_gift_courses || 0);
                
                if (remainingGift > 0) {
                    const deduct = Math.min(remainingToDeduct, remainingGift);
                    order.consumed_gift_courses = (order.consumed_gift_courses || 0) + deduct;
                    remainingToDeduct -= deduct;
                    deductedOrderId = order.id;
                    await queryRunner.manager.save(Order, order);
                }
            }

            // 2. 更新 StudentCourse 总剩余课时
            // 找到对应的 StudentCourse 记录并减 1
            const studentCourse = await queryRunner.manager.findOne(StudentCourse, {
                where: { student_id, course_id }
            });
            if (studentCourse) {
                // 如果 remainingToDeduct > 0，说明没有足够的课时扣减，StudentCourse 依然减 1，变成负数？
                // 或者只有在扣减成功时才减？
                // 这里的逻辑：StudentCourse 是总览，应该如实反映总剩余
                studentCourse.remaining_courses -= 1;
                await queryRunner.manager.save(StudentCourse, studentCourse);
            }
            
            // 3. 将扣减的主要订单ID绑定到签到记录 (如果需要记录多个订单，可能需要额外的关联表，这里简化为主要扣减订单)
            if (deductedOrderId) {
                attendance.order_id = deductedOrderId;
            }
        }

        const savedAttendance = await queryRunner.manager.save(Attendance, attendance);
        await queryRunner.commitTransaction();
        return savedAttendance;
    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
  }

  findAll(query?: any) {
    const { current, pageSize, ...filter } = query || {};
    return this.attendancesRepository.find({
      where: filter,
      relations: ['student', 'course', 'course.subject', 'teacher', 'order'], // 关联 order
      order: {
          attendance_date: 'DESC',
          created_at: 'DESC',
      }
    });
  }

  findOne(id: number) {
    return this.attendancesRepository.findOne({ where: { id }, relations: ['student', 'course', 'teacher'] });
  }

  update(id: number, updateAttendanceDto: Partial<Attendance>) {
    return this.attendancesRepository.update(id, updateAttendanceDto);
  }

  async remove(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const attendance = await queryRunner.manager.findOne(Attendance, { where: { id } });
        if (!attendance) {
            throw new Error('Attendance not found');
        }

        // 如果是出勤，需要回滚扣减的课时
        if (attendance.status === AttendanceStatus.PRESENT) {
            const { student_id, course_id } = attendance;

            // 1. 回滚 StudentCourse 总剩余课时
            const studentCourse = await queryRunner.manager.findOne(StudentCourse, {
                where: { student_id, course_id }
            });
            if (studentCourse) {
                studentCourse.remaining_courses = Number(studentCourse.remaining_courses) + 1; // 确保是数字加法
                await queryRunner.manager.save(StudentCourse, studentCourse);
            }

            // 2. 回滚订单扣减 (比较复杂，需要反向操作)
            const orders = await queryRunner.manager.find(Order, {
                where: {
                    student_id,
                    course_id,
                    // parent_id: Not(IsNull())
                },
                order: {
                    created_at: 'DESC', // 倒序，优先找最近的订单回补
                }
            });

            let remainingToAdd = 1;

            for (const order of orders) {
                if (remainingToAdd <= 0) break;

                // 先尝试回补赠送课时
                const consumedGift = Number(order.consumed_gift_courses || 0);
                if (consumedGift > 0) {
                    const add = Math.min(remainingToAdd, consumedGift);
                    order.consumed_gift_courses = consumedGift - add;
                    remainingToAdd -= add;
                    await queryRunner.manager.save(Order, order);
                }

                if (remainingToAdd <= 0) break;

                // 再尝试回补正价课时
                const consumedRegular = Number(order.consumed_regular_courses || 0);
                if (consumedRegular > 0) {
                    const add = Math.min(remainingToAdd, consumedRegular);
                    order.consumed_regular_courses = consumedRegular - add;
                    remainingToAdd -= add;
                    await queryRunner.manager.save(Order, order);
                }
            }
        }

        await queryRunner.manager.remove(Attendance, attendance);
        await queryRunner.commitTransaction();
        return { success: true };
    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
  }
}
