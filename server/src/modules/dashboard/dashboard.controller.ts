import { Controller, Get, UseGuards, Query, Request } from '@nestjs/common';
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
  
  @Get('teacher-stats')
  async getTeacherStats(@Query() query: any, @Request() req) {
    const { start_date, end_date } = query;
    const user = req.user;
    return { 
        success: true, 
        data: await this.dashboardService.getTeacherStats(start_date, end_date, user) 
    };
  }

  @Get('subject-stats')
  async getSubjectStats(@Query() query: any) {
    const { start_date, end_date } = query;
    return { 
        success: true, 
        data: await this.dashboardService.getSubjectStats(start_date, end_date) 
    };
  }
}
