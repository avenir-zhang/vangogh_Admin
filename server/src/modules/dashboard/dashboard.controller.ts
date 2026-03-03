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

  @Get('teacher-timeseries')
  async getTeacherTimeSeries(@Query() query: any) {
    const { teacher_id, start_date, end_date, granularity } = query;
    return {
      success: true,
      data: await this.dashboardService.getTeacherTimeSeries(
        Number(teacher_id),
        start_date,
        end_date,
        granularity || 'day',
      ),
    };
  }

  @Get('subject-timeseries')
  async getSubjectTimeSeries(@Query() query: any) {
    const { subject_id, start_date, end_date, granularity } = query;
    return {
      success: true,
      data: await this.dashboardService.getSubjectTimeSeries(
        Number(subject_id),
        start_date,
        end_date,
        granularity || 'day',
      ),
    };
  }

  @Get('student-timeseries')
  async getStudentTimeSeries(@Query() query: any) {
    const { student_id, start_date, end_date, granularity } = query;
    return {
      success: true,
      data: await this.dashboardService.getStudentTimeSeries(
        Number(student_id),
        start_date,
        end_date,
        granularity || 'day',
      ),
    };
  }

  @Get('revenue-timeseries')
  async revenueTimeSeries(@Query() query: any) {
    const { start_date, end_date, granularity } = query;
    return { success: true, data: await this.dashboardService.getRevenueTimeSeries(start_date, end_date, granularity || 'day') };
  }

  @Get('order-type-distribution')
  async orderTypeDistribution(@Query() query: any) {
    const { start_date, end_date } = query;
    return { success: true, data: await this.dashboardService.getOrderTypeDistribution(start_date, end_date) };
  }

  @Get('teacher-income')
  async teacherIncome(@Query() query: any) {
    const { start_date, end_date } = query;
    return { success: true, data: await this.dashboardService.getTeacherIncome(start_date, end_date) };
  }

  @Get('subject-income')
  async subjectIncome(@Query() query: any) {
    const { start_date, end_date } = query;
    return { success: true, data: await this.dashboardService.getSubjectIncome(start_date, end_date) };
  }

  @Get('top')
  async top(@Query() query: any) {
    const { type, start_date, end_date, limit } = query;
    return { success: true, data: await this.dashboardService.getTop(type || 'subject', start_date, end_date, Number(limit || 10)) };
  }

  @Get('kpi')
  async kpi(@Query() query: any) {
    const { start_date, end_date } = query;
    return { success: true, data: await this.dashboardService.getKPI(start_date, end_date) };
  }

  @Get('presets')
  async presets(@Request() req) {
    const user = req.user;
    return { success: true, data: await this.dashboardService.getPresets(user) };
  }

  @Get('recognized-revenue')
  async recognizedRevenue(@Query() query: any) {
    const { start_date, end_date } = query;
    return { success: true, data: await this.dashboardService.getRecognizedRevenue(start_date, end_date) };
  }

  @Get('deferred-revenue')
  async deferredRevenue() {
    return { success: true, data: await this.dashboardService.getDeferredRevenue() };
  }

  @Get('refund-summary')
  async refundSummary(@Query() query: any) {
    const { start_date, end_date } = query;
    return { success: true, data: await this.dashboardService.getRefundSummary(start_date, end_date) };
  }
}
