
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DashboardService } from './src/modules/dashboard/dashboard.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dashboardService = app.get(DashboardService);

  console.log('--- Summary ---');
  const summary = await dashboardService.getSummary();
  console.log(summary);

  console.log('--- Attendance Trend ---');
  const trend = await dashboardService.getAttendanceTrend();
  console.log(trend);

  console.log('--- Arrears List ---');
  const arrears = await dashboardService.getArrearsList();
  console.log(arrears);

  console.log('--- Expiring List ---');
  const expiring = await dashboardService.getExpiringList();
  console.log(expiring);

  await app.close();
}

bootstrap();
