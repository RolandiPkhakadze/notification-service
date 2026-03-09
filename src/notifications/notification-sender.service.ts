import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../channels/email/email.service';
import { PushService } from '../channels/push/push.service';
import { SmsService } from '../channels/sms/sms.service';
import { Notification, NotificationStatus } from '../database/entities/notification.entity';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

@Injectable()
export class NotificationSender {
  private readonly logger = new Logger(NotificationSender.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  /** Fire-and-forget: sends email in background with retries. */
  sendEmail(notificationId: string, payload: { to: string; subject: string; text?: string; html?: string }): void {
    this.executeWithRetry(notificationId, async () => {
      const result = await this.emailService.send(payload);
      await this.markSent(notificationId, result.providerMessageId, 'sendgrid');
    });
  }

  /** Fire-and-forget: sends SMS in background with retries. */
  sendSms(notificationId: string, payload: { to: string; body: string }): void {
    this.executeWithRetry(notificationId, async () => {
      const result = await this.smsService.send(payload);
      await this.markSent(notificationId, result.providerMessageId, 'twilio');
    });
  }

  /** Fire-and-forget: sends push in background with retries. */
  sendPush(
    notificationId: string,
    payload: {
      token?: string;
      topic?: string;
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): void {
    this.executeWithRetry(notificationId, async () => {
      let result: { providerMessageId: string };

      if (payload.token) {
        result = await this.pushService.sendToDevice({
          token: payload.token,
          title: payload.title,
          body: payload.body,
          data: payload.data,
        });
      } else if (payload.topic) {
        result = await this.pushService.sendToTopic({
          topic: payload.topic,
          title: payload.title,
          body: payload.body,
          data: payload.data,
        });
      } else {
        throw new Error('Push notification requires either token or topic');
      }

      await this.markSent(notificationId, result.providerMessageId, 'firebase');
    });
  }

  private executeWithRetry(notificationId: string, fn: () => Promise<void>): void {
    this.attempt(notificationId, fn, 1).catch(() => {
      // already handled inside attempt()
    });
  }

  private async attempt(notificationId: string, fn: () => Promise<void>, attempt: number): Promise<void> {
    try {
      await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (attempt < MAX_ATTEMPTS) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Notification ${notificationId} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${message}. Retrying in ${delay}ms`,
        );
        await this.sleep(delay);
        return this.attempt(notificationId, fn, attempt + 1);
      }

      this.logger.error(`Notification ${notificationId} failed after ${MAX_ATTEMPTS} attempts: ${message}`);
      await this.markFailed(notificationId, message);
    }
  }

  private async markSent(notificationId: string, providerMessageId: string, provider: string): Promise<void> {
    await this.notificationRepo.update(notificationId, {
      status: NotificationStatus.SENT,
      providerMessageId,
      provider,
    });
    this.logger.log(`Notification ${notificationId} sent via ${provider}`);
  }

  private async markFailed(notificationId: string, errorMessage: string): Promise<void> {
    await this.notificationRepo.update(notificationId, {
      status: NotificationStatus.FAILED,
      errorMessage,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
