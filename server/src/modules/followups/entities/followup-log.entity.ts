import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { FollowupType } from './followup-record.entity';

@Entity('followup_logs')
export class FollowupLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ length: 255 })
  key: string;

  @Column({ type: 'enum', enum: FollowupType })
  type: FollowupType;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @CreateDateColumn()
  created_at: Date;
}

