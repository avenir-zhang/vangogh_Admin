import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum FollowupType {
  ARREARS = 'arrears',
  EXPIRING = 'expiring',
  EXCEEDED = 'exceeded',
}

export enum FollowupStatus {
  OPEN = 'open',
  DONE = 'done',
}

@Entity('followup_records')
export class FollowupRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 255 })
  key: string;

  @Column({ type: 'enum', enum: FollowupType })
  type: FollowupType;

  @Column({ type: 'enum', enum: FollowupStatus, default: FollowupStatus.DONE })
  status: FollowupStatus;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

