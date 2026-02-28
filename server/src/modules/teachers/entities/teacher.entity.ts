import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Subject } from '../../subjects/entities/subject.entity';

export enum Gender {
  MALE = '男',
  FEMALE = '女',
}

export enum TeacherStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 18, unique: true, nullable: true })
  id_card: string;

  @Column({
    type: 'enum',
    enum: TeacherStatus,
    default: TeacherStatus.ACTIVE,
  })
  status: TeacherStatus;

  @ManyToMany(() => Subject)
  @JoinTable({
    name: 'teacher_subjects',
    joinColumn: { name: 'teacher_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'subject_id', referencedColumnName: 'id' },
  })
  subjects: Subject[];

  @CreateDateColumn()
  created_at: Date;
}
