import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { TemplatesService } from '../templates/templates.service';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
} from '../database/entities/notification.entity';
import { User } from '../database/entities/user.entity';
import { NOTIFICATION_QUEUE, QUEUE_JOBS } from '../queues/notification.queue';
import { BulkSendDto } from './dto/bulk-send.dto';
import { SendEmailTemplateDto } from './dto/send-email-template.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { SendPushDto } from './dto/send-push.dto';
import { SendSmsDto } from './dto/send-sms.dto';

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly queue: Queue,
    private readonly templatesService: TemplatesService,
  ) {}

  async sendEmail(dto: SendEmailDto) {
    const notification = await this.createNotification(
      NotificationChannel.EMAIL,
      dto.userId,
    );

    await this.queue.add(
      QUEUE_JOBS.SEND_EMAIL,
      {
        notificationId: notification.id,
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
      },
      JOB_OPTIONS,
    );

    this.logger.log(
      `Email job queued for ${dto.to}, notificationId=${notification.id}`,
    );
    return { notificationId: notification.id, status: notification.status };
  }

  async sendEmailWithTemplate(dto: SendEmailTemplateDto) {
    const template = await this.templatesService.findByName(dto.templateName);
    const body = this.templatesService.renderBody(
      template.body,
      dto.variables ?? {},
    );
    const subject = template.subject
      ? this.templatesService.renderBody(template.subject, dto.variables ?? {})
      : dto.templateName;

    return this.sendEmail({
      to: dto.to,
      subject,
      html: body,
      userId: dto.userId,
    });
  }

  async sendSms(dto: SendSmsDto) {
    const notification = await this.createNotification(
      NotificationChannel.SMS,
      dto.userId,
    );

    await this.queue.add(
      QUEUE_JOBS.SEND_SMS,
      { notificationId: notification.id, to: dto.to, body: dto.body },
      JOB_OPTIONS,
    );

    this.logger.log(
      `SMS job queued for ${dto.to}, notificationId=${notification.id}`,
    );
    return { notificationId: notification.id, status: notification.status };
  }

  async sendPush(dto: SendPushDto) {
    const notification = await this.createNotification(
      NotificationChannel.PUSH,
      dto.userId,
    );

    await this.queue.add(
      QUEUE_JOBS.SEND_PUSH,
      {
        notificationId: notification.id,
        token: dto.token,
        topic: dto.topic,
        title: dto.title,
        body: dto.body,
        data: dto.data,
      },
      JOB_OPTIONS,
    );

    this.logger.log(`Push job queued, notificationId=${notification.id}`);
    return { notificationId: notification.id, status: notification.status };
  }

  async sendBulk(dto: BulkSendDto) {
    const bulkId = randomUUID();
    const jobs: Promise<void>[] = [];

    for (const userId of dto.userIds) {
      const notification = await this.createNotification(
        dto.channel,
        userId,
        bulkId,
      );

      if (dto.channel === NotificationChannel.EMAIL) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (user?.email) {
          jobs.push(
            this.queue
              .add(
                QUEUE_JOBS.SEND_EMAIL,
                {
                  notificationId: notification.id,
                  to: user.email,
                  subject: dto.subject ?? 'Notification',
                  html: dto.message,
                },
                JOB_OPTIONS,
              )
              .then(),
          );
        }
      } else if (dto.channel === NotificationChannel.SMS) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (user?.phone) {
          jobs.push(
            this.queue
              .add(
                QUEUE_JOBS.SEND_SMS,
                {
                  notificationId: notification.id,
                  to: user.phone,
                  body: dto.message,
                },
                JOB_OPTIONS,
              )
              .then(),
          );
        }
      } else if (dto.channel === NotificationChannel.PUSH) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (user?.fcmToken) {
          jobs.push(
            this.queue
              .add(
                QUEUE_JOBS.SEND_PUSH,
                {
                  notificationId: notification.id,
                  token: user.fcmToken,
                  title: dto.subject ?? 'Notification',
                  body: dto.message,
                  data: dto.data,
                },
                JOB_OPTIONS,
              )
              .then(),
          );
        }
      }
    }

    await Promise.all(jobs);
    this.logger.log(
      `Bulk job created: bulkId=${bulkId}, count=${dto.userIds.length}`,
    );
    return { bulkId, queued: dto.userIds.length };
  }

  async getBulkStatus(bulkId: string) {
    const notifications = await this.notificationRepo.find({
      where: { bulkId },
    });
    if (!notifications.length)
      throw new NotFoundException(`Bulk ${bulkId} not found`);

    const counts = notifications.reduce((acc, n) => {
      acc[n.status] = (acc[n.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      bulkId,
      total: notifications.length,
      sent: counts[NotificationStatus.SENT] ?? 0,
      delivered: counts[NotificationStatus.DELIVERED] ?? 0,
      failed: counts[NotificationStatus.FAILED] ?? 0,
      pending: counts[NotificationStatus.PENDING] ?? 0,
    };
  }

  async findById(id: string) {
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification)
      throw new NotFoundException(`Notification ${id} not found`);
    return notification;
  }

  async findByUser(userId: string) {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  private async createNotification(
    channel: NotificationChannel,
    userId?: string,
    bulkId?: string,
  ): Promise<Notification> {
    const notification = this.notificationRepo.create({
      channel,
      status: NotificationStatus.PENDING,
      userId: userId ?? null,
      bulkId: bulkId ?? null,
    });
    return this.notificationRepo.save(notification);
  }
}
