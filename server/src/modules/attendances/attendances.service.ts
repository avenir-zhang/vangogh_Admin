import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { StudentCourse } from '../students/entities/student-course.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class AttendancesService {
  constructor(
    @InjectRepository(Attendance)
    private attendancesRepository: Repository<Attendance>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(StudentCourse)
    private studentCoursesRepository: Repository<StudentCourse>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    private dataSource: DataSource,
  ) {}

  async createBatch(createAttendanceDtos: any[]) {
      const results: any[] = [];
      for (const dto of createAttendanceDtos) {
          try {
              // 检查该学员是否已经在这个课程中
              // 如果是临时学员（可能不在 student_courses 中），create 方法会处理（只要有订单）
              // 但 create 方法会尝试更新 student_courses，如果不存在可能会有问题？
              // 让我们看看 create 方法的逻辑：
              // const studentCourse = await queryRunner.manager.findOne(StudentCourse, ...);
              // if (studentCourse) { ... }
              // 如果不存在，它只是不更新 StudentCourse 的 remaining_courses，这对于临时学员是预期的（因为他们没有课程绑定记录）
              // 但是，他们必须有 Order (validOrders)，否则循环不会执行，也就不会有扣费。
              // 临时学员的前提是：购买了该科目的课时（有订单），但没加入该班级。
              // 我们的 create 逻辑是先找 validOrders，如果有，就扣费。
              // 所以临时学员逻辑应该是兼容的。
              
              const res = await this.create(dto);
              results.push({ success: true, data: res });
          } catch (error) {
              console.error(`Sign in failed for student ${dto.student_id}:`, error);
              results.push({ success: false, error: error.message });
          }
      }
      return results;
  }

  async create(createAttendanceDto: any) { // createAttendanceDto might not match Partial<Attendance> due to extra fields or missing ones
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const attendance = this.attendancesRepository.create(createAttendanceDto as Partial<Attendance>);
        
        // 如果是出勤，需要扣减课时
        if (attendance.status === AttendanceStatus.PRESENT) {
            const { student_id, course_id } = createAttendanceDto;
            
            // 获取课程信息以拿到 subject_id
            const course = await this.coursesRepository.findOne({ where: { id: course_id } });
            if (!course) {
                throw new Error('Course not found');
            }

            // 1. 查找该学生、该科目下的所有有效子订单
            // 排序规则：优先扣除有有效期的（expire_date NOT NULL 且较早过期），其次无有效期的；同等条件下按创建时间
            // 注意：必须是子订单 (parent_id IS NOT NULL)，且未取消，未过期
            const orders = await queryRunner.manager.find(Order, {
                where: {
                    student_id,
                    subject_id: course.subject_id, // 使用科目ID关联
                    status: OrderStatus.ACTIVE,
                    // parent_id: Not(IsNull()) // 确保是子订单
                },
                order: {
                    expire_date: 'ASC', // 优先过期时间早的
                    created_at: 'ASC',
                }
            });

            // 过滤掉已经过期的（虽然 where 里很难直接过滤动态日期，这里手动过滤更稳）
            const now = new Date();
            const validOrders = orders.filter(o => !o.expire_date || o.expire_date > now);

            // 使用传入的扣减课时，默认为 1
            let hoursToDeduct = Number(createAttendanceDto.hours_deducted);
            if (isNaN(hoursToDeduct) || hoursToDeduct <= 0) {
                hoursToDeduct = 1;
            }
            // 记录到 attendance 中
            attendance.hours_deducted = hoursToDeduct;

            let remainingToDeduct = hoursToDeduct; 
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
                    order.consumed_regular_courses = Number(order.consumed_regular_courses || 0) + deduct;
                    remainingToDeduct -= deduct;
                    deductedOrderId = order.id; // 记录主要扣减的订单ID
                    await queryRunner.manager.save(Order, order);
                }

                if (remainingToDeduct <= 0) break;

                // 计算该订单剩余的赠送课时
                const remainingGift = (order.gift_courses || 0) - (order.consumed_gift_courses || 0);
                
                if (remainingGift > 0) {
                    const deduct = Math.min(remainingToDeduct, remainingGift);
                    order.consumed_gift_courses = Number(order.consumed_gift_courses || 0) + deduct;
                    remainingToDeduct -= deduct;
                    deductedOrderId = order.id;
                    await queryRunner.manager.save(Order, order);
                }
            }

            // 2. 更新 StudentCourse 总剩余课时
            // 找到对应的 StudentCourse 记录并减去扣减的课时
            const studentCourse = await queryRunner.manager.findOne(StudentCourse, {
                where: { student_id, course_id }
            });
            if (studentCourse) {
                // 这里的逻辑：StudentCourse 是总览，应该如实反映总剩余
                studentCourse.remaining_courses = Number(studentCourse.remaining_courses) - hoursToDeduct;
                await queryRunner.manager.save(StudentCourse, studentCourse);
            }
            
            // 3. 将扣减的主要订单ID绑定到签到记录 (如果需要记录多个订单，可能需要额外的关联表，这里简化为主要扣减订单)
            if (deductedOrderId) {
                attendance.order_id = deductedOrderId;
            }
        } else {
            // 非出勤状态，扣减课时设为 0
            attendance.hours_deducted = 0;
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

  async findAll(query?: any) {
    const {
      student_id,
      subject_id,
      teacher_id,
      course_id,
      status,
      start_date,
      end_date,
    } = query || {};

    const qb = this.attendancesRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.student', 'student')
      .leftJoinAndSelect('attendance.course', 'course')
      .leftJoinAndSelect('course.subject', 'subject')
      .leftJoinAndSelect('attendance.teacher', 'teacher')
      .leftJoinAndSelect('attendance.order', 'order')
      .orderBy('attendance.attendance_date', 'DESC')
      .addOrderBy('attendance.created_at', 'DESC');

    if (student_id) qb.andWhere('attendance.student_id = :student_id', { student_id });
    if (teacher_id) qb.andWhere('attendance.teacher_id = :teacher_id', { teacher_id });
    if (course_id) qb.andWhere('attendance.course_id = :course_id', { course_id });
    if (status) qb.andWhere('attendance.status = :status', { status });
    if (subject_id) qb.andWhere('course.subject_id = :subject_id', { subject_id });
    if (start_date) qb.andWhere('attendance.attendance_date >= :start_date', { start_date });
    if (end_date) qb.andWhere('attendance.attendance_date <= :end_date', { end_date });

    const list = await qb.getMany();
    return list;
  }

  findOne(id: number) {
    return this.attendancesRepository.findOne({ where: { id }, relations: ['student', 'course', 'teacher'] });
  }

  async update(id: number, updateAttendanceDto: Partial<Attendance>) {
    // 检查是否修改了 status 或 hours_deducted
    // 如果修改了，需要同步更新 StudentCourse 和 Order 的消耗
    
    // 1. 获取原始记录
    const oldAttendance = await this.attendancesRepository.findOne({ where: { id } });
    if (!oldAttendance) {
        throw new Error('Attendance not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // 2. 计算旧的扣除值
        const oldDeducted = oldAttendance.status === AttendanceStatus.PRESENT ? Number(oldAttendance.hours_deducted || 1) : 0;

        // 3. 计算新的扣除值
        const newStatus = updateAttendanceDto.status || oldAttendance.status;
        const newHoursInput = updateAttendanceDto.hours_deducted;
        // 如果传入了 hours_deducted，使用传入值；否则使用旧值。注意 0 是有效值。
        const newHoursVal = newHoursInput !== undefined ? Number(newHoursInput) : Number(oldAttendance.hours_deducted || 1);
        
        const newDeducted = newStatus === AttendanceStatus.PRESENT ? newHoursVal : 0;

        const diff = newDeducted - oldDeducted;

        if (diff !== 0) {
            const { student_id, course_id } = oldAttendance;

            // 更新 StudentCourse
            const studentCourse = await queryRunner.manager.findOne(StudentCourse, {
                where: { student_id, course_id }
            });
            
            if (studentCourse) {
                // diff > 0: 扣除更多，余额减少 (remaining - diff)
                // diff < 0: 返还，余额增加 (remaining - diff)  (e.g. - (-0.5) = +0.5)
                studentCourse.remaining_courses = Number(studentCourse.remaining_courses) - diff;
                await queryRunner.manager.save(StudentCourse, studentCourse);
            }

            // 更新 Orders
            if (diff > 0) {
                // 需要额外扣除 diff
                let remainingToDeduct = diff;
                
                // 查找该学生、该科目下的所有有效子订单 (逻辑同 create)
                const course = await this.coursesRepository.findOne({ where: { id: course_id } });
                const orders = await queryRunner.manager.find(Order, {
                    where: {
                        student_id,
                        subject_id: course?.subject_id,
                        status: OrderStatus.ACTIVE,
                    },
                    order: {
                        expire_date: 'ASC',
                        created_at: 'ASC',
                    }
                });
                
                const now = new Date();
                const validOrders = orders.filter(o => !o.expire_date || o.expire_date > now);

                for (const order of validOrders) {
                    if (remainingToDeduct <= 0) break;

                    const remainingRegular = (order.regular_courses || 0) - (order.consumed_regular_courses || 0);
                    if (remainingRegular > 0) {
                        const deduct = Math.min(remainingToDeduct, remainingRegular);
                        order.consumed_regular_courses = Number(order.consumed_regular_courses || 0) + deduct;
                        remainingToDeduct -= deduct;
                        await queryRunner.manager.save(Order, order);
                        // 如果修改导致消耗增加，更新签到关联的订单ID（如果是主要消耗源变化）
                        // 简单起见，这里暂不更新 attendance.order_id，除非完全切换了订单
                    }

                    if (remainingToDeduct <= 0) break;

                    const remainingGift = (order.gift_courses || 0) - (order.consumed_gift_courses || 0);
                    if (remainingGift > 0) {
                        const deduct = Math.min(remainingToDeduct, remainingGift);
                        order.consumed_gift_courses = Number(order.consumed_gift_courses || 0) + deduct;
                        remainingToDeduct -= deduct;
                        await queryRunner.manager.save(Order, order);
                    }
                }
            } else {
                // 需要返还 -diff (逻辑同 remove)
                let remainingToAdd = -diff;
                
                // 优先从该签到记录绑定的订单中回补
                // 检查 oldAttendance 是否有关联的 order_id
                if (oldAttendance.order_id) {
                    const linkedOrder = await queryRunner.manager.findOne(Order, { where: { id: oldAttendance.order_id } });
                    if (linkedOrder) {
                        // 尝试从关联订单回补
                        // 优先回补赠送还是正价？create 是先扣正价后赠送。remove 是先补赠送后正价（为了对齐？）。
                        // 这里我们保持 remove 的逻辑：先补赠送，后补正价。或者反过来？
                        // 如果扣除顺序是：正价 -> 赠送。
                        // 那么返还顺序应该是：赠送 -> 正价（栈结构）。
                        
                        const consumedGift = Number(linkedOrder.consumed_gift_courses || 0);
                        if (consumedGift > 0) {
                            const add = Math.min(remainingToAdd, consumedGift);
                            linkedOrder.consumed_gift_courses = consumedGift - add;
                            remainingToAdd -= add;
                            await queryRunner.manager.save(Order, linkedOrder);
                        }

                        if (remainingToAdd > 0) {
                            const consumedRegular = Number(linkedOrder.consumed_regular_courses || 0);
                            if (consumedRegular > 0) {
                                const add = Math.min(remainingToAdd, consumedRegular);
                                linkedOrder.consumed_regular_courses = consumedRegular - add;
                                remainingToAdd -= add;
                                await queryRunner.manager.save(Order, linkedOrder);
                            }
                        }
                    }
                }

                // 如果关联订单不够回补（或者没有关联订单），则按时间倒序查找其他订单
                if (remainingToAdd > 0) {
                    const course = await this.coursesRepository.findOne({ where: { id: course_id } });
                    const orders = await queryRunner.manager.find(Order, {
                        where: {
                            student_id,
                            subject_id: course?.subject_id,
                        },
                        order: {
                            created_at: 'DESC', // 优先找最近的订单回补
                        }
                    });

                    for (const order of orders) {
                        if (remainingToAdd <= 0) break;
                        // 跳过已经处理过的关联订单
                        if (order.id === oldAttendance.order_id) continue;

                        const consumedGift = Number(order.consumed_gift_courses || 0);
                        if (consumedGift > 0) {
                            const add = Math.min(remainingToAdd, consumedGift);
                            order.consumed_gift_courses = consumedGift - add;
                            remainingToAdd -= add;
                            await queryRunner.manager.save(Order, order);
                        }

                        if (remainingToAdd <= 0) break;

                        const consumedRegular = Number(order.consumed_regular_courses || 0);
                        if (consumedRegular > 0) {
                            const add = Math.min(remainingToAdd, consumedRegular);
                            order.consumed_regular_courses = consumedRegular - add;
                            remainingToAdd -= add;
                            await queryRunner.manager.save(Order, order);
                        }
                    }
                }
            }
        }

        // 更新 Attendance 记录本身
        await queryRunner.manager.update(Attendance, id, updateAttendanceDto);
        await queryRunner.commitTransaction();
        
        return this.attendancesRepository.findOne({ where: { id } });
    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
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
            const { student_id, course_id, hours_deducted } = attendance;
            const hours = Number(hours_deducted || 1);

            // 1. 回滚 StudentCourse 总剩余课时
            const studentCourse = await queryRunner.manager.findOne(StudentCourse, {
                where: { student_id, course_id }
            });
            if (studentCourse) {
                studentCourse.remaining_courses = Number(studentCourse.remaining_courses) + hours; // 确保是数字加法
                await queryRunner.manager.save(StudentCourse, studentCourse);
            }

            // 2. 回滚订单扣减 (比较复杂，需要反向操作)
            const course = await this.coursesRepository.findOne({ where: { id: course_id } });
            
            const orders = await queryRunner.manager.find(Order, {
                where: {
                    student_id,
                    subject_id: course?.subject_id,
                    // parent_id: Not(IsNull())
                },
                order: {
                    created_at: 'DESC', // 倒序，优先找最近的订单回补
                }
            });

            let remainingToAdd = hours;

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
