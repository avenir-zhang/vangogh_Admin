import { Controller, Post, Body, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create/attendance')
  async createAttendanceShare(@Body() body: { studentId: number; expireInDays?: number; password?: string }) {
    const link = await this.shareService.createAttendanceShare(body.studentId, {
      expireInDays: body.expireInDays,
      password: body.password,
    });
    // Return the full share URL or just the code
    return { success: true, data: { code: link.code, url: `/share/attendance/${link.code}` } };
  }

  // Public access
  @Get(':code')
  async getShareContent(@Param('code') code: string, @Query('password') password?: string) {
    const result = await this.shareService.getShareContent(code, password);
    return { success: true, data: result };
  }
}
