import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(user: Partial<User>): Promise<User> {
    if (!user.password_hash) {
      throw new Error('Password is required');
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(user.password_hash, salt);
    // 创建一个新的对象，避免修改传入的参数，并明确指定类型
    const newUser = this.usersRepository.create({
      ...user,
      password_hash: hashedPassword,
    } as User);
    return this.usersRepository.save(newUser);
  }

  async findOne(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
