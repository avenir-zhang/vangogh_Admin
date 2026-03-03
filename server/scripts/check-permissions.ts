
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Role } from '../src/modules/access-control/entities/role.entity';
import { Permission } from '../src/modules/access-control/entities/permission.entity';

async function checkPermissions() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);

  const statsPerm = await permRepo.findOneBy({ key: 'stats.view' });
  console.log('stats.view permission:', statsPerm);

  const superAdmin = await roleRepo.findOne({ 
      where: { name: 'super_admin' },
      relations: ['permissions']
  });
  
  if (superAdmin) {
      const hasPerm = superAdmin.permissions.some(p => p.key === 'stats.view');
      console.log('super_admin has stats.view:', hasPerm);
      console.log('super_admin permissions count:', superAdmin.permissions.length);
  } else {
      console.log('super_admin role not found');
  }

  await app.close();
}

checkPermissions();
