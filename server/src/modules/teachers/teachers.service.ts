import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Teacher } from './entities/teacher.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { UsersService } from '../users/users.service';
import { RolesService } from '../access-control/roles.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Attendance } from '../attendances/entities/attendance.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(Subject)
    private subjectsRepository: Repository<Subject>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private usersService: UsersService,
    private rolesService: RolesService,
  ) {}

  async create(createTeacherDto: any) {
    const { subjectIds, ...teacherData } = createTeacherDto;
    
    // 1. Create Teacher
    const teacher = this.teachersRepository.create(teacherData as Teacher);
    
    if (subjectIds && subjectIds.length > 0) {
      const subjects = await this.subjectsRepository.findBy({ id: In(subjectIds) });
      teacher.subjects = subjects;
    }
    
    const savedTeacher = await this.teachersRepository.save(teacher);

    // 2. Create User Account for Teacher
    // Username: teacher's phone (fallback to name + random)
    // Password: default to last 6 digits of phone or 123456
    const phone = createTeacherDto.phone; // use dto directly
    // Generate unique username
    let username = phone;
    if (!username) {
        username = `t${String(savedTeacher.id).padStart(4, '0')}`;
    }
    
    // Check if username exists, if so append random
    let userExists = await this.usersService.findOne(username);
    while (userExists) {
        username = `${username}_${Math.floor(Math.random() * 100)}`;
        userExists = await this.usersService.findOne(username);
    }
    
    const password = phone && phone.length >= 6 ? phone.slice(-6) : '123456';
    
    // Find teacher role
    const teacherRole = await this.rolesService.findOneByName('teacher');
    
    try {
        const user = await this.usersService.create({
            username,
            password_hash: password,
            role: UserRole.TEACHER,
            role_id: teacherRole?.id,
            teacher_id: savedTeacher.id,
        });
        
        // Update teacher with user_id
        savedTeacher.user_id = user.id;
        await this.teachersRepository.save(savedTeacher);
        
    } catch (e) {
        console.error('Failed to create user for teacher:', e);
    }
    
    return savedTeacher;
  }

  findAll(query?: any) {
    const { name, phone, gender, status } = query || {};
    const where: any = {};
    
    if (name) {
      where.name = Like(`%${name}%`);
    }
    if (phone) {
      where.phone = Like(`%${phone}%`);
    }
    if (gender) {
      where.gender = gender;
    }
    if (status) {
      where.status = status;
    }

    return this.teachersRepository.find({ 
      where,
      relations: ['subjects'] 
    });
  }

  findOne(id: number) {
    return this.teachersRepository.findOne({ where: { id }, relations: ['subjects'] });
  }

  async update(id: number, updateTeacherDto: any) {
    const { subjectIds, ...teacherData } = updateTeacherDto;
    const teacher = await this.teachersRepository.preload({
      id: id,
      ...teacherData,
    });

    if (!teacher) {
      throw new Error(`Teacher #${id} not found`);
    }

    if (subjectIds) {
      const subjects = await this.subjectsRepository.findBy({ id: In(subjectIds) });
      teacher.subjects = subjects;
    }

    return this.teachersRepository.save(teacher);
  }

  remove(id: number) {
    return this.teachersRepository.delete(id);
  }

  async summary(id: number, start?: string, end?: string) {
    const teacher = await this.teachersRepository.findOne({ where: { id }, relations: ['subjects'] });
    if (!teacher) {
      throw new Error(`Teacher #${id} not found`);
    }

    const where: any = { teacher_id: id };
    if (start && end) {
      where.attendance_date = Between(start, end);
    } else if (start) {
      where.attendance_date = MoreThanOrEqual(start);
    } else if (end) {
      where.attendance_date = LessThanOrEqual(end);
    }

    const records = await this.attendanceRepository.createQueryBuilder('a')
      .leftJoin(Course, 'c', 'c.id = a.course_id')
      .leftJoin(Subject, 's', 's.id = c.subject_id')
      .where('a.teacher_id = :id', { id })
      .andWhere(start ? 'a.attendance_date >= :start' : '1=1', { start })
      .andWhere(end ? 'a.attendance_date <= :end' : '1=1', { end })
      .select([
        'a.id as id',
        'a.attendance_date as attendanceDate',
        'a.hours_deducted as hoursDeducted',
        'a.status as status',
        'c.name as courseName',
        's.name as subjectName',
      ])
      .orderBy('a.attendance_date', 'DESC')
      .getRawMany();

    const totalHours = records.reduce((s, r) => s + Number(r.hoursDeducted || 0), 0);

    return {
      success: true,
      data: {
        teacher,
        records,
        totalHours,
      },
    };
  }
}
