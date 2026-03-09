import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface SendPushDto {
  token?: string;
  topic?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushResult {
  providerMessageId: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private app: admin.app.App;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');
    if (!privateKey || privateKey.includes('replace_me')) {
      this.logger.warn('Firebase credentials not configured — push notifications disabled');
      return;
    }

    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.getOrThrow('FIREBASE_PROJECT_ID'),
          clientEmail: this.config.getOrThrow('FIREBASE_CLIENT_EMAIL'),
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      this.app = admin.app();
    }
  }

  async sendToDevice(dto: SendPushDto & { token: string }): Promise<PushResult> {
    if (!this.app) throw new Error('Firebase not configured');
    const messageId = await this.app.messaging().send({
      token: dto.token,
      notification: { title: dto.title, body: dto.body },
      data: dto.data,
    });

    this.logger.log(`Push sent to token, messageId=${messageId}`);
    return { providerMessageId: messageId };
  }

  isConfigured(): boolean {
    return !!this.app;
  }

  getProjectId(): string | null {
    return this.config.get<string>('FIREBASE_PROJECT_ID') ?? null;
  }

  async sendDryRun(topic: string): Promise<string> {
    if (!this.app) throw new Error('Firebase not configured');
    return this.app.messaging().send(
      { topic, notification: { title: 'dry-run', body: 'dry-run' } },
      true, // dryRun — validates the message without actually sending
    );
  }

  async sendToTopic(dto: SendPushDto & { topic: string }): Promise<PushResult> {
    if (!this.app) throw new Error('Firebase not configured');
    const messageId = await this.app.messaging().send({
      topic: dto.topic,
      notification: { title: dto.title, body: dto.body },
      data: dto.data,
    });

    this.logger.log(`Push sent to topic=${dto.topic}, messageId=${messageId}`);
    return { providerMessageId: messageId };
  }
}
