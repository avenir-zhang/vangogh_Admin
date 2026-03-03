import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FollowupRecord, FollowupStatus, FollowupType } from './entities/followup-record.entity';
import { FollowupLog } from './entities/followup-log.entity';

@Injectable()
export class FollowupsService {
  constructor(
    @InjectRepository(FollowupRecord)
    private repo: Repository<FollowupRecord>,
    @InjectRepository(FollowupLog)
    private logRepo: Repository<FollowupLog>,
  ) {}

  async mark(params: { key: string; type: FollowupType; status?: FollowupStatus; remark?: string }) {
    const { key, type, status = FollowupStatus.DONE, remark } = params;
    let record = await this.repo.findOne({ where: { key } });
    if (!record) {
      record = this.repo.create({ key, type, status, remark: remark || null });
    } else {
      record.status = status;
      if (remark !== undefined) record.remark = remark;
    }
    await this.repo.save(record);
    await this.logRepo.save(this.logRepo.create({ key, type, remark: remark || null }));
    return record;
  }

  async status(keys: string[]) {
    if (!keys || keys.length === 0) return [];
    return this.repo.find({ where: { key: In(keys) } });
  }

  async records(key: string) {
    return this.logRepo.find({ where: { key }, order: { created_at: 'DESC' as any } });
  }
}
