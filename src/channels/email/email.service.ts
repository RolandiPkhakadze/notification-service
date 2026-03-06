import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

export interface SendEmailDto {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
  attachments?: Array<{ content: string; filename: string; type?: string }>;
}

export interface EmailResult {
  providerMessageId: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    sgMail.setApiKey(this.config.getOrThrow<string>('SENDGRID_API_KEY'));
  }

  async send(dto: SendEmailDto): Promise<EmailResult> {
    const from = this.config.getOrThrow<string>('SENDGRID_FROM_EMAIL');

    const msg: sgMail.MailDataRequired = {
      to: dto.to,
      from,
      subject: dto.subject,
      ...(dto.text && { text: dto.text }),
      ...(dto.html && { html: dto.html }),
      ...(dto.templateId && { templateId: dto.templateId }),
      ...(dto.dynamicTemplateData && {
        dynamicTemplateData: dto.dynamicTemplateData,
      }),
      ...(dto.attachments && { attachments: dto.attachments }),
    };

    const [response] = await sgMail.send(msg);
    const messageId = (response.headers['x-message-id'] as string) ?? 'unknown';

    this.logger.log(`Email sent to ${dto.to}, messageId=${messageId}`);
    return { providerMessageId: messageId };
  }
}
