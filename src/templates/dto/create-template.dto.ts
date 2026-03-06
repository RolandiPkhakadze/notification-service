import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationChannel } from '../../database/entities/notification.entity';

export class CreateTemplateDto {
  @ApiProperty({ example: 'welcome_email' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiPropertyOptional({ example: 'Welcome to our platform' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Hello {{name}}, welcome!' })
  @IsString()
  @IsNotEmpty()
  body: string;
}
