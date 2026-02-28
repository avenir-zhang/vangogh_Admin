import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum SubjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: SubjectStatus,
    default: SubjectStatus.ACTIVE,
  })
  status: SubjectStatus;
}
