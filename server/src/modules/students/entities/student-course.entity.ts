import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './student.entity';
import { Course } from '../../courses/entities/course.entity';
import { Order } from '../../orders/entities/order.entity';

export enum StudentCourseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  FINISHED = 'finished',
}

@Entity('student_courses')
export class StudentCourse {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column()
  student_id: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column()
  course_id: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column()
  order_id: number;

  @Column()
  remaining_courses: number;

  @Column({ type: 'date', nullable: true })
  expire_date: Date;

  @Column({
    type: 'enum',
    enum: StudentCourseStatus,
    default: StudentCourseStatus.ACTIVE,
  })
  status: StudentCourseStatus;
}
