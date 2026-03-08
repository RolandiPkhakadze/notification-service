import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../channels/email/email.module';
import { PushModule } from '../channels/push/push.module';
import { SmsModule } from '../channels/sms/sms.module';
import { Notification } from '../database/entities/notification.entity';
import { User } from '../database/entities/user.entity';
import { TemplatesModule } from '../templates/templates.module';
import { NotificationSender } from './notification-sender.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    EmailModule,
    SmsModule,
    PushModule,
    TemplatesModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationSender],
})
export class NotificationsModule {}
