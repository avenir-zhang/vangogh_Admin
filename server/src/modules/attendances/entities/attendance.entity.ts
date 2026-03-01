import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Course } from '../../courses/entities/course.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  LEAVE = 'leave',
}

import { Order } from '../../orders/entities/order.entity';

@Entity('attendances')
// @Unique(['student_id', 'course_id', 'attendance_date'])
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column()
  @Index()
  student_id: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column()
  @Index()
  course_id: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ nullable: true })
  order_id: number;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column()
  teacher_id: number;

  @Column({ type: 'date' })
  attendance_date: Date;

  @Column({ type: 'time', nullable: true })
  check_in_time: string;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  hours_deducted: number;

  @Column({ length: 100, nullable: true })
  remark: string;

  @CreateDateColumn()
  created_at: Date;
}
