import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export enum Gender {
  MALE = '男',
  FEMALE = '女',
}

export enum StudentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  GRADUATED = 'graduated',
}

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 50, nullable: true })
  nickname: string;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Column({ length: 18, unique: true, nullable: true })
  id_card: string;

  @Column({ type: 'date', nullable: true })
  birth_date: Date;

  // @Column({
  //   generatedType: 'STORED',
  //   asExpression: 'TIMESTAMPDIFF(YEAR, birth_date, CURDATE())'
  // })
  // age: number;
  get age(): number {
    if (!this.birth_date) return 0;
    const today = new Date();
    const birthDate = new Date(this.birth_date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  }

  @Column({ length: 200, nullable: true })
  address: string;

  @Column({ length: 50, nullable: true })
  emergency_contact: string;

  @Column({ length: 20, nullable: true })
  emergency_phone: string;

  @Column({ type: 'date', default: () => '(CURRENT_DATE)' })
  registration_date: Date;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ACTIVE,
  })
  status: StudentStatus;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
