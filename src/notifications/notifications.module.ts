import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../channels/email/email.module';
import { PushModule } from '../channels/push/push.module';
import { SmsModule } from '../channels/sms/sms.module';
import { Notification } from '../database/entities/notification.entity';
import { User } from '../database/entities/user.entity';
import { NotificationProcessor } from '../queues/notification.processor';
import { NOTIFICATION_QUEUE } from '../queues/notification.queue';
import { TemplatesModule } from '../templates/templates.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    EmailModule,
    SmsModule,
    PushModule,
    TemplatesModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationProcessor],
})
export class NotificationsModule {}
