import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('share_links')
export class ShareLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string; // UUID or random string

  @Column()
  type: string; // e.g., 'student_attendance'

  @Column({ type: 'json', nullable: true })
  data: any; // Store related IDs, e.g., { studentId: 1 }

  @Column({ nullable: true })
  password: string;

  @Column({ type: 'datetime', nullable: true })
  expire_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @Column({ default: true })
  is_active: boolean;
}
