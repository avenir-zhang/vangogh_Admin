import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  findAll() {
    return this.rolesRepository.find({ relations: ['permissions'] });
  }

  findOne(id: number) {
    return this.rolesRepository.findOne({ where: { id }, relations: ['permissions'] });
  }

  async findOneByName(name: string) {
    return this.rolesRepository.findOne({ where: { name } });
  }

  async create(createRoleDto: any) {
    const role = this.rolesRepository.create({
        name: createRoleDto.name,
        display_name: createRoleDto.display_name,
        description: createRoleDto.description,
    });
    
    if (createRoleDto.permissionIds) {
      const permissions = await this.permissionsRepository.findBy({
        id: In(createRoleDto.permissionIds),
      });
      role.permissions = permissions;
    }
    
    return this.rolesRepository.save(role);
  }

  async update(id: number, updateRoleDto: any) {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new Error('Role not found');
    }

    if (updateRoleDto.name) role.name = updateRoleDto.name;
    if (updateRoleDto.display_name) role.display_name = updateRoleDto.display_name;
    if (updateRoleDto.description) role.description = updateRoleDto.description;

    if (updateRoleDto.permissionIds) {
      const permissions = await this.permissionsRepository.findBy({
        id: In(updateRoleDto.permissionIds),
      });
      role.permissions = permissions;
    }

    return this.rolesRepository.save(role);
  }

  remove(id: number) {
    return this.rolesRepository.delete(id);
  }
}
