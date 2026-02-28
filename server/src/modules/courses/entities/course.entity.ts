import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Subject } from '../../subjects/entities/subject.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';

export enum ScheduleType {
  WEEKLY = 'weekly',
  DAILY = 'daily',
  BIWEEKLY = 'biweekly',
}

export enum CourseStatus {
  ACTIVE = 'active',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column()
  subject_id: number;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column()
  teacher_id: number;

  @Column({
    type: 'enum',
    enum: ScheduleType,
  })
  schedule_type: ScheduleType;

  @Column({
    type: 'set',
    enum: [0, 1, 2, 3, 4, 5, 6],
    nullable: true,
  })
  schedule_days: string;

  @Column({ type: 'time', nullable: true })
  start_time: string;

  @Column({ type: 'time', nullable: true })
  end_time: string;

  @Column({ default: 0 })
  max_students: number;

  @Column({ default: 0 })
  current_students: number;

  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.ACTIVE,
  })
  status: CourseStatus;
}
