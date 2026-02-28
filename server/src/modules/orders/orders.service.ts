import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Order } from './entities/order.entity';
import { StudentCourse } from '../students/entities/student-course.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(StudentCourse)
    private studentCoursesRepository: Repository<StudentCourse>,
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
              subOrder.course_id = item.course_id; // 保存课程ID
              subOrder.regular_courses = item.regular_courses;
              subOrder.gift_courses = item.gift_courses;
              subOrder.total_fee = item.total_fee;
              subOrder.paid_fee = 0; // 子订单不记录实付，统一在主订单
              
              const savedSubOrder = await queryRunner.manager.save(Order, subOrder);

              // 3. 创建学员课程记录 (针对子订单)
              const { course_id } = item;
              if (course_id) {
                  const studentCourse = new StudentCourse();
                  studentCourse.student_id = savedMainOrder.student_id;
                  studentCourse.course_id = course_id;
                  studentCourse.order_id = savedSubOrder.id; // 关联到子订单
                  studentCourse.remaining_courses = (Number(savedSubOrder.regular_courses) || 0) + (Number(savedSubOrder.gift_courses) || 0);
                  studentCourse.expire_date = savedSubOrder.expire_date;
                  await queryRunner.manager.save(StudentCourse, studentCourse);
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
          relations: ['student', 'children', 'children.subject', 'children.course'] // 加载子订单的课程信息
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
          // 通过 order_id 找到 StudentCourse
          const studentCourse = await this.studentCoursesRepository.findOne({ where: { order_id: id } });
          if (studentCourse) {
              studentCourse.expire_date = newExpireDate as any;
              await queryRunner.manager.save(StudentCourse, studentCourse);
          }

          await queryRunner.commitTransaction();
          return order;
      } catch (err) {
          await queryRunner.rollbackTransaction();
          throw err;
      } finally {
          await queryRunner.release();
      }
  }

  update(id: number, updateOrderDto: Partial<Order>) {
    return this.ordersRepository.update(id, updateOrderDto);
  }

  remove(id: number) {
    return this.ordersRepository.delete(id);
  }
}
