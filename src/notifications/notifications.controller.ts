import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BulkSendDto } from './dto/bulk-send.dto';
import { SendEmailTemplateDto } from './dto/send-email-template.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { SendPushDto } from './dto/send-push.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('email')
  @ApiOperation({ summary: 'Send a single email' })
  sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationsService.sendEmail(dto);
  }

  @Post('email/template')
  @ApiOperation({ summary: 'Send an email using a saved template' })
  sendEmailWithTemplate(@Body() dto: SendEmailTemplateDto) {
    return this.notificationsService.sendEmailWithTemplate(dto);
  }

  @Post('sms')
  @ApiOperation({ summary: 'Send a single SMS' })
  sendSms(@Body() dto: SendSmsDto) {
    return this.notificationsService.sendSms(dto);
  }

  @Post('push')
  @ApiOperation({ summary: 'Send a push notification' })
  sendPush(@Body() dto: SendPushDto) {
    return this.notificationsService.sendPush(dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Send notifications to multiple users' })
  sendBulk(@Body() dto: BulkSendDto) {
    return this.notificationsService.sendBulk(dto);
  }

  @Get('bulk/:bulkId/status')
  @ApiOperation({ summary: 'Get bulk send status' })
  getBulkStatus(@Param('bulkId', ParseUUIDPipe) bulkId: string) {
    return this.notificationsService.getBulkStatus(bulkId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: "Get user's notification history" })
  findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.notificationsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification status by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.findById(id);
  }
}
