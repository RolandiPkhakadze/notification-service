import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('sendgrid')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle SendGrid delivery event webhooks' })
  async handleSendGrid(
    @Req() req: RawBodyRequest<Request>,
    @Body() events: Record<string, unknown>[],
    @Headers('x-twilio-email-event-webhook-signature') signature: string,
    @Headers('x-twilio-email-event-webhook-timestamp') timestamp: string,
  ) {
    if (req.rawBody && signature && timestamp) {
      this.webhooksService.verifySignature(req.rawBody, signature, timestamp);
    }

    await this.webhooksService.handleSendGridEvents(events as any);
    return { received: true };
  }
}
