import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationStatus,
} from '../database/entities/notification.entity';

interface SendGridEvent {
  event: string;
  sg_message_id?: string;
  reason?: string;
  email?: string;
  timestamp?: number;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly config: ConfigService,
  ) {}

  verifySignature(payload: Buffer, signature: string, timestamp: string): void {
    const secret = this.config.get<string>('SENDGRID_WEBHOOK_SECRET');
    if (!secret) return; // skip in dev if not configured

    const timestampedPayload = timestamp + payload.toString();
    const expected = crypto
      .createHmac('sha256', secret)
      .update(timestampedPayload)
      .digest('base64');

    if (expected !== signature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  async handleSendGridEvents(events: SendGridEvent[]): Promise<void> {
    for (const event of events) {
      const messageId = event.sg_message_id?.split('.')[0];
      if (!messageId) continue;

      this.logger.log(`SendGrid event: ${event.event}, messageId=${messageId}`);

      switch (event.event) {
        case 'delivered':
          await this.updateByProviderMessageId(
            messageId,
            NotificationStatus.DELIVERED,
          );
          break;
        case 'bounce':
        case 'blocked':
        case 'dropped':
          await this.updateByProviderMessageId(
            messageId,
            NotificationStatus.FAILED,
            event.reason,
          );
          break;
        case 'open':
          await this.updateMetadata(messageId, {
            openedAt: new Date().toISOString(),
          });
          break;
        case 'click':
          await this.updateMetadata(messageId, {
            clickedAt: new Date().toISOString(),
          });
          break;
        default:
          this.logger.debug(`Unhandled SendGrid event: ${event.event}`);
      }
    }
  }

  private async updateByProviderMessageId(
    providerMessageId: string,
    status: NotificationStatus,
    errorMessage?: string,
  ): Promise<void> {
    await this.notificationRepo.update(
      { providerMessageId },
      { status, ...(errorMessage && { errorMessage }) },
    );
  }

  private async updateMetadata(
    providerMessageId: string,
    extra: Record<string, unknown>,
  ): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { providerMessageId },
    });
    if (!notification) return;

    await this.notificationRepo.update(notification.id, {
      metadata: { ...(notification.metadata ?? {}), ...extra },
    });
  }
}
