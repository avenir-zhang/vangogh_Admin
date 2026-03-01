import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, In } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { StudentCourse } from '../students/entities/student-course.entity';
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
                  const studentCourses = await this.studentCoursesRepository.find({
                      where: {
                          student_id: savedMainOrder.student_id,
                          course_id: In(courseIds)
                      }
                  });

                  const totalHoursToAdd = Number(item.regular_courses || 0) + Number(item.gift_courses || 0);

                  for (const sc of studentCourses) {
                      sc.remaining_courses = Number(sc.remaining_courses || 0) + totalHoursToAdd;
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
    const { current, pageSize, ...filter } = query || {};
    // 只查询主订单 (parent_id IS NULL)
    return this.ordersRepository.find({ 
      where: { ...filter, parent_id: IsNull() }, 
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
                // 回滚 StudentCourse 的剩余课时
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
