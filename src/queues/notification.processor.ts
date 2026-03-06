import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { EmailService } from '../channels/email/email.service';
import { PushService } from '../channels/push/push.service';
import { SmsService } from '../channels/sms/sms.service';
import {
  Notification,
  NotificationStatus,
} from '../database/entities/notification.entity';
import {
  EmailJobPayload,
  NOTIFICATION_QUEUE,
  PushJobPayload,
  QUEUE_JOBS,
  SmsJobPayload,
} from './notification.queue';

@Processor(NOTIFICATION_QUEUE, {
  concurrency: 5,
})
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case QUEUE_JOBS.SEND_EMAIL:
        await this.handleEmail(job as Job<EmailJobPayload>);
        break;
      case QUEUE_JOBS.SEND_SMS:
        await this.handleSms(job as Job<SmsJobPayload>);
        break;
      case QUEUE_JOBS.SEND_PUSH:
        await this.handlePush(job as Job<PushJobPayload>);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleEmail(job: Job<EmailJobPayload>): Promise<void> {
    const { notificationId, to, subject, text, html } = job.data;
    try {
      const result = await this.emailService.send({ to, subject, text, html });
      await this.markSent(notificationId, result.providerMessageId, 'sendgrid');
    } catch (err) {
      await this.markFailed(notificationId, err);
      throw err; // rethrow so BullMQ retries
    }
  }

  private async handleSms(job: Job<SmsJobPayload>): Promise<void> {
    const { notificationId, to, body } = job.data;
    try {
      const result = await this.smsService.send({ to, body });
      await this.markSent(notificationId, result.providerMessageId, 'twilio');
    } catch (err) {
      await this.markFailed(notificationId, err);
      throw err;
    }
  }

  private async handlePush(job: Job<PushJobPayload>): Promise<void> {
    const { notificationId, token, topic, title, body, data } = job.data;
    try {
      let result: { providerMessageId: string };
      if (token) {
        result = await this.pushService.sendToDevice({
          token,
          title,
          body,
          data,
        });
      } else if (topic) {
        result = await this.pushService.sendToTopic({
          topic,
          title,
          body,
          data,
        });
      } else {
        throw new Error('Push notification requires either token or topic');
      }
      await this.markSent(notificationId, result.providerMessageId, 'firebase');
    } catch (err) {
      await this.markFailed(notificationId, err);
      throw err;
    }
  }

  private async markSent(
    notificationId: string,
    providerMessageId: string,
    provider: string,
  ): Promise<void> {
    await this.notificationRepo.update(notificationId, {
      status: NotificationStatus.SENT,
      providerMessageId,
      provider,
    });
    this.logger.log(`Notification ${notificationId} marked as sent`);
  }

  private async markFailed(
    notificationId: string,
    err: unknown,
  ): Promise<void> {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await this.notificationRepo.update(notificationId, {
      status: NotificationStatus.FAILED,
      errorMessage,
    });
    this.logger.error(`Notification ${notificationId} failed: ${errorMessage}`);
  }
}
