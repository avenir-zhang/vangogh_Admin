import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string; // e.g., 'student.view', 'order.create'

  @Column()
  name: string; // e.g., '查看学员'

  @Column({ nullable: true })
  group: string; // e.g., 'student', 'order' - for grouping in UI
}
