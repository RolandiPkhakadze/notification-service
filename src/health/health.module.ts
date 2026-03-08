import { Module } from '@nestjs/common';
import { PushModule } from '../channels/push/push.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PushModule],
  controllers: [HealthController],
})
export class HealthModule {}
