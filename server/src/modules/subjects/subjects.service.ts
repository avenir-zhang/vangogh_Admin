import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Subject } from './entities/subject.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private subjectsRepository: Repository<Subject>,
  ) {}

  create(createSubjectDto: Partial<Subject>) {
    const subject = this.subjectsRepository.create(createSubjectDto);
    return this.subjectsRepository.save(subject);
  }

  findAll(query?: any) {
    const { name, status } = query || {};
    const where: any = {};
    
    if (name) {
      where.name = Like(`%${name}%`);
    }
    if (status) {
      where.status = status;
    }

    return this.subjectsRepository.find({ where });
  }

  findOne(id: number) {
    return this.subjectsRepository.findOne({ where: { id } });
  }

  update(id: number, updateSubjectDto: Partial<Subject>) {
    return this.subjectsRepository.update(id, updateSubjectDto);
  }

  remove(id: number) {
    return this.subjectsRepository.softDelete(id);
  }
}
