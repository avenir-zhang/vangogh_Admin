import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, In, Not } from 'typeorm';
import { Order, OrderStatus, OrderType, DebtStatus } from './entities/order.entity';
import { StudentCourse, StudentCourseStatus } from '../students/entities/student-course.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(StudentCourse)
    private studentCoursesRepository: Repository<StudentCourse>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    private dataSource: DataSource,
  ) {}

  async createBatch(createOrderDto: any) {
      // createOrderDto 应该包含：
      // { student_id, order_date, order_type, paid_fee, items: [{ subject_id, course_id, regular_courses, ... }] }
      
      const { items, paid_fee, ...mainOrderInfo } = createOrderDto;
      
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
          // 1. 创建主订单
          const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          
          const mainOrder = new Order();
          mainOrder.order_no = `ORD-${date}-${random}`;
          Object.assign(mainOrder, mainOrderInfo);
          mainOrder.paid_fee = paid_fee;
          
          // 计算总金额
          let totalFee = 0;
          items.forEach((item: any) => {
              totalFee += Number(item.total_fee || 0);
          });
          mainOrder.total_fee = totalFee;
          mainOrder.calculateDebt(); // 计算欠费状态

          const savedMainOrder = await queryRunner.manager.save(Order, mainOrder);

          // 2. 创建子订单
          for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const subOrder = new Order();
              subOrder.order_no = `${savedMainOrder.order_no}-${i + 1}`;
              subOrder.parent = savedMainOrder;
              subOrder.student_id = savedMainOrder.student_id;
              subOrder.order_date = savedMainOrder.order_date;
              subOrder.expire_date = savedMainOrder.expire_date; // 或者是 item 自己的有效期
              subOrder.order_type = savedMainOrder.order_type;
              
              // 子订单明细
              subOrder.subject_id = item.subject_id;
              // subOrder.course_id = item.course_id; // 移除课程ID
              subOrder.regular_courses = item.regular_courses;
              subOrder.gift_courses = item.gift_courses;
              subOrder.total_fee = item.total_fee;
              subOrder.paid_fee = 0; // 子订单不记录实付，统一在主订单
              
              const savedSubOrder = await queryRunner.manager.save(Order, subOrder);

              // 3. 同步增加 StudentCourse 的剩余课时
              // 找到该学员在该科目下关联的所有课程
              // 先找出该科目下的所有课程ID
              const courses = await this.coursesRepository.find({ 
                  where: { subject_id: item.subject_id },
                  select: ['id'] 
              });
              
              if (courses.length > 0) {
                  const courseIds = courses.map(c => c.id);
                  const existingStudentCourses = await this.studentCoursesRepository.find({
                      where: {
                          student_id: savedMainOrder.student_id,
                          course_id: In(courseIds)
                      }
                  });

                  const existingMap = new Map(existingStudentCourses.map(sc => [sc.course_id, sc]));
                  const totalHoursToAdd = Number(item.regular_courses || 0) + Number(item.gift_courses || 0);

                  for (const courseId of courseIds) {
                      let sc = existingMap.get(courseId);
                      if (sc) {
                          sc.remaining_courses = Number(sc.remaining_courses || 0) + totalHoursToAdd;
                      } else {
                          sc = new StudentCourse();
                          sc.student_id = savedMainOrder.student_id;
                          sc.course_id = courseId;
                          sc.remaining_courses = totalHoursToAdd;
                          sc.status = StudentCourseStatus.ACTIVE;
                      }
                      await queryRunner.manager.save(StudentCourse, sc);
                  }
              }
          }

          await queryRunner.commitTransaction();
          return savedMainOrder;
      } catch (err) {
          await queryRunner.rollbackTransaction();
          throw err;
      } finally {
          await queryRunner.release();
      }
  }

  findAll(query?: any) {
    const { current, pageSize, excludeStatus, activeTab, ...filter } = query || {};
    const where: any = { ...filter, parent_id: IsNull() };
    
    // 如果 filter 中有 status，并且与 excludeStatus 冲突，则返回空
    if (excludeStatus && where.status === excludeStatus) {
        return Promise.resolve([]);
    }

    if (excludeStatus && !where.status) {
        where.status = Not(excludeStatus);
    }

    // 只查询主订单 (parent_id IS NULL)
    // 移除 where.id = -1 这种逻辑，因为 id 必须是数字，如果是无效查询，应该直接返回空数组
    // 上面的 Promise.resolve([]) 已经处理了
    
    // 检查其他可能导致 500 的参数，比如分页参数是否正确
    // current, pageSize 已经被解构出去了，不会进入 find 的 options
    
    // 确保 relations 存在
    
    return this.ordersRepository.find({ 
      where, 
      relations: ['student', 'children', 'children.subject'], 
      order: { created_at: 'DESC' }
    });
  }

  findOne(id: number) {
      return this.ordersRepository.findOne({
          where: { id },
          relations: ['student', 'children', 'children.subject'] // 移除 children.course
      });
  }

  // 补缴功能
  async supplement(id: number, amount: number) {
      const order = await this.ordersRepository.findOne({ where: { id } });
      if (!order) {
          throw new Error('Order not found');
      }
      // 增加实付金额
      order.paid_fee = Number(order.paid_fee) + Number(amount);
      order.calculateDebt();
      return this.ordersRepository.save(order);
  }

  // 修改子订单过期时间，并同步修改对应的学员课程过期时间
  async updateExpireDate(id: number, expire_date: string | null) {
      const order = await this.ordersRepository.findOne({ where: { id } });
      if (!order) {
          throw new Error('Order not found');
      }
      
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
          // 1. 更新订单过期时间
          // 如果 expire_date 是 null 或空字符串，则设置为 null
          // 使用 as any 绕过类型检查，因为 entity 中定义为 nullable: true，但类型声明是 Date
          const newExpireDate = expire_date ? new Date(expire_date) : null;
          order.expire_date = newExpireDate as any;
          await queryRunner.manager.save(Order, order);

          // 2. 更新关联的 StudentCourse 过期时间
          // 由于订单与课程不再绑定，这部分逻辑需要调整或移除
          // 暂时移除，因为没有 course_id 关联了

          await queryRunner.commitTransaction();
          return order;
      } catch (err) {
          await queryRunner.rollbackTransaction();
          throw err;
      } finally {
          await queryRunner.release();
      }
  }

  // 转让订单
  async transfer(orderId: number, targetStudentId: number, transferDetails?: { subjectId: number, amount: number }) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
          // 1. 获取源子订单
          const sourceOrder = await queryRunner.manager.findOne(Order, { 
              where: { id: orderId },
              relations: ['subject']
          });

          if (!sourceOrder) {
              throw new Error('Order not found');
          }

          if (sourceOrder.parent_id === null) {
              throw new Error('Only sub-orders can be transferred');
          }

          if (sourceOrder.status !== OrderStatus.ACTIVE) {
              throw new Error('Only active orders can be transferred');
          }

          // 2. 计算剩余课时
          const regularRemaining = Number(sourceOrder.regular_courses || 0) - Number(sourceOrder.consumed_regular_courses || 0);
          const giftRemaining = Number(sourceOrder.gift_courses || 0) - Number(sourceOrder.consumed_gift_courses || 0);
          const totalRemaining = regularRemaining + giftRemaining;

          if (totalRemaining <= 0) {
              throw new Error('No remaining hours to transfer');
          }

          // 3. 扣除源学员的 StudentCourse
          const courses = await queryRunner.manager.find(Course, { 
              where: { subject_id: sourceOrder.subject_id },
              select: ['id'] 
          });

          if (courses.length > 0) {
              const courseIds = courses.map(c => c.id);
              const sourceStudentCourses = await queryRunner.manager.find(StudentCourse, {
                  where: {
                      student_id: sourceOrder.student_id,
                      course_id: In(courseIds)
                  }
              });

              for (const sc of sourceStudentCourses) {
                  sc.remaining_courses = Number(sc.remaining_courses || 0) - totalRemaining;
                  await queryRunner.manager.save(StudentCourse, sc);
              }
          }

          // 4. 更新源订单状态和消耗
          sourceOrder.regular_courses = sourceOrder.consumed_regular_courses;
          sourceOrder.gift_courses = sourceOrder.consumed_gift_courses;
          sourceOrder.status = OrderStatus.TRANSFERRED;
          await queryRunner.manager.save(Order, sourceOrder);

          // 5. 为目标学员创建新订单（类型为转让）
          const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

          const mainOrder = new Order();
          mainOrder.order_no = `TRF-${date}-${random}`;
          mainOrder.student_id = targetStudentId;
          mainOrder.order_type = OrderType.TRANSFER;
          mainOrder.total_fee = 0; // 转让通常不涉及新费用
          mainOrder.paid_fee = 0;
          mainOrder.debt_status = DebtStatus.NORMAL;
          mainOrder.debt_amount = 0; 
          mainOrder.order_date = new Date();
          
          const savedMainOrder = await queryRunner.manager.save(Order, mainOrder);

          const subOrder = new Order();
          subOrder.order_no = `${savedMainOrder.order_no}-1`;
          subOrder.parent = savedMainOrder;
          subOrder.student_id = targetStudentId;
          
          // 如果指定了转让科目，则使用指定科目；否则使用原科目
          const targetSubjectId = transferDetails?.subjectId || sourceOrder.subject_id;
          subOrder.subject_id = targetSubjectId;
          
          subOrder.order_type = OrderType.TRANSFER;
          
          // 如果指定了转让课时数，则使用指定数量；否则使用原剩余总数
          // 注意：如果指定数量与原剩余数量不一致，这通常涉及到折算
          // 这里我们简单处理：源订单总是全部转出（totalRemaining），
          // 目标订单获得的课时数可以是折算后的（transferDetails.amount）
          const targetAmount = transferDetails?.amount || totalRemaining;
          
          subOrder.regular_courses = targetAmount;
          subOrder.gift_courses = 0; // 转让过来的统一算作正价，或者按需分配。这里简化为全部正价。
          
          subOrder.total_fee = 0;
          subOrder.paid_fee = 0; 
          subOrder.debt_amount = 0; 
          subOrder.order_date = new Date();
          subOrder.expire_date = sourceOrder.expire_date; // 继承有效期
          subOrder.source_order_id = sourceOrder.id; // 记录源订单ID，方便后续回滚

          await queryRunner.manager.save(Order, subOrder);

          // 6. 增加目标学员的 StudentCourse
          const targetCourses = await queryRunner.manager.find(Course, { 
              where: { subject_id: targetSubjectId },
              select: ['id'] 
          });

          if (targetCourses.length > 0) {
              const courseIds = targetCourses.map(c => c.id);
              const targetStudentCourses = await queryRunner.manager.find(StudentCourse, {
                  where: {
                      student_id: targetStudentId,
                      course_id: In(courseIds)
                  }
              });

              const targetMap = new Map(targetStudentCourses.map(sc => [sc.course_id, sc]));

              for (const courseId of courseIds) {
                  let sc = targetMap.get(courseId);
                  if (sc) {
                      sc.remaining_courses = Number(sc.remaining_courses || 0) + targetAmount;
                  } else {
                      sc = new StudentCourse();
                      sc.student_id = targetStudentId;
                      sc.course_id = courseId;
                      sc.remaining_courses = targetAmount;
                      sc.status = StudentCourseStatus.ACTIVE;
                  }
                  await queryRunner.manager.save(StudentCourse, sc);
              }
          }

          await queryRunner.commitTransaction();
          return { success: true };

      } catch (err) {
          await queryRunner.rollbackTransaction();
          throw err;
      } finally {
          await queryRunner.release();
      }
  }

  async update(id: number, updateOrderDto: Partial<Order>) {
    // 检查是否在更新状态为取消
    if (updateOrderDto.status === OrderStatus.CANCELLED) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. 更新主订单状态
            await queryRunner.manager.update(Order, id, { status: OrderStatus.CANCELLED });

            // 2. 查找并更新所有子订单状态
            // 只有当这是主订单时，才会有子订单
            const children = await queryRunner.manager.find(Order, { where: { parent_id: id } });
            
            if (children.length > 0) {
                // 检查子订单是否已经有消耗
                for (const child of children) {
                    const consumed = Number(child.consumed_regular_courses || 0) + Number(child.consumed_gift_courses || 0);
                    if (consumed > 0) {
                        // 抛出特定的业务错误，而不是通用 Error，以便 Controller 捕获并返回 400
                        throw new Error('ORDER_HAS_CONSUMPTION');
                    }
                }
                
                // 特殊处理转让订单的回滚
                const mainOrder = await queryRunner.manager.findOne(Order, { where: { id } });
                if (mainOrder && mainOrder.order_type === OrderType.TRANSFER) {
                    // 找到所有子订单（应该只有一个）
                    for (const child of children) {
                        if (child.source_order_id) {
                            const sourceOrder = await queryRunner.manager.findOne(Order, { where: { id: child.source_order_id } });
                            if (sourceOrder) {
                                // 1. 恢复源订单的状态为 ACTIVE
                                sourceOrder.status = OrderStatus.ACTIVE;
                                
                                // 2. 恢复源订单的课时数
                                // 注意：我们之前将源订单的课时数设置为了已消耗数
                                // 现在需要加回来
                                const hoursToReturnRegular = Number(child.regular_courses || 0);
                                const hoursToReturnGift = Number(child.gift_courses || 0);
                                
                                sourceOrder.regular_courses = Number(sourceOrder.regular_courses || 0) + hoursToReturnRegular;
                                sourceOrder.gift_courses = Number(sourceOrder.gift_courses || 0) + hoursToReturnGift;
                                
                                await queryRunner.manager.save(Order, sourceOrder);
                                
                                // 3. 恢复源学员的 StudentCourse
                                const courses = await queryRunner.manager.find(Course, { 
                                    where: { subject_id: sourceOrder.subject_id },
                                    select: ['id'] 
                                });
                                
                                if (courses.length > 0) {
                                    const courseIds = courses.map(c => c.id);
                                    const sourceStudentCourses = await queryRunner.manager.find(StudentCourse, {
                                        where: {
                                            student_id: sourceOrder.student_id,
                                            course_id: In(courseIds)
                                        }
                                    });
                                    
                                    const totalHoursToReturn = hoursToReturnRegular + hoursToReturnGift;
                                    
                                    for (const sc of sourceStudentCourses) {
                                        sc.remaining_courses = Number(sc.remaining_courses || 0) + totalHoursToReturn;
                                        await queryRunner.manager.save(StudentCourse, sc);
                                    }
                                }
                            }
                        }
                    }
                }

                // 回滚 StudentCourse 的剩余课时 (这里是扣除目标学员的课时，原有逻辑已涵盖)
                // 原有逻辑会遍历 children，扣除 student_id (即目标学员) 的课时。
                // 所以我们只需要处理源学员的恢复即可。
                for (const child of children) {
                    const courses = await this.coursesRepository.find({ 
                        where: { subject_id: child.subject_id },
                        select: ['id'] 
                    });
                    
                    if (courses.length > 0) {
                        const courseIds = courses.map(c => c.id);
                        const studentCourses = await this.studentCoursesRepository.find({
                            where: {
                                student_id: child.student_id,
                                course_id: In(courseIds)
                            }
                        });

                        const totalHoursToDeduct = Number(child.regular_courses || 0) + Number(child.gift_courses || 0);

                        for (const sc of studentCourses) {
                            sc.remaining_courses = Number(sc.remaining_courses || 0) - totalHoursToDeduct;
                            await queryRunner.manager.save(StudentCourse, sc);
                        }
                    }
                }

                await queryRunner.manager.update(Order, { parent_id: id }, { status: OrderStatus.CANCELLED });
            }

            await queryRunner.commitTransaction();
            return { success: true };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    return this.ordersRepository.update(id, updateOrderDto);
  }

  remove(id: number) {
    return this.ordersRepository.delete(id);
  }
}
