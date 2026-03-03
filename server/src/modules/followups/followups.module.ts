import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowupsService } from './followups.service';
import { FollowupsController } from './followups.controller';
import { FollowupRecord } from './entities/followup-record.entity';
import { FollowupLog } from './entities/followup-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FollowupRecord, FollowupLog])],
  controllers: [FollowupsController],
  providers: [FollowupsService],
  exports: [FollowupsService],
})
export class FollowupsModule {}
