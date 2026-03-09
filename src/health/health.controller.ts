import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { PushService } from '../channels/push/push.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private firebaseCache: { result: { status: string }; checkedAt: number } | null = null;
  private readonly CACHE_TTL = 60_000; // 1 minute

  constructor(private readonly dataSource: DataSource, private readonly pushService: PushService) {}

  @Get()
  @ApiOperation({ summary: 'Service health check' })
  async check() {
    const db = await this.checkDatabase();
    const firebase = await this.checkFirebase();

    return {
      status: db.status === 'up' && firebase.status !== 'error' ? 'ok' : 'degraded',
      database: db,
      firebase,
    };
  }

  private async checkDatabase() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up' };
    } catch {
      return { status: 'down' };
    }
  }

  private async checkFirebase() {
    if (!this.pushService.isConfigured()) {
      return { status: 'not_configured' };
    }

    if (this.firebaseCache && Date.now() - this.firebaseCache.checkedAt < this.CACHE_TTL) {
      return this.firebaseCache.result;
    }

    try {
      const messageId = await this.pushService.sendDryRun('health-check');
      const result = {
        status: 'up',
        projectId: this.pushService.getProjectId(),
        dryRunMessageId: messageId,
      };
      this.firebaseCache = { result, checkedAt: Date.now() };
      return result;
    } catch (err) {
      const result = {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
      this.firebaseCache = { result, checkedAt: Date.now() };
      return result;
    }
  }
}
