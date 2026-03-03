
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Role } from './src/modules/access-control/entities/role.entity';
import { Permission } from './src/modules/access-control/entities/permission.entity';
import { User, UserRole } from './src/modules/users/entities/user.entity';

const ROLES = [
  { name: 'super_admin', display_name: '超级管理员', description: '拥有所有权限' },
  { name: 'admin', display_name: '管理员', description: '拥有大部分权限' },
  { name: 'principal', display_name: '校长', description: '查看数据为主' },
  { name: 'academic_dean', display_name: '教务', description: '排课、学员管理' },
  { name: 'teacher', display_name: '老师', description: '查看课表、点名' },
];

const PERMISSIONS = [
  { key: 'dashboard.view', name: '查看仪表盘', group: 'dashboard' },
  
  { key: 'student.view', name: '查看学员', group: 'student' },
  { key: 'student.create', name: '新建学员', group: 'student' },
  { key: 'student.edit', name: '编辑学员', group: 'student' },
  { key: 'student.delete', name: '删除学员', group: 'student' },
  
  { key: 'teacher.view', name: '查看教师', group: 'teacher' },
  { key: 'teacher.create', name: '新建教师', group: 'teacher' },
  { key: 'teacher.edit', name: '编辑教师', group: 'teacher' },
  { key: 'teacher.delete', name: '删除教师', group: 'teacher' },
  
  { key: 'subject.view', name: '查看科目', group: 'subject' },
  { key: 'subject.create', name: '新建科目', group: 'subject' },
  { key: 'subject.edit', name: '编辑科目', group: 'subject' },
  { key: 'subject.delete', name: '删除科目', group: 'subject' },
  
  { key: 'course.view', name: '查看排课', group: 'course' },
  { key: 'course.create', name: '新建排课', group: 'course' },
  { key: 'course.edit', name: '编辑排课', group: 'course' },
  { key: 'course.delete', name: '删除排课', group: 'course' },

  { key: 'stats.view', name: '查看教务图表', group: 'academic' },
  
  { key: 'order.view', name: '查看订单', group: 'order' },
  { key: 'order.create', name: '新建订单', group: 'order' },
  { key: 'order.edit', name: '编辑订单', group: 'order' },
  { key: 'order.delete', name: '作废订单', group: 'order' },
  { key: 'order.supplement', name: '补缴欠费', group: 'order' },
  { key: 'order.transfer', name: '订单转让', group: 'order' },
  { key: 'order.revoke', name: '赠送退课', group: 'order' },
  { key: 'order.refund', name: '订单退费', group: 'order' },
  { key: 'order.edit_expire', name: '修改有效期', group: 'order' },

  { key: 'student.export_attendance', name: '导出签到', group: 'student' },
  
  { key: 'access.view', name: '查看权限管理', group: 'access' },
  { key: 'role.manage', name: '角色管理', group: 'access' },
];

async function seedAccessControl() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);
  const userRepo = dataSource.getRepository(User);

  console.log('Seeding Permissions...');
  const allPermissions: Permission[] = [];
  for (const p of PERMISSIONS) {
    let perm = await permRepo.findOneBy({ key: p.key });
    if (!perm) {
      perm = permRepo.create(p);
      await permRepo.save(perm);
    }
    allPermissions.push(perm);
  }

  console.log('Seeding Roles...');
  for (const r of ROLES) {
    let role = await roleRepo.findOneBy({ name: r.name });
    if (!role) {
      role = roleRepo.create(r);
      // Assign all permissions to super_admin by default
      if (r.name === 'super_admin') {
        role.permissions = allPermissions;
      }
      await roleRepo.save(role);
    } else if (r.name === 'super_admin') {
      // Update super_admin permissions
      role.permissions = allPermissions;
      await roleRepo.save(role);
    }
  }

  console.log('Updating Users...');
  // Find super_admin role
  const superAdminRole = await roleRepo.findOneBy({ name: 'super_admin' });
  const teacherRole = await roleRepo.findOneBy({ name: 'teacher' });
  const academicRole = await roleRepo.findOneBy({ name: 'academic_dean' });
  const adminRole = await roleRepo.findOneBy({ name: 'admin' });

  // Update existing users based on enum
  // admin -> super_admin (for safety, let's make existing admins super admins)
  if (superAdminRole) {
      await userRepo.update({ role: UserRole.ADMIN }, { user_role: superAdminRole });
  }
  if (teacherRole) {
      await userRepo.update({ role: UserRole.TEACHER }, { user_role: teacherRole });
  }
  if (academicRole) {
      await userRepo.update({ role: UserRole.ACADEMIC }, { user_role: academicRole });
  }
  // FINANCE -> maybe admin?
  if (adminRole) {
      await userRepo.update({ role: UserRole.FINANCE }, { user_role: adminRole });
  }

  console.log('Access Control Seeded.');
  await app.close();
}

seedAccessControl();
