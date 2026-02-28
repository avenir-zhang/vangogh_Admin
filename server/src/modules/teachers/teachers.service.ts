import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Teacher } from './entities/teacher.entity';
import { Subject } from '../subjects/entities/subject.entity';

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(Subject)
    private subjectsRepository: Repository<Subject>,
  ) {}

  async create(createTeacherDto: any) {
    const { subjectIds, ...teacherData } = createTeacherDto;
    const teacher = this.teachersRepository.create(teacherData as Teacher);
    
    if (subjectIds && subjectIds.length > 0) {
      const subjects = await this.subjectsRepository.findBy({ id: In(subjectIds) });
      teacher.subjects = subjects;
    }
    
    return this.teachersRepository.save(teacher);
  }

  findAll(search?: string) {
    if (search) {
      return this.teachersRepository.find({
        where: [
          { name: Like(`%${search}%`) },
          { phone: Like(`%${search}%`) },
        ],
        relations: ['subjects'],
      });
    }
    return this.teachersRepository.find({ relations: ['subjects'] });
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
}
