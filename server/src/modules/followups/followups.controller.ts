import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FollowupsService } from './followups.service';
import { FollowupStatus, FollowupType } from './entities/followup-record.entity';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('followup')
export class FollowupsController {
  constructor(private readonly service: FollowupsService) {}

  @Post('mark')
  async mark(@Body() body: { key: string; type: FollowupType; status?: FollowupStatus; remark?: string }) {
    const data = await this.service.mark(body);
    return { success: true, data };
  }

  @Get('status')
  async getStatus(@Query('keys') keys: string) {
    const arr = (keys || '').split(',').map((s) => s.trim()).filter(Boolean);
    const data = await this.service.status(arr);
    return { success: true, data };
  }

  @Get('records')
  async getRecords(@Query('key') key: string) {
    const data = await this.service.records(key);
    return { success: true, data };
  }
}
