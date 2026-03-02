import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary() {
    const data = await this.dashboardService.getSummary();
    return { success: true, data };
  }

  @Get('financial')
  async getFinancial() {
    const data = await this.dashboardService.getFinancial();
    return { success: true, data };
  }

  @Get('attendance-trend')
  async getAttendanceTrend() {
    const data = await this.dashboardService.getAttendanceTrend();
    return { success: true, data };
  }

  @Get('arrears-list')
  async getArrearsList() {
    const data = await this.dashboardService.getArrearsList();
    return { success: true, data };
  }

  @Get('expiring-list')
  async getExpiringList() {
    const data = await this.dashboardService.getExpiringList();
    return { success: true, data };
  }

  @Get('exceeded-list')
  async getExceededList() {
    const data = await this.dashboardService.getExceededList();
    return { success: true, data };
  }
}
