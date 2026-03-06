import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface SendSmsDto {
  to: string;
  body: string;
}

export interface SmsResult {
  providerMessageId: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: Twilio;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.client = new Twilio(
      this.config.getOrThrow('TWILIO_ACCOUNT_SID'),
      this.config.getOrThrow('TWILIO_AUTH_TOKEN'),
    );
    this.from = this.config.getOrThrow('TWILIO_PHONE_NUMBER');
  }

  async send(dto: SendSmsDto): Promise<SmsResult> {
    const message = await this.client.messages.create({
      to: dto.to,
      from: this.from,
      body: dto.body,
    });

    this.logger.log(`SMS sent to ${dto.to}, sid=${message.sid}`);
    return { providerMessageId: message.sid };
  }
}
