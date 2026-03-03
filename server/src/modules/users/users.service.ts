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

  async findAll() {
      return this.usersRepository.find({ relations: ['user_role'] });
  }

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

  async update(id: number, updateUserDto: any): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
        throw new Error('User not found');
    }
    
    if (updateUserDto.password_hash) {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(updateUserDto.password_hash, salt);
        user.password_hash = hashedPassword;
    }
    
    if (updateUserDto.role_id) {
        user.role_id = updateUserDto.role_id;
    }

    if (updateUserDto.username) {
        user.username = updateUserDto.username;
    }
    
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
      await this.usersRepository.delete(id);
  }

  async findOne(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ 
        where: { id },
        relations: ['user_role', 'user_role.permissions']
    });
  }
}
