import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate, OneToMany } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Subject } from '../../subjects/entities/subject.entity';

export enum DebtStatus {
  NORMAL = 'normal',
  DEBT = 'debt',
}

export enum OrderType {
  NEW = 'new',
  RENEW = 'renew',
  SUPPLEMENT = 'supplement',
}

export enum OrderStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  order_no: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column()
  student_id: number;

  // 主订单不一定有科目，子订单必须有
  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ nullable: true })
  subject_id: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  regular_courses: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  gift_courses: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  consumed_regular_courses: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  consumed_gift_courses: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paid_fee: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0
  })
  debt_amount: number;

  @Column({
    type: 'enum',
    enum: DebtStatus,
    default: DebtStatus.NORMAL,
  })
  debt_status: DebtStatus;

  @BeforeInsert()
  @BeforeUpdate()
  calculateDebt() {
    // 只有主订单才需要计算欠费
    if (!this.parent_id) {
        this.debt_amount = this.total_fee - this.paid_fee;
        this.debt_status = this.debt_amount > 0 ? DebtStatus.DEBT : DebtStatus.NORMAL;
    }
  }

  @Column({
    type: 'enum',
    enum: OrderType,
  })
  order_type: OrderType;

  // Parent Order Relation
  @ManyToOne(() => Order, (order) => order.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Order;

  @Column({ nullable: true })
  parent_id: number;

  // Children Orders Relation
  @OneToMany(() => Order, (order) => order.parent)
  children: Order[];

  @Column({ type: 'date', nullable: true })
  order_date: Date;

  @Column({ type: 'date', nullable: true })
  expire_date: Date;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.ACTIVE,
  })
  status: OrderStatus;

  @CreateDateColumn()
  created_at: Date;

  @BeforeInsert()
  setDefaultOrderDate() {
    if (!this.order_date) {
      this.order_date = new Date();
    }
  }
}
